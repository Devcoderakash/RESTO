import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { validateDatabaseTarget } from '../utils/databaseTargetValidator.js';

const { Pool } = pg;

export async function runReconciliation(options: {
  connectionString: string;
  backupFilePath: string;
  storageBackupDir: string;
  schema?: string;
  expectedProjectRef?: string;
  allowLocal?: boolean;
}) {
  // Fail-closed target validation
  validateDatabaseTarget({
    connectionString: options.connectionString,
    expectedProjectRef: options.expectedProjectRef,
    allowLocal: options.allowLocal,
    operationName: 'Data & Financial Reconciliation',
  });

  const schema = options.schema || 'resto_v2';
  const pool = new Pool({ connectionString: options.connectionString });
  const client = await pool.connect();

  let backupFilePath = options.backupFilePath;
  if (!fs.existsSync(backupFilePath)) {
    const parentPath = path.resolve(process.cwd(), '..', backupFilePath);
    if (fs.existsSync(parentPath)) {
      backupFilePath = parentPath;
    } else {
      throw new Error(`Backup file not found at: ${options.backupFilePath}`);
    }
  }

  let storageDir = options.storageBackupDir;
  if (!fs.existsSync(storageDir)) {
    const parentStorageDir = path.resolve(process.cwd(), '..', storageDir);
    if (fs.existsSync(parentStorageDir)) {
      storageDir = parentStorageDir;
    }
  }

  const v1Data = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

  const report: any = {
    timestamp: new Date().toISOString(),
    database: (client as any).connectionParameters?.database || 'resto_v2_rehearsal',
    tables: {},
    foreignKeys: {
      checksPassed: 0,
      checksFailed: 0,
      details: [],
    },
    monetary: {
      v1: {},
      v2: {},
      reconciled: true,
      differences: [],
    },
    storage: {
      filesInspected: 0,
      allVerified: true,
      files: [],
    },
  };

  try {
    // 1. Table Counts & Missing ID Verification
    const tableNames = [
      'restaurants',
      'restaurant_tables',
      'categories',
      'menu_items',
      'staff',
      'orders',
      'order_items',
      'payments',
      'service_requests',
      'realtime_events',
    ];

    for (const tbl of tableNames) {
      const v1Rows = v1Data[tbl] || [];
      const v2Res = await client.query(`SELECT * FROM ${schema}.${tbl};`);
      const v2Rows = v2Res.rows;

      const v1Ids = new Set<string>(v1Rows.map((r: any) => String(r.id)));
      const v2Ids = new Set<string>(v2Rows.map((r: any) => String(r.id)));

      const missingInV2 = [...v1Ids].filter((id: string) => !v2Ids.has(id));
      const extraInV2 = [...v2Ids].filter((id: string) => !v1Ids.has(id));

      report.tables[tbl] = {
        v1Count: v1Rows.length,
        v2Count: v2Rows.length,
        match: v1Rows.length === v2Rows.length && missingInV2.length === 0,
        missingIds: missingInV2,
        extraIds: extraInV2,
      };
    }

    // 2. Foreign Key Integrity Checks in Database
    // A. Tables -> Restaurants
    const orphanedTables = await client.query(
      `SELECT id FROM ${schema}.restaurant_tables WHERE restaurant_id NOT IN (SELECT id FROM ${schema}.restaurants);`
    );
    if (orphanedTables.rows.length === 0) {
      report.foreignKeys.checksPassed++;
      report.foreignKeys.details.push('restaurant_tables -> restaurants: 0 orphaned');
    } else {
      report.foreignKeys.checksFailed++;
      report.foreignKeys.details.push(`restaurant_tables -> restaurants: ${orphanedTables.rows.length} orphaned!`);
    }

    // B. Categories -> Restaurants
    const orphanedCats = await client.query(
      `SELECT id FROM ${schema}.categories WHERE restaurant_id NOT IN (SELECT id FROM ${schema}.restaurants);`
    );
    if (orphanedCats.rows.length === 0) {
      report.foreignKeys.checksPassed++;
      report.foreignKeys.details.push('categories -> restaurants: 0 orphaned');
    } else {
      report.foreignKeys.checksFailed++;
      report.foreignKeys.details.push(`categories -> restaurants: ${orphanedCats.rows.length} orphaned!`);
    }

    // C. Menu Items -> Categories & Restaurants
    const orphanedItems = await client.query(
      `SELECT id FROM ${schema}.menu_items 
       WHERE (category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM ${schema}.categories))
          OR restaurant_id NOT IN (SELECT id FROM ${schema}.restaurants);`
    );
    if (orphanedItems.rows.length === 0) {
      report.foreignKeys.checksPassed++;
      report.foreignKeys.details.push('menu_items -> categories & restaurants: 0 orphaned');
    } else {
      report.foreignKeys.checksFailed++;
      report.foreignKeys.details.push(`menu_items -> categories: ${orphanedItems.rows.length} orphaned!`);
    }

    // D. Order Items -> Orders & Menu Items
    const orphanedOrderItems = await client.query(
      `SELECT id FROM ${schema}.order_items 
       WHERE order_id NOT IN (SELECT id FROM ${schema}.orders)
          OR menu_item_id NOT IN (SELECT id FROM ${schema}.menu_items);`
    );
    if (orphanedOrderItems.rows.length === 0) {
      report.foreignKeys.checksPassed++;
      report.foreignKeys.details.push('order_items -> orders & menu_items: 0 orphaned');
    } else {
      report.foreignKeys.checksFailed++;
      report.foreignKeys.details.push(`order_items -> orders/items: ${orphanedOrderItems.rows.length} orphaned!`);
    }

    // E. Payments -> Orders & Restaurants
    const orphanedPayments = await client.query(
      `SELECT id FROM ${schema}.payments 
       WHERE order_id NOT IN (SELECT id FROM ${schema}.orders)
          OR restaurant_id NOT IN (SELECT id FROM ${schema}.restaurants);`
    );
    if (orphanedPayments.rows.length === 0) {
      report.foreignKeys.checksPassed++;
      report.foreignKeys.details.push('payments -> orders & restaurants: 0 orphaned');
    } else {
      report.foreignKeys.checksFailed++;
      report.foreignKeys.details.push(`payments -> orders: ${orphanedPayments.rows.length} orphaned!`);
    }

    // 3. Monetary Reconciliation
    const v1Orders = v1Data.orders || [];
    const v1Subtotal = v1Orders.reduce((sum: number, o: any) => sum + Number(o.subtotal || 0), 0);
    const v1Cgst = v1Orders.reduce((sum: number, o: any) => sum + Number(o.cgst || 0), 0);
    const v1Sgst = v1Orders.reduce((sum: number, o: any) => sum + Number(o.sgst || 0), 0);
    const v1GstTotal = v1Orders.reduce((sum: number, o: any) => sum + Number(o.gst_total || o.tax || 0), 0);
    const v1FinalTotal = v1Orders.reduce((sum: number, o: any) => sum + Number(o.final_total || o.total || 0), 0);

    const v1Payments = v1Data.payments || [];
    const v1PaymentsTotal = v1Payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    const v2OrdersRes = await client.query(`
      SELECT 
        SUM(subtotal) AS subtotal,
        SUM(cgst) AS cgst,
        SUM(sgst) AS sgst,
        SUM(gst_total) AS gst_total,
        SUM(final_total) AS final_total
      FROM ${schema}.orders;
    `);
    const v2O = v2OrdersRes.rows[0];

    const v2PayRes = await client.query(`SELECT SUM(amount) AS total_payments FROM ${schema}.payments;`);
    const v2P = v2PayRes.rows[0];

    report.monetary.v1 = {
      ordersSubtotal: v1Subtotal,
      ordersCgst: v1Cgst,
      ordersSgst: v1Sgst,
      ordersGstTotal: v1GstTotal,
      ordersFinalTotal: v1FinalTotal,
      paymentsTotal: v1PaymentsTotal,
    };

    report.monetary.v2 = {
      ordersSubtotal: Number(v2O.subtotal || 0),
      ordersCgst: Number(v2O.cgst || 0),
      ordersSgst: Number(v2O.sgst || 0),
      ordersGstTotal: Number(v2O.gst_total || 0),
      ordersFinalTotal: Number(v2O.final_total || 0),
      paymentsTotal: Number(v2P.total_payments || 0),
    };

    if (report.monetary.v1.ordersFinalTotal !== report.monetary.v2.ordersFinalTotal) {
      report.monetary.reconciled = false;
      report.monetary.differences.push(
        `Final Total Mismatch: V1=${report.monetary.v1.ordersFinalTotal} vs V2=${report.monetary.v2.ordersFinalTotal}`
      );
    }
    if (report.monetary.v1.paymentsTotal !== report.monetary.v2.paymentsTotal) {
      report.monetary.reconciled = false;
      report.monetary.differences.push(
        `Payment Total Mismatch: V1=${report.monetary.v1.paymentsTotal} vs V2=${report.monetary.v2.paymentsTotal}`
      );
    }

    // 4. Storage Assets Reconciliation
    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir).filter((f) => !f.startsWith('.'));
      report.storage.filesInspected = files.length;
      for (const f of files) {
        const fullPath = path.join(storageDir, f);
        const buf = fs.readFileSync(fullPath);
        const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
        report.storage.files.push({
          filename: f,
          sizeBytes: buf.length,
          sha256,
          valid: buf.length > 0,
        });
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  return report;
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const allowLocal = args.includes('--allow-local') || process.env.ALLOW_LOCAL_TARGET === 'true';
  const connStr = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
  const filePath = process.env.BACKUP_FILE || 'backend/supabase/backup_v1_production_data.json';
  const storageDir = process.env.STORAGE_DIR || 'backend/supabase/storage_backup/menu-items';

  let expectedRef = process.env.EXPECTED_STAGING_PROJECT_REF;
  const refArg = args.find((a) => a.startsWith('--expected-project-ref='));
  if (refArg) {
    expectedRef = refArg.split('=')[1];
  } else if (!expectedRef && (connStr.includes('localhost') || connStr.includes('127.0.0.1'))) {
    expectedRef = 'local-rehearsal';
  }

  runReconciliation({
    connectionString: connStr,
    backupFilePath: filePath,
    storageBackupDir: storageDir,
    expectedProjectRef: expectedRef,
    allowLocal,
  })
    .then((report) => {
      console.log('Reconciliation Report:');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Reconciliation Failed:', err);
      process.exit(1);
    });
}
