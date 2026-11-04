import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import {
  validateDatabaseTarget,
  validateRollbackAuthorization,
} from '../utils/databaseTargetValidator.js';

dotenv.config();

const { Pool } = pg;

export interface MigrationStepResult {
  file: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface ApplyMigrationsOptions {
  connectionString: string;
  rollback?: boolean;
  verifyOnly?: boolean;
  expectedProjectRef?: string;
  confirmStagingRollback?: string | boolean;
  confirmProjectRef?: string;
  allowLocal?: boolean;
  allowPrimaryTarget?: boolean | string;
  primaryProjectRef?: string;
  applyPatches?: boolean;
}

export interface MigrationVerificationResult {
  tablesCount: number;
  tables: string[];
  rlsCount: number;
  forceRlsCount: number;
  foreignKeysCount: number;
  customIndexesCount: number;
  policiesCount: number;
  triggerExists: boolean;
  functionSearchPath: string | null;
  publicTablesCount: number;
}

export async function applyMigrations(options: ApplyMigrationsOptions): Promise<{
  steps: MigrationStepResult[];
  verification: MigrationVerificationResult;
}> {
  // 1. Enforce Fail-Closed Target & Rollback Security Validation
  if (options.rollback) {
    validateRollbackAuthorization({
      connectionString: options.connectionString,
      expectedProjectRef: options.expectedProjectRef,
      confirmStagingRollback: options.confirmStagingRollback,
      confirmProjectRef: options.confirmProjectRef,
      allowLocal: options.allowLocal,
    });
  } else {
    validateDatabaseTarget({
      connectionString: options.connectionString,
      expectedProjectRef: options.expectedProjectRef,
      allowLocal: options.allowLocal,
      allowPrimaryTarget: options.allowPrimaryTarget,
      primaryProjectRef: options.primaryProjectRef,
      operationName: options.verifyOnly ? 'Migration verification' : 'Migration apply',
    });
  }

  const isLocal =
    options.connectionString.includes('localhost') ||
    options.connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: options.connectionString.split('?')[0],
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const migrationFiles = [
    '001_create_resto_v2_schema.sql',
    '002_create_tables.sql',
    '003_create_indexes.sql',
    '004_create_rls_and_security.sql',
  ];

  const steps: MigrationStepResult[] = [];

  try {
    if (options.rollback) {
      console.log('🔄 Executing migration rollback for schema resto_v2...');
      const start = Date.now();
      await client.query('DROP SCHEMA IF EXISTS resto_v2 CASCADE;');
      steps.push({
        file: 'ROLLBACK (DROP SCHEMA resto_v2 CASCADE)',
        success: true,
        durationMs: Date.now() - start,
      });
      return {
        steps,
        verification: {
          tablesCount: 0,
          tables: [],
          rlsCount: 0,
          forceRlsCount: 0,
          foreignKeysCount: 0,
          customIndexesCount: 0,
          policiesCount: 0,
          triggerExists: false,
          functionSearchPath: null,
          publicTablesCount: 0,
        },
      };
    }

    if (!options.verifyOnly) {
      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Migration file not found: ${filePath}`);
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`⏳ Applying ${file}...`);
        const start = Date.now();

        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');

          steps.push({
            file,
            success: true,
            durationMs: Date.now() - start,
          });
          console.log(`✅ Applied ${file} in ${Date.now() - start}ms`);
        } catch (err: any) {
          await client.query('ROLLBACK');
          steps.push({
            file,
            success: false,
            durationMs: Date.now() - start,
            error: err.message,
          });
          throw new Error(`Failed to apply migration ${file}: ${err.message}`);
        }
      }

      // Apply reviewed hardening patches if enabled
      if (options.applyPatches !== false) {
        const patchFiles = ['patches/004_hardening_notify_realtime_event.sql'];
        for (const patchFile of patchFiles) {
          const patchPath = path.join(migrationsDir, patchFile);
          if (fs.existsSync(patchPath)) {
            const patchSql = fs.readFileSync(patchPath, 'utf8');
            console.log(`⏳ Applying hardening patch: ${patchFile}...`);
            const start = Date.now();
            try {
              await client.query('BEGIN');
              await client.query(patchSql);
              await client.query('COMMIT');
              steps.push({
                file: patchFile,
                success: true,
                durationMs: Date.now() - start,
              });
              console.log(`✅ Applied ${patchFile} in ${Date.now() - start}ms`);
            } catch (err: any) {
              await client.query('ROLLBACK');
              steps.push({
                file: patchFile,
                success: false,
                durationMs: Date.now() - start,
                error: err.message,
              });
              throw new Error(`Failed to apply patch ${patchFile}: ${err.message}`);
            }
          }
        }
      }
    }

    // Schema Verification
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'resto_v2' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);

    const rlsRes = await client.query(`
      SELECT relname 
      FROM pg_class 
      WHERE relnamespace = 'resto_v2'::regnamespace AND relkind = 'r' AND relrowsecurity = true;
    `);

    const forceRlsRes = await client.query(`
      SELECT relname 
      FROM pg_class 
      WHERE relnamespace = 'resto_v2'::regnamespace AND relkind = 'r' AND relforcerowsecurity = true;
    `);

    const fksRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE contype = 'f' AND connamespace = 'resto_v2'::regnamespace;
    `);

    const customIdxRes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'resto_v2' AND indexname LIKE 'idx_v2_%';
    `);

    const policiesRes = await client.query(`
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'resto_v2';
    `);

    const triggerRes = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'resto_v2' 
        AND event_object_table = 'realtime_events' 
        AND trigger_name = 'trg_notify_realtime_event';
    `);

    const procRes = await client.query(`
      SELECT proname, proconfig 
      FROM pg_proc 
      WHERE pronamespace = 'resto_v2'::regnamespace AND proname = 'notify_realtime_event';
    `);

    const publicTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    return {
      steps,
      verification: {
        tablesCount: tables.length,
        tables,
        rlsCount: rlsRes.rows.length,
        forceRlsCount: forceRlsRes.rows.length,
        foreignKeysCount: fksRes.rows.length,
        customIndexesCount: customIdxRes.rows.length,
        policiesCount: policiesRes.rows.length,
        triggerExists: triggerRes.rows.length > 0,
        functionSearchPath: procRes.rows[0]?.proconfig?.[0] || null,
        publicTablesCount: publicTablesRes.rows.length,
      },
    };
  } finally {
    client.release();
    await pool.end();
  }
}

// Direct CLI Execution
if (process.argv[1]?.includes('apply_v2_migrations')) {
  const args = process.argv.slice(2);
  const connStr =
    process.env.STAGING_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';

  const isRollback = args.includes('--rollback');
  const isVerify = args.includes('--verify-only');
  const allowLocal = args.includes('--allow-local') || process.env.ALLOW_LOCAL_TARGET === 'true';

  let expectedRef = process.env.EXPECTED_STAGING_PROJECT_REF;
  const refArg = args.find((a) => a.startsWith('--expected-project-ref='));
  if (refArg) {
    expectedRef = refArg.split('=')[1];
  } else if (!expectedRef && (connStr.includes('localhost') || connStr.includes('127.0.0.1'))) {
    expectedRef = 'local-rehearsal';
  }

  let confirmRollbackRef = process.env.CONFIRM_STAGING_ROLLBACK_PROJECT_REF;
  const rollbackRefArg = args.find((a) => a.startsWith('--confirm-rollback-ref='));
  if (rollbackRefArg) {
    confirmRollbackRef = rollbackRefArg.split('=')[1];
  }

  const allowPrimary =
    args.includes('--allow-primary-target') ||
    process.env.ALLOW_RESTO_V2_PRIMARY_TARGET === 'true';
  let primaryRef = process.env.RESTO_V2_PRIMARY_PROJECT_REF;
  const primaryRefArg = args.find((a) => a.startsWith('--primary-project-ref='));
  if (primaryRefArg) {
    primaryRef = primaryRefArg.split('=')[1];
  }

  console.log(`🚀 Starting V2 Migration Runner...`);
  console.log(`Target: ${connStr.replace(/:[^:]*@/, ':****@')}`);
  console.log(`Expected Project Ref: ${expectedRef || '[NONE]'}`);
  console.log(`Primary Target Opt-In: ${allowPrimary ? 'YES' : 'NO'}`);

  applyMigrations({
    connectionString: connStr,
    rollback: isRollback,
    verifyOnly: isVerify,
    expectedProjectRef: expectedRef,
    confirmStagingRollback: process.env.CONFIRM_STAGING_ROLLBACK,
    confirmProjectRef: confirmRollbackRef,
    allowLocal,
    allowPrimaryTarget: allowPrimary,
    primaryProjectRef: primaryRef,
  })
    .then((result) => {
      console.log('\n📊 Migration Execution Summary:');
      console.table(result.steps);
      console.log('\n🔍 Schema Verification:');
      console.log(`- Tables in resto_v2: ${result.verification.tablesCount} (Expected: 11)`);
      console.log(`- Tables with RLS enabled: ${result.verification.rlsCount} (Expected: 11)`);
      console.log(`- Tables with RLS forced: ${result.verification.forceRlsCount} (Expected: 11)`);
      console.log(`- Foreign Keys in resto_v2: ${result.verification.foreignKeysCount} (Expected: 16)`);
      console.log(`- Custom Indexes in resto_v2: ${result.verification.customIndexesCount} (Expected: 20)`);
      console.log(`- RLS Policies in resto_v2: ${result.verification.policiesCount} (Expected: 20)`);
      console.log(`- Realtime Trigger Active: ${result.verification.triggerExists ? 'YES' : 'NO'}`);
      console.log(`- Realtime Function search_path: ${result.verification.functionSearchPath || '[NONE]'}`);
      console.log(`- Public Schema Tables Count: ${result.verification.publicTablesCount} (Expected: 0)`);
      console.log(`- Tables list: ${result.verification.tables.join(', ')}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Migration failed:', err.message);
      process.exit(1);
    });
}
