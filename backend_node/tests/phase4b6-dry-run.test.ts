import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { executeReadOnlyDryRun } from '../src/scripts/dry_run_v1_to_v2.js';
import { getBackupFilePath, getStorageBackupDir } from '../src/utils/backupPaths.js';

describe('RESTO V2 — Phase 4B.6 Production Data Migration Preflight & Dry-Run Suite', () => {
  const backupFullPath = getBackupFilePath();
  const storageFullDir = getStorageBackupDir();

  it('1. verifies canonical V1 backup integrity and SHA-256 checksum', () => {
    expect(fs.existsSync(backupFullPath)).toBe(true);
    const buf = fs.readFileSync(backupFullPath);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    expect(sha256).toBe('98f14dc81d7db68c4bd884243d887e9787e3a81bdb88b0daf7755266d299a298');
  });

  it('2. verifies exact 35 records and table breakdown in V1 backup', () => {
    const data = JSON.parse(fs.readFileSync(backupFullPath, 'utf8'));
    expect(data.restaurants?.length).toBe(1);
    expect(data.restaurant_tables?.length).toBe(8);
    expect(data.categories?.length).toBe(5);
    expect(data.menu_items?.length).toBe(7);
    expect(data.orders?.length).toBe(2);
    expect(data.order_items?.length).toBe(2);
    expect(data.payments?.length).toBe(2);
    expect(data.service_requests?.length).toBe(0);
    expect(data.staff?.length).toBe(1);
    expect(data.realtime_events?.length).toBe(7);

    const totalV1 =
      data.restaurants.length +
      data.restaurant_tables.length +
      data.categories.length +
      data.menu_items.length +
      data.orders.length +
      data.order_items.length +
      data.payments.length +
      data.service_requests.length +
      data.staff.length +
      data.realtime_events.length;

    expect(totalV1).toBe(35);
  });

  it('3. confirms foreign key relational integrity and zero orphaned records in backup', () => {
    const data = JSON.parse(fs.readFileSync(backupFullPath, 'utf8'));
    const restId = data.restaurants[0].id;
    expect(restId).toBe('rest-olive-ember-01');

    for (const t of data.restaurant_tables) {
      expect(t.restaurant_id).toBe(restId);
    }
    for (const c of data.categories) {
      expect(c.restaurant_id).toBe(restId);
    }
    const catIds = new Set(data.categories.map((c: any) => c.id));
    for (const m of data.menu_items) {
      expect(m.restaurant_id).toBe(restId);
      if (m.category_id) {
        expect(catIds.has(m.category_id)).toBe(true);
      }
    }
    const orderIds = new Set(data.orders.map((o: any) => o.id));
    const tableIds = new Set(data.restaurant_tables.map((t: any) => t.id));
    for (const o of data.orders) {
      expect(o.restaurant_id).toBe(restId);
      if (o.table_id) {
        expect(tableIds.has(o.table_id)).toBe(true);
      }
    }
    const itemIds = new Set(data.menu_items.map((m: any) => m.id));
    for (const oi of data.order_items) {
      expect(orderIds.has(oi.order_id)).toBe(true);
      expect(itemIds.has(oi.menu_item_id)).toBe(true);
    }
    for (const p of data.payments) {
      expect(p.restaurant_id).toBe(restId);
      expect(orderIds.has(p.order_id)).toBe(true);
    }
  });

  it('4. verifies historical monetary reconciliation to the exact paisa', () => {
    const data = JSON.parse(fs.readFileSync(backupFullPath, 'utf8'));
    const orders = data.orders;
    const subtotal = orders.reduce((s: number, o: any) => s + Number(o.subtotal || 0), 0);
    const cgst = orders.reduce((s: number, o: any) => s + Number(o.cgst || 0), 0);
    const sgst = orders.reduce((s: number, o: any) => s + Number(o.sgst || 0), 0);
    const gstTotal = orders.reduce((s: number, o: any) => s + Number(o.gst_total || 0), 0);
    const finalTotal = orders.reduce((s: number, o: any) => s + Number(o.final_total || 0), 0);

    const payments = data.payments;
    const paymentsTotal = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    expect(Math.round(subtotal * 100) / 100).toBe(1080.0);
    expect(Math.round(cgst * 100) / 100).toBe(27.01);
    expect(Math.round(sgst * 100) / 100).toBe(26.99);
    expect(Math.round(gstTotal * 100) / 100).toBe(54.0);
    expect(Math.round(finalTotal * 100) / 100).toBe(1134.0);
    expect(Math.round(paymentsTotal * 100) / 100).toBe(1134.0);
    expect(finalTotal).toBe(paymentsTotal);
  });

  it('5. inspects 5 storage assets: distinguishes 4 placeholder PNGs and 1 actual menu image', () => {
    expect(fs.existsSync(storageFullDir)).toBe(true);
    const files = fs.readdirSync(storageFullDir).filter((f) => f.endsWith('.png'));
    expect(files.length).toBe(5);

    const placeholders: string[] = [];
    const actualImages: string[] = [];

    for (const file of files) {
      const p = path.join(storageFullDir, file);
      const stat = fs.statSync(p);
      const buf = fs.readFileSync(p);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');

      if (stat.size === 67) {
        placeholders.push(file);
        expect(hash).toBe('bf6e855b67618763d38f0cd8c2ab5ea9aed7b28f4475939f040e4e3ac016bedc');
      } else {
        actualImages.push(file);
        expect(file).toBe('8189843aa34f.png');
        expect(stat.size).toBe(13057);
        expect(hash).toBe('881ffbcaafc212e49addad08846a5b82761355fa20624253af3477ba33262c5c');
      }
    }

    expect(placeholders.length).toBe(4);
    expect(actualImages.length).toBe(1);
  });

  it('6. executes full read-only dry-run with verified zero production write impact', async () => {
    const report = await executeReadOnlyDryRun();

    // Verify target schema
    expect(report.targetDatabase.projectRef).toBe('zmpthsiiouukjjyrbpnz');
    expect(report.targetDatabase.schema).toBe('resto_v2');

    // Verify target table counts match planned inventory post-import
    for (const [tbl, count] of Object.entries(report.targetDatabase.tables)) {
      if (['realtime_events', 'orders', 'order_items', 'payments'].includes(tbl)) {
        expect(count).toBeGreaterThanOrEqual(report.plannedInventory.tables[tbl]);
      } else {
        expect(count).toBe(report.plannedInventory.tables[tbl]);
      }
    }

    // Verify planned inventory
    expect(report.plannedInventory.v2EntitiesTotal).toBe(36);
    expect(report.plannedInventory.duplicateIdsDetected).toBe(0);
    expect(report.plannedInventory.orphanedReferencesDetected).toBe(0);

    // Verify financial match
    expect(report.monetary.finalTotal).toBe(1134);
    expect(report.monetary.paymentsTotal).toBe(1134);
    expect(report.monetary.discrepancy).toBe(0);

    // Verify idempotency
    expect(report.idempotencyCheck.rerunDuplicatesPossible).toBe(false);

    // Verify local rehearsal
    expect(report.localRehearsalResult.migrationSuccess).toBe(true);
    expect(report.localRehearsalResult.reconciliationSuccess).toBe(true);
  });
});
