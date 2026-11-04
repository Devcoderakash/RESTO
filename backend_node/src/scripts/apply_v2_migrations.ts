import fs from 'fs';
import path from 'path';
import pg from 'pg';
import {
  validateDatabaseTarget,
  validateRollbackAuthorization,
} from '../utils/databaseTargetValidator.js';

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
}

export async function applyMigrations(options: ApplyMigrationsOptions): Promise<{
  steps: MigrationStepResult[];
  verification: {
    tablesCount: number;
    tables: string[];
    rlsCount: number;
    triggerExists: boolean;
  };
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
      operationName: options.verifyOnly ? 'Migration verification' : 'Migration apply',
    });
  }

  const pool = new Pool({ connectionString: options.connectionString });
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
        verification: { tablesCount: 0, tables: [], rlsCount: 0, triggerExists: false },
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
    }

    // Schema Verification
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'resto_v2' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);

    const rlsRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'resto_v2' AND rowsecurity = true;
    `);

    const triggerRes = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'resto_v2' 
        AND event_object_table = 'realtime_events' 
        AND trigger_name = 'trg_notify_realtime_event';
    `);

    return {
      steps,
      verification: {
        tablesCount: tables.length,
        tables,
        rlsCount: rlsRes.rows.length,
        triggerExists: triggerRes.rows.length > 0,
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

  console.log(`🚀 Starting V2 Migration Runner...`);
  console.log(`Target: ${connStr.replace(/:[^:]*@/, ':****@')}`);
  console.log(`Expected Project Ref: ${expectedRef || '[NONE]'}`);

  applyMigrations({
    connectionString: connStr,
    rollback: isRollback,
    verifyOnly: isVerify,
    expectedProjectRef: expectedRef,
    confirmStagingRollback: process.env.CONFIRM_STAGING_ROLLBACK,
    confirmProjectRef: confirmRollbackRef,
    allowLocal,
  })
    .then((result) => {
      console.log('\n📊 Migration Execution Summary:');
      console.table(result.steps);
      console.log('\n🔍 Schema Verification:');
      console.log(`- Tables in resto_v2: ${result.verification.tablesCount} (Expected: 11)`);
      console.log(`- Tables with RLS enabled: ${result.verification.rlsCount} (Expected: 11)`);
      console.log(`- Realtime Trigger Active: ${result.verification.triggerExists ? 'YES' : 'NO'}`);
      console.log(`- Tables list: ${result.verification.tables.join(', ')}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Migration failed:', err.message);
      process.exit(1);
    });
}
