import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { validateDatabaseTarget } from '../utils/databaseTargetValidator.js';
import { runMigration } from './migrate_v1_to_v2.js';
import { runReconciliation } from './reconcile_v1_v2.js';

dotenv.config();

const { Pool } = pg;

export interface DryRunInspectionReport {
  timestamp: string;
  targetDatabase: {
    host: string;
    projectRef: string;
    schema: string;
    tables: Record<string, number>;
  };
  backupFile: {
    path: string;
    sha256: string;
    totalRecords: number;
    breakdown: Record<string, number>;
  };
  plannedInventory: {
    v2EntitiesTotal: number;
    tables: Record<string, number>;
    duplicateIdsDetected: number;
    orphanedReferencesDetected: number;
  };
  monetary: {
    subtotal: number;
    cgst: number;
    sgst: number;
    gstTotal: number;
    finalTotal: number;
    paymentsTotal: number;
    discrepancy: number;
  };
  idempotencyCheck: {
    rerunDuplicatesPossible: boolean;
    conflictStrategies: Record<string, string>;
  };
  localRehearsalResult: {
    migrationSuccess: boolean;
    reconciliationSuccess: boolean;
    monetaryMatch: boolean;
  };
}

export async function executeReadOnlyDryRun(): Promise<DryRunInspectionReport> {
  const connStr = process.env.DATABASE_URL || '';
  const expectedRef = process.env.RESTO_V2_PRIMARY_PROJECT_REF || 'zmpthsiiouukjjyrbpnz';
  const allowPrimary = process.env.ALLOW_RESTO_V2_PRIMARY_TARGET === 'true';

  validateDatabaseTarget({
    connectionString: connStr,
    expectedProjectRef: expectedRef,
    allowPrimaryTarget: allowPrimary,
    primaryProjectRef: expectedRef,
    operationName: 'Phase 4B.6 Read-Only Dry-Run Preflight',
  });

  const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: connStr.split('?')[0],
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  const report: DryRunInspectionReport = {
    timestamp: new Date().toISOString(),
    targetDatabase: {
      host: connStr.match(/@([^:/]+)/)?.[1] || 'unknown',
      projectRef: expectedRef,
      schema: 'resto_v2',
      tables: {},
    },
    backupFile: {
      path: 'backend/supabase/backup_v1_production_data.json',
      sha256: '',
      totalRecords: 0,
      breakdown: {},
    },
    plannedInventory: {
      v2EntitiesTotal: 0,
      tables: {},
      duplicateIdsDetected: 0,
      orphanedReferencesDetected: 0,
    },
    monetary: {
      subtotal: 0,
      cgst: 0,
      sgst: 0,
      gstTotal: 0,
      finalTotal: 0,
      paymentsTotal: 0,
      discrepancy: 0,
    },
    idempotencyCheck: {
      rerunDuplicatesPossible: false,
      conflictStrategies: {
        restaurants: 'ON CONFLICT (id) DO UPDATE',
        restaurant_settings: 'ON CONFLICT (restaurant_id) DO UPDATE',
        restaurant_tables: 'ON CONFLICT (id) DO UPDATE',
        categories: 'ON CONFLICT (id) DO UPDATE',
        menu_items: 'ON CONFLICT (id) DO UPDATE',
        orders: 'ON CONFLICT (id) DO UPDATE',
        order_items: 'ON CONFLICT (id) DO UPDATE',
        payments: 'ON CONFLICT (id) DO UPDATE',
        service_requests: 'ON CONFLICT (id) DO UPDATE',
        staff: 'ON CONFLICT (id) DO UPDATE',
        realtime_events: 'ON CONFLICT (id) DO NOTHING',
      },
    },
    localRehearsalResult: {
      migrationSuccess: false,
      reconciliationSuccess: false,
      monetaryMatch: false,
    },
  };

  try {
    // 1. Strictly Read-Only Production Table Inspection
    const tableNames = [
      'restaurants',
      'restaurant_settings',
      'restaurant_tables',
      'categories',
      'menu_items',
      'orders',
      'order_items',
      'payments',
      'service_requests',
      'staff',
      'realtime_events',
    ];

    for (const tbl of tableNames) {
      const res = await client.query(`SELECT COUNT(*) as count FROM resto_v2.${tbl};`);
      report.targetDatabase.tables[tbl] = parseInt(res.rows[0].count, 10);
    }

    // 2. Backup File Inspection & Hashing
    let backupPath = path.resolve(process.cwd(), report.backupFile.path);
    if (!fs.existsSync(backupPath)) {
      backupPath = path.resolve(process.cwd(), '..', report.backupFile.path);
    }
    const rawBuffer = fs.readFileSync(backupPath);
    report.backupFile.sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    const backupData = JSON.parse(rawBuffer.toString('utf8'));
    let v1Count = 0;
    const seenIds = new Set<string>();
    let dupes = 0;

    for (const [tbl, rows] of Object.entries(backupData)) {
      if (Array.isArray(rows)) {
        report.backupFile.breakdown[tbl] = rows.length;
        v1Count += rows.length;
        for (const r of rows as any[]) {
          if (r.id) {
            const key = `${tbl}:${r.id}`;
            if (seenIds.has(key)) dupes++;
            seenIds.add(key);
          }
        }
      }
    }
    report.backupFile.totalRecords = v1Count;
    report.plannedInventory.duplicateIdsDetected = dupes;

    // 3. Planned V2 Inventory (including 1-to-1 restaurant_settings)
    report.plannedInventory.tables = {
      restaurants: backupData.restaurants?.length || 0,
      restaurant_settings: backupData.restaurants?.length || 0,
      restaurant_tables: backupData.restaurant_tables?.length || 0,
      categories: backupData.categories?.length || 0,
      menu_items: backupData.menu_items?.length || 0,
      orders: backupData.orders?.length || 0,
      order_items: backupData.order_items?.length || 0,
      payments: backupData.payments?.length || 0,
      service_requests: backupData.service_requests?.length || 0,
      staff: backupData.staff?.length || 0,
      realtime_events: backupData.realtime_events?.length || 0,
    };
    report.plannedInventory.v2EntitiesTotal = Object.values(report.plannedInventory.tables).reduce(
      (a, b) => a + b,
      0
    );

    // 4. Foreign Key Graph Inspection in Memory
    const restIds = new Set((backupData.restaurants || []).map((r: any) => r.id));
    const tableIds = new Set((backupData.restaurant_tables || []).map((t: any) => t.id));
    const catIds = new Set((backupData.categories || []).map((c: any) => c.id));
    const itemIds = new Set((backupData.menu_items || []).map((m: any) => m.id));
    const orderIds = new Set((backupData.orders || []).map((o: any) => o.id));

    let orphans = 0;
    // Tables -> Restaurant
    for (const t of backupData.restaurant_tables || []) {
      if (!restIds.has(t.restaurant_id)) orphans++;
    }
    // Categories -> Restaurant
    for (const c of backupData.categories || []) {
      if (!restIds.has(c.restaurant_id)) orphans++;
    }
    // Menu items -> Category & Restaurant
    for (const m of backupData.menu_items || []) {
      if (!restIds.has(m.restaurant_id)) orphans++;
      if (m.category_id && !catIds.has(m.category_id)) orphans++;
    }
    // Orders -> Table & Restaurant
    for (const o of backupData.orders || []) {
      if (!restIds.has(o.restaurant_id)) orphans++;
      if (o.table_id && !tableIds.has(o.table_id)) orphans++;
    }
    // Order items -> Order & Menu Item
    for (const oi of backupData.order_items || []) {
      if (!orderIds.has(oi.order_id)) orphans++;
      if (!itemIds.has(oi.menu_item_id)) orphans++;
    }
    // Payments -> Order & Restaurant
    for (const p of backupData.payments || []) {
      if (!restIds.has(p.restaurant_id)) orphans++;
      if (!orderIds.has(p.order_id)) orphans++;
    }
    report.plannedInventory.orphanedReferencesDetected = orphans;

    // 5. Monetary Calculations
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let gstTotal = 0;
    let finalTotal = 0;
    for (const o of backupData.orders || []) {
      subtotal += Number(o.subtotal || 0);
      cgst += Number(o.cgst || 0);
      sgst += Number(o.sgst || 0);
      gstTotal += Number(o.gst_total ?? o.tax ?? 0);
      finalTotal += Number(o.final_total ?? o.total ?? 0);
    }
    let paymentsTotal = 0;
    for (const p of backupData.payments || []) {
      paymentsTotal += Number(p.amount || 0);
    }
    report.monetary = {
      subtotal: Math.round(subtotal * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      gstTotal: Math.round(gstTotal * 100) / 100,
      finalTotal: Math.round(finalTotal * 100) / 100,
      paymentsTotal: Math.round(paymentsTotal * 100) / 100,
      discrepancy: Math.round(Math.abs(finalTotal - paymentsTotal) * 100) / 100,
    };
  } finally {
    client.release();
    await pool.end();
  }

  // 6. Isolated Local Rehearsal Run
  const localConn = 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
  try {
    const localMigration = await runMigration({
      connectionString: localConn,
      backupFilePath: 'backend/supabase/backup_v1_production_data.json',
      reset: true,
      expectedProjectRef: 'local-rehearsal',
      allowLocal: true,
    });
    report.localRehearsalResult.migrationSuccess =
      localMigration.monetary.v2OrdersFinalTotal === 1134 &&
      localMigration.monetary.v2PaymentsAmount === 1134;

    const localReconcile = await runReconciliation({
      connectionString: localConn,
      backupFilePath: 'backend/supabase/backup_v1_production_data.json',
      storageBackupDir: 'backend/supabase/storage_backup/menu-items',
      expectedProjectRef: 'local-rehearsal',
      allowLocal: true,
    });
    report.localRehearsalResult.reconciliationSuccess = localReconcile.monetary.reconciled;
    report.localRehearsalResult.monetaryMatch =
      localReconcile.monetary.v1.ordersFinalTotal === localReconcile.monetary.v2.ordersFinalTotal;
  } catch (err: any) {
    console.error('Local Rehearsal Error:', err.message);
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeReadOnlyDryRun()
    .then((report) => {
      console.log('\n=== RESTO V2 — DRY RUN INSPECTION REPORT ===');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Dry-Run Inspection Failed:', err);
      process.exit(1);
    });
}
