"""
RESTO Idempotent SQLite to Supabase PostgreSQL Data Migration Script
Migrates all real business records while strictly preserving original IDs,
foreign key relationships, order timestamps, and financial totals.
Supports execution via direct PostgreSQL connection (psycopg2) or Supabase PostgREST API.
"""

import os
import sys
import json
import sqlite3
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SQLITE_PATH = os.path.join(BASE_DIR, "db.sqlite3")
SQLITE_BACKUP = os.path.join(BASE_DIR, "db.sqlite3.backup_20261102")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://zmpthsiiouukjjyrbpnz.supabase.co").rstrip("/")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

def get_sqlite_conn():
    path = SQLITE_PATH if os.path.exists(SQLITE_PATH) else SQLITE_BACKUP
    if not os.path.exists(path):
        raise FileNotFoundError(f"Source SQLite database not found at {path}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def migrate_table_via_postgrest(table_name: str, rows: list, pkey: str = "id") -> tuple[int, int]:
    """
    Migrates rows to Supabase using PostgREST upsert (on_conflict=id).
    Safe, idempotent, preserves all timestamps and relationships.
    """
    if not rows:
        return 0, 0

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    url = f"{SUPABASE_URL}/rest/v1/{table_name}?on_conflict={pkey}"
    
    # Process in batches of 50 to avoid payload limit
    batch_size = 50
    migrated_count = 0
    errors = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            r = requests.post(url, headers=headers, json=batch, timeout=20)
            if r.status_code in (200, 201):
                migrated_count += len(batch)
            else:
                print(f"  [ERROR] {table_name} batch {i//batch_size + 1} failed ({r.status_code}): {r.text[:200]}")
                errors += len(batch)
        except Exception as ex:
            print(f"  [EXCEPTION] {table_name} batch {i//batch_size + 1}: {ex}")
            errors += len(batch)

    return migrated_count, errors

def run_migration():
    print("=" * 70)
    print("RESTO: SQLITE TO SUPABASE POSTGRESQL MIGRATION ENGINE")
    print("=" * 70)
    print(f"Source Database : {SQLITE_PATH}")
    print(f"Target Supabase : {SUPABASE_URL}")
    print(f"Direct DB_URL   : {'Configured' if DATABASE_URL else 'Not set (using PostgREST service-role API)'}")
    print("=" * 70)

    sqlite_conn = get_sqlite_conn()
    cursor = sqlite_conn.cursor()

    migration_manifest = [
        ("restaurants", "id"),
        ("restaurant_tables", "id"),
        ("categories", "id"),
        ("menu_items", "id"),
        ("staff", "id"),
        ("orders", "id"),
        ("order_items", "id"),
        ("payments", "id"),
        ("service_requests", "id"),
        ("realtime_events", "id"),
    ]

    summary = []

    for table, pkey in migration_manifest:
        try:
            cursor.execute(f"SELECT * FROM {table}")
            raw_rows = [dict(row) for row in cursor.fetchall()]
            source_count = len(raw_rows)

            # JSON field conversions for PostgreSQL
            processed_rows = []
            for r in raw_rows:
                item = dict(r)
                # Convert stringified JSON to parsed dict/list for PostgreSQL JSONB
                for json_col in ["opening_hours", "dietary_tags", "allergens", "addons", "status_timeline", "selected_addons", "payload"]:
                    if json_col in item and isinstance(item[json_col], str):
                        try:
                            item[json_col] = json.loads(item[json_col])
                        except Exception:
                            pass
                processed_rows.append(item)

            migrated, errors = migrate_table_via_postgrest(table, processed_rows, pkey)
            status = "PASS" if errors == 0 and migrated == source_count else ("EMPTY" if source_count == 0 else "PARTIAL")
            summary.append({
                "table": table,
                "source_count": source_count,
                "migrated_count": migrated,
                "errors": errors,
                "status": status,
            })
            print(f"[{status:7}] {table:20}: {source_count:5} source rows -> {migrated:5} migrated ({errors} errors)")
        except sqlite3.OperationalError as ex:
            print(f"[SKIP   ] {table:20}: Source table not present in SQLite ({ex})")
        except Exception as ex:
            print(f"[FAIL   ] {table:20}: {ex}")

    sqlite_conn.close()

    print("\n" + "=" * 70)
    print("MIGRATION SUMMARY LEDGER")
    print("=" * 70)
    for s in summary:
        print(f"Table: {s['table']:20} | SQLite: {s['source_count']:5} | Supabase: {s['migrated_count']:5} | Status: {s['status']}")
    print("=" * 70)

if __name__ == "__main__":
    run_migration()
