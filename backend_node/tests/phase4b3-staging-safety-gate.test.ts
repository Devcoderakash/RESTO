import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extractProjectRef,
  validateDatabaseTarget,
  validateRollbackAuthorization,
  resolveStagingDatabaseUrls,
  KNOWN_PRODUCTION_REFS,
} from '../src/utils/databaseTargetValidator.js';
import { applyMigrations } from '../src/scripts/apply_v2_migrations.js';
import { runMigration } from '../src/scripts/migrate_v1_to_v2.js';
import { runReconciliation } from '../src/scripts/reconcile_v1_v2.js';

describe('RESTO V2 — Phase 4B.3 Staging Provisioning Safety Gate Suite', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.EXPECTED_STAGING_PROJECT_REF;
    delete process.env.CONFIRM_STAGING_ROLLBACK;
    delete process.env.CONFIRM_STAGING_ROLLBACK_PROJECT_REF;
    delete process.env.ALLOW_LOCAL_TARGET;
  });

  afterEach(() => {
    process.env = origEnv;
  });

  describe('1. Supabase Project Reference Extraction', () => {
    it('extracts project reference from Supavisor pooler connection string', () => {
      const connStr =
        'postgresql://postgres.staging-test-ref-123:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';
      const info = extractProjectRef(connStr);
      expect(info.ref).toBe('staging-test-ref-123');
      expect(info.isLocal).toBe(false);
    });

    it('extracts project reference from direct Supabase connection string', () => {
      const connStr =
        'postgresql://postgres:secret@db.staging-test-ref-456.supabase.co:5432/postgres?sslmode=require';
      const info = extractProjectRef(connStr);
      expect(info.ref).toBe('staging-test-ref-456');
      expect(info.isLocal).toBe(false);
    });

    it('identifies localhost / 127.0.0.1 as local database targets', () => {
      const connStr = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
      const info = extractProjectRef(connStr);
      expect(info.isLocal).toBe(true);
      expect(info.ref).toBe('local-rehearsal');
    });

    it('returns null project reference for unverified remote hosts', () => {
      const connStr = 'postgresql://admin:secret@custom-db.internal-cloud.net:5432/mydb';
      const info = extractProjectRef(connStr);
      expect(info.ref).toBeNull();
      expect(info.isLocal).toBe(false);
    });
  });

  describe('2. Fail-Closed Target Validation', () => {
    const STAGING_CONN =
      'postgresql://postgres.resto-staging-approved:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';

    it('approves matching expected staging project reference', () => {
      const result = validateDatabaseTarget({
        connectionString: STAGING_CONN,
        expectedProjectRef: 'resto-staging-approved',
      });
      expect(result.verified).toBe(true);
      expect(result.projectRef).toBe('resto-staging-approved');
      expect(result.isLocal).toBe(false);
    });

    it('strictly rejects known production project references even if set as expected', () => {
      for (const prodRef of KNOWN_PRODUCTION_REFS) {
        const prodConn = `postgresql://postgres.${prodRef}:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;
        expect(() =>
          validateDatabaseTarget({
            connectionString: prodConn,
            expectedProjectRef: prodRef,
          })
        ).toThrowError(/CRITICAL SAFETY VIOLATION/);
      }
    });

    it('fails when expected project reference is missing', () => {
      expect(() =>
        validateDatabaseTarget({
          connectionString: STAGING_CONN,
        })
      ).toThrowError(/Missing required EXPECTED_STAGING_PROJECT_REF/);
    });

    it('fails when project reference does not match expected staging reference', () => {
      expect(() =>
        validateDatabaseTarget({
          connectionString: STAGING_CONN,
          expectedProjectRef: 'different-staging-ref',
        })
      ).toThrowError(/Mismatched project reference/);
    });

    it('refuses execution if project identity cannot be verified', () => {
      const unverifiedConn = 'postgresql://user:pass@unknown-host.com:5432/db';
      expect(() =>
        validateDatabaseTarget({
          connectionString: unverifiedConn,
          expectedProjectRef: 'resto-staging-approved',
        })
      ).toThrowError(/Cannot verify project identity from connection string/);
    });

    it('refuses local execution when remote staging operation was expected', () => {
      const localConn = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
      expect(() =>
        validateDatabaseTarget({
          connectionString: localConn,
          expectedProjectRef: 'resto-staging-approved',
        })
      ).toThrowError(/Refuse execution because target is local/);
    });

    it('allows local target when explicitly authorized', () => {
      const localConn = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
      const result = validateDatabaseTarget({
        connectionString: localConn,
        expectedProjectRef: 'local-rehearsal',
      });
      expect(result.verified).toBe(true);
      expect(result.isLocal).toBe(true);
    });
  });

  describe('3. Rollback Protection and Multi-Factor Authorization', () => {
    const STAGING_CONN =
      'postgresql://postgres.resto-staging-approved:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';

    it('blocks remote rollback when CONFIRM_STAGING_ROLLBACK is missing or false', () => {
      expect(() =>
        validateRollbackAuthorization({
          connectionString: STAGING_CONN,
          expectedProjectRef: 'resto-staging-approved',
          confirmStagingRollback: false,
          confirmProjectRef: 'resto-staging-approved',
        })
      ).toThrowError(/CONFIRM_STAGING_ROLLBACK=true/);
    });

    it('blocks remote rollback when secondary project confirmation is missing', () => {
      expect(() =>
        validateRollbackAuthorization({
          connectionString: STAGING_CONN,
          expectedProjectRef: 'resto-staging-approved',
          confirmStagingRollback: true,
        })
      ).toThrowError(/secondary target-specific confirmation CONFIRM_STAGING_ROLLBACK_PROJECT_REF/);
    });

    it('blocks remote rollback when secondary confirmation does not match target project', () => {
      expect(() =>
        validateRollbackAuthorization({
          connectionString: STAGING_CONN,
          expectedProjectRef: 'resto-staging-approved',
          confirmStagingRollback: true,
          confirmProjectRef: 'wrong-project-ref',
        })
      ).toThrowError(/Secondary confirmation mismatch/);
    });

    it('authorizes remote rollback when both confirmations match target', () => {
      expect(() =>
        validateRollbackAuthorization({
          connectionString: STAGING_CONN,
          expectedProjectRef: 'resto-staging-approved',
          confirmStagingRollback: true,
          confirmProjectRef: 'resto-staging-approved',
        })
      ).not.toThrow();
    });
  });

  describe('4. Environment Mapping Precedence & Contamination Guard', () => {
    it('prioritizes STAGING_DATABASE_URL over DATABASE_URL in staging mode', () => {
      const res = resolveStagingDatabaseUrls({
        NODE_ENV: 'staging',
        DATABASE_URL: 'postgresql://postgres.db1:pass@host1:5432/postgres',
        STAGING_DATABASE_URL: 'postgresql://postgres.staging-pref:pass@host2:5432/postgres',
      });
      expect(res.databaseUrl).toBe('postgresql://postgres.staging-pref:pass@host2:5432/postgres');
    });

    it('prioritizes STAGING_DIRECT_DATABASE_URL over DIRECT_DATABASE_URL in staging mode', () => {
      const res = resolveStagingDatabaseUrls({
        NODE_ENV: 'staging',
        DATABASE_URL: 'postgresql://postgres.staging-pref:pass@host2:5432/postgres',
        DIRECT_DATABASE_URL: 'postgresql://postgres:pass@host-direct1:5432/postgres',
        STAGING_DIRECT_DATABASE_URL: 'postgresql://postgres:pass@host-staging-direct:5432/postgres',
      });
      expect(res.directDatabaseUrl).toBe('postgresql://postgres:pass@host-staging-direct:5432/postgres');
    });

    it('refuses startup if production database is configured in staging mode', () => {
      expect(() =>
        resolveStagingDatabaseUrls({
          NODE_ENV: 'staging',
          DATABASE_URL: 'postgresql://postgres.zmpthsiiouukjjyrbpnz:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
        })
      ).toThrowError(/CRITICAL SAFETY VIOLATION/);
    });

    it('prohibits silent fallback to localhost if database URL is missing in staging', () => {
      expect(() =>
        resolveStagingDatabaseUrls({
          NODE_ENV: 'staging',
        })
      ).toThrowError(/Silent fallback is prohibited/);
    });
  });

  describe('5. End-to-End Migration & Rollback Lifecycle in Isolated Test Database', () => {
    const localConn = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';

    it('executes rollback and re-apply cycle with verified safety guards', async () => {
      // 1. Explicitly authorized local rollback
      const rollbackResult = await applyMigrations({
        connectionString: localConn,
        rollback: true,
        expectedProjectRef: 'local-rehearsal',
        confirmStagingRollback: true,
        confirmProjectRef: 'local-rehearsal',
        allowLocal: true,
      });

      expect(rollbackResult.steps[0].success).toBe(true);
      expect(rollbackResult.verification.tablesCount).toBe(0);

      // 2. Re-apply all migrations (001-004)
      const applyResult = await applyMigrations({
        connectionString: localConn,
        rollback: false,
        expectedProjectRef: 'local-rehearsal',
        allowLocal: true,
      });

      expect(applyResult.verification.tablesCount).toBe(11);
      expect(applyResult.verification.rlsCount).toBe(11);
      expect(applyResult.verification.triggerExists).toBe(true);

      // 3. Restore clean baseline data using migrate:data
      const dataResult = await runMigration({
        connectionString: localConn,
        backupFilePath: 'backend/supabase/backup_v1_production_data.json',
        reset: true,
        expectedProjectRef: 'local-rehearsal',
        allowLocal: true,
      });

      expect(dataResult.monetary.v2OrdersFinalTotal).toBe(1134);
      expect(dataResult.monetary.v2PaymentsAmount).toBe(1134);

      // 4. Reconcile
      const reconcileReport = await runReconciliation({
        connectionString: localConn,
        backupFilePath: 'backend/supabase/backup_v1_production_data.json',
        storageBackupDir: 'backend/supabase/storage_backup/menu-items',
        expectedProjectRef: 'local-rehearsal',
        allowLocal: true,
      });

      expect(reconcileReport.monetary.reconciled).toBe(true);
      expect(reconcileReport.foreignKeys.checksFailed).toBe(0);
      expect(reconcileReport.monetary.differences).toEqual([]);
    });
  });
});
