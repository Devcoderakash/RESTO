import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  APPROVED_PRIMARY_PROJECT_REF,
  UNAPPROVED_PRODUCTION_REFS,
  validateDatabaseTarget,
  validateRollbackAuthorization,
  resolveStagingDatabaseUrls,
} from '../src/utils/databaseTargetValidator.js';

describe('RESTO V2 — Phase 4B.4 Primary Target Authorization & Safety Gate Suite', () => {
  const origEnv = process.env;
  const PRIMARY_POOLER_CONN =
    'postgresql://postgres.zmpthsiiouukjjyrbpnz:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';
  const PRIMARY_DIRECT_CONN =
    'postgresql://postgres:secret@db.zmpthsiiouukjjyrbpnz.supabase.co:5432/postgres?sslmode=require';
  const UNAPPROVED_PROD_CONN =
    'postgresql://postgres.krsdjcxgfnlsstjwuqlj:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.ALLOW_RESTO_V2_PRIMARY_TARGET;
    delete process.env.RESTO_V2_PRIMARY_PROJECT_REF;
    delete process.env.EXPECTED_STAGING_PROJECT_REF;
    delete process.env.CONFIRM_STAGING_ROLLBACK;
    delete process.env.CONFIRM_STAGING_ROLLBACK_PROJECT_REF;
  });

  afterEach(() => {
    process.env = origEnv;
  });

  describe('1. Narrowly Scoped Primary Project Authorization', () => {
    it('approves primary production target when explicitly authorized by all required flags', () => {
      process.env.ALLOW_RESTO_V2_PRIMARY_TARGET = 'true';
      process.env.RESTO_V2_PRIMARY_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;
      process.env.EXPECTED_STAGING_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;

      const result = validateDatabaseTarget({
        connectionString: PRIMARY_POOLER_CONN,
      });

      expect(result.verified).toBe(true);
      expect(result.projectRef).toBe(APPROVED_PRIMARY_PROJECT_REF);
      expect(result.isPrimary).toBe(true);
      expect(result.isLocal).toBe(false);
    });

    it('approves primary direct connection when explicitly authorized', () => {
      const result = validateDatabaseTarget({
        connectionString: PRIMARY_DIRECT_CONN,
        allowPrimaryTarget: true,
        primaryProjectRef: APPROVED_PRIMARY_PROJECT_REF,
        expectedProjectRef: APPROVED_PRIMARY_PROJECT_REF,
      });

      expect(result.verified).toBe(true);
      expect(result.projectRef).toBe(APPROVED_PRIMARY_PROJECT_REF);
      expect(result.isPrimary).toBe(true);
    });

    it('rejects primary project if ALLOW_RESTO_V2_PRIMARY_TARGET is missing or false', () => {
      process.env.RESTO_V2_PRIMARY_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;
      process.env.EXPECTED_STAGING_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;

      expect(() =>
        validateDatabaseTarget({
          connectionString: PRIMARY_POOLER_CONN,
        })
      ).toThrowError(/Primary target access requires explicit ALLOW_RESTO_V2_PRIMARY_TARGET=true/);
    });

    it('rejects primary project if RESTO_V2_PRIMARY_PROJECT_REF does not match exactly', () => {
      process.env.ALLOW_RESTO_V2_PRIMARY_TARGET = 'true';
      process.env.RESTO_V2_PRIMARY_PROJECT_REF = 'wrong-ref';
      process.env.EXPECTED_STAGING_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;

      expect(() =>
        validateDatabaseTarget({
          connectionString: PRIMARY_POOLER_CONN,
        })
      ).toThrowError(/Primary target authorization requires exact RESTO_V2_PRIMARY_PROJECT_REF='zmpthsiiouukjjyrbpnz'/);
    });

    it('rejects primary project if expected project ref mismatches', () => {
      process.env.ALLOW_RESTO_V2_PRIMARY_TARGET = 'true';
      process.env.RESTO_V2_PRIMARY_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;
      process.env.EXPECTED_STAGING_PROJECT_REF = 'other-staging-project';

      expect(() =>
        validateDatabaseTarget({
          connectionString: PRIMARY_POOLER_CONN,
        })
      ).toThrowError(/Mismatched project reference/);
    });
  });

  describe('2. Unrelated Production Project Isolation', () => {
    it('strictly blocks unrelated production projects even with full primary authorization flags enabled', () => {
      process.env.ALLOW_RESTO_V2_PRIMARY_TARGET = 'true';
      process.env.RESTO_V2_PRIMARY_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;
      process.env.EXPECTED_STAGING_PROJECT_REF = 'krsdjcxgfnlsstjwuqlj';

      for (const unapprovedRef of UNAPPROVED_PRODUCTION_REFS) {
        expect(() =>
          validateDatabaseTarget({
            connectionString: `postgresql://postgres.${unapprovedRef}:pass@host:5432/postgres`,
          })
        ).toThrowError(/Target connection references unapproved production project/);
      }
    });

    it('rejects unidentifiable remote host when primary authorization is enabled', () => {
      process.env.ALLOW_RESTO_V2_PRIMARY_TARGET = 'true';
      process.env.RESTO_V2_PRIMARY_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;
      process.env.EXPECTED_STAGING_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;

      expect(() =>
        validateDatabaseTarget({
          connectionString: 'postgresql://user:pass@some-random-cloud.com:5432/postgres',
        })
      ).toThrowError(/Cannot verify project identity from connection string/);
    });
  });

  describe('3. Destructive Rollback Prohibition on Primary Target', () => {
    it('strictly blocks rollback against primary production database even with all authorization flags set', () => {
      process.env.ALLOW_RESTO_V2_PRIMARY_TARGET = 'true';
      process.env.RESTO_V2_PRIMARY_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;
      process.env.EXPECTED_STAGING_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;
      process.env.CONFIRM_STAGING_ROLLBACK = 'true';
      process.env.CONFIRM_STAGING_ROLLBACK_PROJECT_REF = APPROVED_PRIMARY_PROJECT_REF;

      expect(() =>
        validateRollbackAuthorization({
          connectionString: PRIMARY_POOLER_CONN,
        })
      ).toThrowError(/Destructive rollback operations are strictly prohibited against RESTO V2 primary production project 'zmpthsiiouukjjyrbpnz'/);
    });
  });

  describe('4. Environment Mapping Precedence with Primary Authorization', () => {
    it('allows approved primary database URL in staging/production mode when explicitly authorized', () => {
      const res = resolveStagingDatabaseUrls({
        NODE_ENV: 'staging',
        DATABASE_URL: PRIMARY_POOLER_CONN,
        DIRECT_DATABASE_URL: PRIMARY_DIRECT_CONN,
        ALLOW_RESTO_V2_PRIMARY_TARGET: 'true',
        RESTO_V2_PRIMARY_PROJECT_REF: APPROVED_PRIMARY_PROJECT_REF,
      });

      expect(res.databaseUrl).toBe(PRIMARY_POOLER_CONN);
      expect(res.directDatabaseUrl).toBe(PRIMARY_DIRECT_CONN);
    });

    it('blocks approved primary database URL in staging mode if authorization is missing', () => {
      expect(() =>
        resolveStagingDatabaseUrls({
          NODE_ENV: 'staging',
          DATABASE_URL: PRIMARY_POOLER_CONN,
        })
      ).toThrowError(/Database connection references primary project 'zmpthsiiouukjjyrbpnz'/);
    });

    it('unconditionally blocks unapproved production database URL in environment resolution', () => {
      expect(() =>
        resolveStagingDatabaseUrls({
          NODE_ENV: 'staging',
          DATABASE_URL: UNAPPROVED_PROD_CONN,
          ALLOW_RESTO_V2_PRIMARY_TARGET: 'true',
          RESTO_V2_PRIMARY_PROJECT_REF: APPROVED_PRIMARY_PROJECT_REF,
        })
      ).toThrowError(/Database connection references unapproved production project/);
    });
  });
});
