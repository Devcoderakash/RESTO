import { newDb, DataType } from 'pg-mem';
import { setPool } from '../src/database/db.js';

export function setupTestDatabase() {
  const db = newDb();

  // Register required PostgreSQL functions
  db.public.registerFunction({
    name: 'clock_timestamp',
    returns: DataType.timestamp,
    implementation: () => new Date(),
  });

  db.public.registerFunction({
    name: 'current_date',
    returns: DataType.date,
    implementation: () => new Date(),
  });

  // Create schema
  db.public.none('CREATE SCHEMA resto_v2;');

  // Create tables
  db.public.none(`
    CREATE TABLE resto_v2.restaurants (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      email VARCHAR(254) DEFAULT '',
      wifi_ssid VARCHAR(100) DEFAULT '',
      wifi_password VARCHAR(100) DEFAULT '',
      tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00,
      service_charge_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.restaurant_settings (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      opening_hours JSONB NOT NULL DEFAULT '{}',
      online_ordering_enabled BOOLEAN NOT NULL DEFAULT true,
      allow_table_orders BOOLEAN NOT NULL DEFAULT true,
      auto_accept_orders BOOLEAN NOT NULL DEFAULT false,
      sound_notifications BOOLEAN NOT NULL DEFAULT true,
      notification_sound VARCHAR(50) NOT NULL DEFAULT 'chime',
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.restaurant_tables (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      table_number VARCHAR(20) NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      qr_code_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.categories (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.menu_items (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      category_id VARCHAR(64) NOT NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      image_url TEXT,
      is_vegetarian BOOLEAN NOT NULL DEFAULT true,
      is_available BOOLEAN NOT NULL DEFAULT true,
      spiciness_level INTEGER NOT NULL DEFAULT 0,
      preparation_time_minutes INTEGER NOT NULL DEFAULT 15,
      allergens TEXT[] DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.orders (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      order_number VARCHAR(50) NOT NULL,
      table_id VARCHAR(64),
      table_number VARCHAR(20) NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(50),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      tax NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      service_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      special_instructions TEXT,
      idempotency_key VARCHAR(100),
      tracking_token VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.order_items (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      menu_item_id VARCHAR(64) NOT NULL,
      item_name VARCHAR(150) NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_price NUMERIC(10,2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.payments (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      order_id VARCHAR(64) NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      transaction_reference VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.service_requests (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      table_id VARCHAR(64),
      table_number VARCHAR(20) NOT NULL,
      request_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      order_id VARCHAR(64),
      message TEXT,
      payment_preference VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      resolved_at TIMESTAMP
    );

    CREATE TABLE resto_v2.staff (
      id VARCHAR(64) PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL,
      username VARCHAR(150),
      password_hash VARCHAR(255) NOT NULL DEFAULT '',
      role VARCHAR(50) NOT NULL DEFAULT 'manager',
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp(),
      updated_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );

    CREATE TABLE resto_v2.realtime_events (
      id SERIAL PRIMARY KEY,
      restaurant_id VARCHAR(64) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(64) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT clock_timestamp()
    );
  `);

  // Seed baseline data
  db.public.none(`
    INSERT INTO resto_v2.restaurants (
      id, name, slug, description, address, phone, email, wifi_ssid, wifi_password, tax_percentage, currency
    ) VALUES (
      'rest-olive-ember-01', 'The Olive & Ember', 'olive-and-ember',
      'Contemporary dining', '14 Wood St, Bengaluru', '+91 98765 43210', 'contact@oliveandember.com',
      'OliveGuest', 'welcome2026', 5.00, 'INR'
    );

    INSERT INTO resto_v2.restaurant_settings (
      id, restaurant_id, opening_hours, online_ordering_enabled, allow_table_orders
    ) VALUES (
      'set-01', 'rest-olive-ember-01', '{"monday": {"open": "11:00", "close": "23:00"}}', true, true
    );

    INSERT INTO resto_v2.restaurant_tables (id, restaurant_id, table_number, capacity, status)
    VALUES 
      ('tbl-01', 'rest-olive-ember-01', '01', 4, 'available'),
      ('tbl-02', 'rest-olive-ember-01', '02', 2, 'occupied');

    INSERT INTO resto_v2.categories (id, restaurant_id, name, sort_order, is_visible)
    VALUES 
      ('cat-pizzas', 'rest-olive-ember-01', 'Wood-fired Pizzas', 1, true),
      ('cat-desserts', 'rest-olive-ember-01', 'Artisanal Desserts', 2, true);

    INSERT INTO resto_v2.menu_items (id, restaurant_id, category_id, name, price, is_available, is_vegetarian)
    VALUES 
      ('item-pizza-01', 'rest-olive-ember-01', 'cat-pizzas', 'Truffle Mushroom Pizza', 480.00, true, true),
      ('item-dessert-01', 'rest-olive-ember-01', 'cat-desserts', 'Classic Tiramisu', 250.00, true, true);

    INSERT INTO resto_v2.staff (id, restaurant_id, full_name, email, role, is_active)
    VALUES 
      ('staff-manager-01', 'rest-olive-ember-01', 'Restaurant Manager', 'manager@oliveandember.com', 'manager', true),
      ('staff-chef-01', 'rest-olive-ember-01', 'Executive Chef', 'chef@oliveandember.com', 'chef', true),
      ('staff-waiter-01', 'rest-olive-ember-01', 'Floor Waiter', 'waiter@oliveandember.com', 'waiter', true);

    INSERT INTO resto_v2.orders (
      id, restaurant_id, order_number, table_id, table_number, customer_name, status,
      subtotal, tax, service_charge, total, tracking_token
    ) VALUES (
      'ord-20261102-001', 'rest-olive-ember-01', 'ORD-1001', 'tbl-01', '01', 'Rohan Sharma', 'completed',
      1210.00, 60.50, 0.00, 1270.50, 'trk-token-001'
    );

    INSERT INTO resto_v2.order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, total_price)
    VALUES 
      ('itm-001-1', 'ord-20261102-001', 'item-pizza-01', 'Truffle Mushroom Pizza', 480.00, 2, 960.00),
      ('itm-001-2', 'ord-20261102-001', 'item-dessert-01', 'Classic Tiramisu', 250.00, 1, 250.00);

    INSERT INTO resto_v2.payments (id, restaurant_id, order_id, amount, payment_method, status, transaction_reference)
    VALUES ('pay-20261102-001', 'rest-olive-ember-01', 'ord-20261102-001', 1270.50, 'upi', 'completed', 'UPI-REF-001');

    INSERT INTO resto_v2.service_requests (id, restaurant_id, table_id, table_number, request_type, status)
    VALUES ('req-01', 'rest-olive-ember-01', 'tbl-01', '01', 'water', 'pending');
  `);

  // Create pg pool adapter and inject
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  setPool(pool as any);

  return { db, pool };
}
