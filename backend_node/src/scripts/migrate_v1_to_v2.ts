import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

export interface MigrationSummary {
  dryRun: boolean;
  sourceFile: string;
  targetSchema: string;
  database: string;
  tables: Record<string, { source: number; inserted: number; errors: number }>;
  monetary: {
    v1OrdersFinalTotal: number;
    v2OrdersFinalTotal: number;
    v1PaymentsAmount: number;
    v2PaymentsAmount: number;
  };
  durationMs: number;
}

export async function runMigration(options: {
  connectionString: string;
  backupFilePath: string;
  targetSchema?: string;
  dryRun?: boolean;
  reset?: boolean;
}): Promise<MigrationSummary> {
  // CRITICAL PRODUCTION SAFETY GUARD
  const BLOCKED_PRODUCTION_PROJECT_REFS = ['zmpthsiiouukjjyrbpnz', 'krsdjcxgfnlsstjwuqlj'];
  for (const ref of BLOCKED_PRODUCTION_PROJECT_REFS) {
    if (options.connectionString.includes(ref)) {
      throw new Error(
        `CRITICAL SAFETY VIOLATION: Target connection references production project '${ref}'. Operations against production are strictly blocked.`
      );
    }
  }

  const startTime = Date.now();
  const schema = options.targetSchema || 'resto_v2';
  const dryRun = Boolean(options.dryRun);

  let backupFilePath = options.backupFilePath;
  if (!fs.existsSync(backupFilePath)) {
    const parentPath = path.resolve(process.cwd(), '..', backupFilePath);
    if (fs.existsSync(parentPath)) {
      backupFilePath = parentPath;
    } else {
      throw new Error(`Backup file not found at: ${options.backupFilePath} or ${parentPath}`);
    }
  }

  const rawJson = fs.readFileSync(backupFilePath, 'utf8');
  const backupData = JSON.parse(rawJson);

  const pool = new Pool({ connectionString: options.connectionString });
  const client = await pool.connect();

  const summary: MigrationSummary = {
    dryRun,
    sourceFile: options.backupFilePath,
    targetSchema: schema,
    database: (client as any).connectionParameters?.database || 'unknown',
    tables: {},
    monetary: {
      v1OrdersFinalTotal: 0,
      v2OrdersFinalTotal: 0,
      v1PaymentsAmount: 0,
      v2PaymentsAmount: 0,
    },
    durationMs: 0,
  };

  try {
    await client.query('BEGIN');

    // 0. Optional Reset (Safe reverse-dependency order)
    if (options.reset) {
      await client.query(`
        TRUNCATE ${schema}.order_items, ${schema}.payments, ${schema}.service_requests,
                 ${schema}.orders, ${schema}.menu_items, ${schema}.categories,
                 ${schema}.restaurant_tables, ${schema}.staff, ${schema}.restaurant_settings,
                 ${schema}.realtime_events, ${schema}.restaurants CASCADE;
      `);
    }

    // 1. RESTAURANTS
    const restaurants = backupData.restaurants || [];
    summary.tables['restaurants'] = { source: restaurants.length, inserted: 0, errors: 0 };
    for (const r of restaurants) {
      if (!r.id || !r.name || !r.slug) {
        summary.tables['restaurants'].errors++;
        continue;
      }
      await client.query(
        `INSERT INTO ${schema}.restaurants (
          id, name, slug, description, address, phone, email, logo_url,
          opening_hours, wifi_ssid, wifi_password, tax_percentage, service_charge_percentage,
          currency, timezone, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          logo_url = EXCLUDED.logo_url,
          opening_hours = EXCLUDED.opening_hours,
          wifi_ssid = EXCLUDED.wifi_ssid,
          wifi_password = EXCLUDED.wifi_password,
          tax_percentage = EXCLUDED.tax_percentage,
          service_charge_percentage = EXCLUDED.service_charge_percentage,
          currency = EXCLUDED.currency,
          timezone = EXCLUDED.timezone,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at;`,
        [
          r.id,
          r.name,
          r.slug,
          r.description || '',
          r.address || '',
          r.phone || '',
          r.email || '',
          r.logo_url || '',
          JSON.stringify(r.opening_hours || {}),
          r.wifi_ssid || '',
          r.wifi_password || '',
          Number(r.tax_percentage) || 5.0,
          Number(r.service_charge_percentage) || 0.0,
          r.currency || 'INR',
          r.timezone || 'Asia/Kolkata',
          r.is_active ?? true,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString(),
        ]
      );
      summary.tables['restaurants'].inserted++;

      // Also migrate restaurant_settings
      await client.query(
        `INSERT INTO ${schema}.restaurant_settings (
          restaurant_id, auto_accept_orders, order_notification_sound,
          allow_custom_notes, enable_waiter_call, enable_bill_request, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (restaurant_id) DO UPDATE SET
          auto_accept_orders = EXCLUDED.auto_accept_orders,
          order_notification_sound = EXCLUDED.order_notification_sound,
          allow_custom_notes = EXCLUDED.allow_custom_notes,
          enable_waiter_call = EXCLUDED.enable_waiter_call,
          enable_bill_request = EXCLUDED.enable_bill_request,
          updated_at = EXCLUDED.updated_at;`,
        [
          r.id,
          false,
          true,
          true,
          true,
          true,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString(),
        ]
      );
    }

    // 2. RESTAURANT_TABLES
    const tables = backupData.restaurant_tables || [];
    summary.tables['restaurant_tables'] = { source: tables.length, inserted: 0, errors: 0 };
    for (const t of tables) {
      if (!t.id || !t.restaurant_id || !t.table_number) {
        summary.tables['restaurant_tables'].errors++;
        continue;
      }
      await client.query(
        `INSERT INTO ${schema}.restaurant_tables (
          id, restaurant_id, table_number, capacity, zone, status, qr_code_url, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          table_number = EXCLUDED.table_number,
          capacity = EXCLUDED.capacity,
          zone = EXCLUDED.zone,
          status = EXCLUDED.status,
          qr_code_url = EXCLUDED.qr_code_url;`,
        [
          t.id,
          t.restaurant_id,
          t.table_number,
          t.capacity || 4,
          t.zone || 'Main Dining',
          t.status || 'available',
          t.qr_code_url || '',
          t.created_at || new Date().toISOString(),
        ]
      );
      summary.tables['restaurant_tables'].inserted++;
    }

    // 3. CATEGORIES
    const categories = backupData.categories || [];
    summary.tables['categories'] = { source: categories.length, inserted: 0, errors: 0 };
    for (const c of categories) {
      if (!c.id || !c.restaurant_id || !c.name) {
        summary.tables['categories'].errors++;
        continue;
      }
      await client.query(
        `INSERT INTO ${schema}.categories (
          id, restaurant_id, name, description, image_url, sort_order, is_visible, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          sort_order = EXCLUDED.sort_order,
          is_visible = EXCLUDED.is_visible;`,
        [
          c.id,
          c.restaurant_id,
          c.name,
          c.description || '',
          c.image_url || '',
          c.sort_order || 0,
          c.is_visible ?? true,
          c.created_at || new Date().toISOString(),
        ]
      );
      summary.tables['categories'].inserted++;
    }

    // 4. MENU_ITEMS
    const menuItems = backupData.menu_items || [];
    summary.tables['menu_items'] = { source: menuItems.length, inserted: 0, errors: 0 };
    for (const m of menuItems) {
      if (!m.id || !m.restaurant_id || !m.name) {
        summary.tables['menu_items'].errors++;
        continue;
      }
      const foodType = m.food_type || (m.is_vegetarian === false ? 'non_veg' : 'veg');
      const isAvailable = m.available ?? m.is_available ?? true;

      await client.query(
        `INSERT INTO ${schema}.menu_items (
          id, restaurant_id, category_id, name, description, price, image_url,
          food_type, dietary_tags, available, popular, chef_special,
          preparation_time_minutes, calories, allergens, addons, sort_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          image_url = EXCLUDED.image_url,
          food_type = EXCLUDED.food_type,
          dietary_tags = EXCLUDED.dietary_tags,
          available = EXCLUDED.available,
          popular = EXCLUDED.popular,
          chef_special = EXCLUDED.chef_special,
          preparation_time_minutes = EXCLUDED.preparation_time_minutes,
          calories = EXCLUDED.calories,
          allergens = EXCLUDED.allergens,
          addons = EXCLUDED.addons,
          sort_order = EXCLUDED.sort_order,
          updated_at = EXCLUDED.updated_at;`,
        [
          m.id,
          m.restaurant_id,
          m.category_id || null,
          m.name,
          m.description || '',
          m.price,
          m.image_url || '',
          foodType,
          JSON.stringify(m.dietary_tags || []),
          isAvailable,
          m.popular ?? false,
          m.chef_special ?? false,
          m.preparation_time_minutes || 15,
          m.calories || null,
          JSON.stringify(m.allergens || []),
          JSON.stringify(m.addons || []),
          m.sort_order || 0,
          m.created_at || new Date().toISOString(),
          m.updated_at || new Date().toISOString(),
        ]
      );
      summary.tables['menu_items'].inserted++;
    }

    // 5. STAFF
    const staff = backupData.staff || [];
    summary.tables['staff'] = { source: staff.length, inserted: 0, errors: 0 };
    for (const s of staff) {
      if (!s.id || !s.restaurant_id || !s.email) {
        summary.tables['staff'].errors++;
        continue;
      }
      await client.query(
        `INSERT INTO ${schema}.staff (
          id, restaurant_id, full_name, email, role, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active;`,
        [
          s.id,
          s.restaurant_id,
          s.full_name || 'Staff Member',
          s.email,
          s.role || 'manager',
          s.is_active ?? true,
          s.created_at || new Date().toISOString(),
        ]
      );
      summary.tables['staff'].inserted++;
    }

    // 6. ORDERS
    const orders = backupData.orders || [];
    summary.tables['orders'] = { source: orders.length, inserted: 0, errors: 0 };
    for (const o of orders) {
      if (!o.id || !o.restaurant_id || !o.table_number) {
        summary.tables['orders'].errors++;
        continue;
      }
      const finalTotalNum = Number(o.final_total ?? o.total ?? 0);
      summary.monetary.v1OrdersFinalTotal += finalTotalNum;

      await client.query(
        `INSERT INTO ${schema}.orders (
          id, order_number, restaurant_id, table_id, table_number, idempotency_key, tracking_token_hash,
          customer_name, customer_phone, subtotal, cgst, sgst, gst_total, service_charge, final_total,
          payment_method, payment_status, status, order_notes, cancellation_reason, estimated_time_minutes,
          status_timeline, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (id) DO UPDATE SET
          order_number = EXCLUDED.order_number,
          table_id = EXCLUDED.table_id,
          table_number = EXCLUDED.table_number,
          idempotency_key = EXCLUDED.idempotency_key,
          tracking_token_hash = EXCLUDED.tracking_token_hash,
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          subtotal = EXCLUDED.subtotal,
          cgst = EXCLUDED.cgst,
          sgst = EXCLUDED.sgst,
          gst_total = EXCLUDED.gst_total,
          service_charge = EXCLUDED.service_charge,
          final_total = EXCLUDED.final_total,
          payment_method = EXCLUDED.payment_method,
          payment_status = EXCLUDED.payment_status,
          status = EXCLUDED.status,
          order_notes = EXCLUDED.order_notes,
          cancellation_reason = EXCLUDED.cancellation_reason,
          estimated_time_minutes = EXCLUDED.estimated_time_minutes,
          status_timeline = EXCLUDED.status_timeline,
          updated_at = EXCLUDED.updated_at;`,
        [
          o.id,
          o.order_number || o.id,
          o.restaurant_id,
          o.table_id || null,
          o.table_number,
          o.idempotency_key || '',
          o.tracking_token_hash || '',
          o.customer_name || 'Guest',
          o.customer_phone || '',
          Number(o.subtotal) || 0,
          Number(o.cgst) || 0,
          Number(o.sgst) || 0,
          Number(o.gst_total ?? o.tax) || 0,
          Number(o.service_charge) || 0,
          finalTotalNum,
          o.payment_method || 'counter',
          o.payment_status || 'pending',
          o.status || 'pending',
          o.order_notes || '',
          o.cancellation_reason || '',
          o.estimated_time_minutes || 20,
          JSON.stringify(o.status_timeline || []),
          o.created_at || new Date().toISOString(),
          o.updated_at || new Date().toISOString(),
        ]
      );
      summary.tables['orders'].inserted++;
      summary.monetary.v2OrdersFinalTotal += finalTotalNum;
    }

    // 7. ORDER_ITEMS
    const orderItems = backupData.order_items || [];
    summary.tables['order_items'] = { source: orderItems.length, inserted: 0, errors: 0 };
    for (const oi of orderItems) {
      if (!oi.id || !oi.order_id || !oi.menu_item_id) {
        summary.tables['order_items'].errors++;
        continue;
      }
      await client.query(
        `INSERT INTO ${schema}.order_items (
          id, order_id, menu_item_id, item_name, food_type, quantity, unit_price,
          total_price, selected_addons, special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          item_name = EXCLUDED.item_name,
          food_type = EXCLUDED.food_type,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          total_price = EXCLUDED.total_price,
          selected_addons = EXCLUDED.selected_addons,
          special_instructions = EXCLUDED.special_instructions;`,
        [
          oi.id,
          oi.order_id,
          oi.menu_item_id,
          oi.item_name || 'Menu Item',
          oi.food_type || 'veg',
          Number(oi.quantity) || 1,
          Number(oi.unit_price) || 0,
          Number(oi.total_price) || 0,
          JSON.stringify(oi.selected_addons || []),
          oi.special_instructions || '',
        ]
      );
      summary.tables['order_items'].inserted++;
    }

    // 8. PAYMENTS
    const payments = backupData.payments || [];
    summary.tables['payments'] = { source: payments.length, inserted: 0, errors: 0 };
    for (const p of payments) {
      if (!p.id || !p.restaurant_id || !p.order_id) {
        summary.tables['payments'].errors++;
        continue;
      }
      const payAmount = Number(p.amount) || 0;
      summary.monetary.v1PaymentsAmount += payAmount;

      await client.query(
        `INSERT INTO ${schema}.payments (
          id, restaurant_id, order_id, amount, payment_method, payment_status,
          transaction_reference, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          payment_method = EXCLUDED.payment_method,
          payment_status = EXCLUDED.payment_status,
          transaction_reference = EXCLUDED.transaction_reference;`,
        [
          p.id,
          p.restaurant_id,
          p.order_id,
          payAmount,
          p.payment_method || 'counter',
          p.payment_status || 'pending',
          p.transaction_reference || '',
          p.created_at || new Date().toISOString(),
        ]
      );
      summary.tables['payments'].inserted++;
      summary.monetary.v2PaymentsAmount += payAmount;
    }

    // 9. SERVICE_REQUESTS
    const serviceRequests = backupData.service_requests || [];
    summary.tables['service_requests'] = { source: serviceRequests.length, inserted: 0, errors: 0 };
    for (const sr of serviceRequests) {
      if (!sr.id || !sr.restaurant_id || !sr.table_number) {
        summary.tables['service_requests'].errors++;
        continue;
      }
      await client.query(
        `INSERT INTO ${schema}.service_requests (
          id, restaurant_id, table_id, table_number, request_type, status,
          order_id, message, payment_preference, created_at, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          resolved_at = EXCLUDED.resolved_at;`,
        [
          sr.id,
          sr.restaurant_id,
          sr.table_id || null,
          sr.table_number,
          sr.request_type || 'waiter',
          sr.status || 'pending',
          sr.order_id || null,
          sr.message || '',
          sr.payment_preference || null,
          sr.created_at || new Date().toISOString(),
          sr.resolved_at || null,
        ]
      );
      summary.tables['service_requests'].inserted++;
    }

    // 10. REALTIME_EVENTS
    const realtimeEvents = backupData.realtime_events || [];
    summary.tables['realtime_events'] = { source: realtimeEvents.length, inserted: 0, errors: 0 };
    for (const re of realtimeEvents) {
      if (!re.id || !re.restaurant_id || !re.event_type) {
        summary.tables['realtime_events'].errors++;
        continue;
      }
      await client.query(
        `INSERT INTO ${schema}.realtime_events (
          id, restaurant_id, event_type, entity_type, entity_id, payload, created_at
        ) OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;`,
        [
          re.id,
          re.restaurant_id,
          re.event_type,
          re.entity_type || 'unknown',
          re.entity_id || '',
          JSON.stringify(re.payload || {}),
          re.created_at || new Date().toISOString(),
        ]
      );
      summary.tables['realtime_events'].inserted++;
    }

    // Synchronize serial sequences with MAX(id) after bulk insertion
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('${schema}.realtime_events', 'id'),
        COALESCE((SELECT MAX(id) FROM ${schema}.realtime_events), 1),
        true
      );
    `);

    // Reconcile and commit or rollback
    if (dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  summary.durationMs = Date.now() - startTime;
  return summary;
}

// Standalone CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const isDryRun = process.argv.includes('--dry-run');
  const isReset = process.argv.includes('--reset');
  const connStr = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://akashlodhi@localhost:5432/resto_v2_rehearsal';
  const filePath = process.env.BACKUP_FILE || 'backend/supabase/backup_v1_production_data.json';

  console.log(`\n======================================================`);
  console.log(`RESTO V2 — Migration Engine Execution`);
  console.log(`Database: ${connStr.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`File:     ${filePath}`);
  console.log(`Dry-Run:  ${isDryRun}`);
  console.log(`Reset:    ${isReset}`);
  console.log(`======================================================\n`);

  runMigration({
    connectionString: connStr,
    backupFilePath: filePath,
    dryRun: isDryRun,
    reset: isReset,
  })
    .then((summary) => {
      console.log('Migration Result:');
      console.log(JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration Engine Failed:', err);
      process.exit(1);
    });
}
