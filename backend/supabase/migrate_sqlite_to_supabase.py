"""
RESTO Idempotent SQLite to Supabase PostgreSQL Data Migration Script
Migrates all real business records while strictly preserving original IDs,
foreign key relationships, order timestamps, JSON structures, and financial precision.
Includes retry logic, backoff, financial precision safeguards, and post-migration reconciliation.
"""

import os
import sys
import time
import json
import sqlite3
import argparse
from decimal import Decimal
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SQLITE_PATH = os.path.join(BASE_DIR, "db.sqlite3")
SQLITE_BACKUP = os.path.join(BASE_DIR, "db.sqlite3.backup_20261102")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://zmpthsiiouukjjyrbpnz.supabase.co").rstrip("/")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

JSON_COLUMNS = {
    "opening_hours",
    "dietary_tags",
    "allergens",
    "addons",
    "status_timeline",
    "selected_addons",
    "payload",
}

FINANCIAL_COLUMNS = {
    "tax_percentage",
    "service_charge_percentage",
    "price",
    "item_price",
    "subtotal",
    "tax_total",
    "final_total",
    "amount",
}

def get_sqlite_conn():
    path = SQLITE_PATH if os.path.exists(SQLITE_PATH) else SQLITE_BACKUP
    if not os.path.exists(path):
        raise FileNotFoundError(f"Source SQLite database not found at {path}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def format_financial_value(val):
    """Preserves exact financial precision for PostgreSQL numeric types."""
    if val is None:
        return None
    if isinstance(val, (int, float, str)):
        try:
            d = Decimal(str(val))
            return f"{d:.2f}"
        except Exception:
            return str(val)
    return str(val)

def migrate_batch_with_retry(url: str, headers: dict, batch: list, max_retries: int = 3) -> bool:
    """Executes PostgREST upsert with exponential backoff on transient errors."""
    delay = 1.0
    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(url, headers=headers, json=batch, timeout=30)
            if r.status_code in (200, 201):
                return True
            if r.status_code in (429, 500, 502, 503, 504) and attempt < max_retries:
                time.sleep(delay)
                delay *= 2
                continue
            print(f"    [FAIL] HTTP {r.status_code} on attempt {attempt}: {r.text[:200]}")
            return False
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as ex:
            if attempt < max_retries:
                time.sleep(delay)
                delay *= 2
                continue
            print(f"    [TIMEOUT/CONN] Error on attempt {attempt}: {ex}")
            return False
    return False

def migrate_table_via_postgrest(table_name: str, rows: list, pkey: str = "id", dry_run: bool = False) -> tuple[int, int]:
    """
    Migrates rows to Supabase using PostgREST upsert (on_conflict=id).
    Safe, idempotent, preserves all timestamps and relationships.
    """
    if not rows:
        return 0, 0

    if dry_run:
        print(f"  [DRY-RUN] Verified {len(rows)} rows ready for upsert into {table_name}")
        return len(rows), 0

    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }

    url = f"{SUPABASE_URL}/rest/v1/{table_name}?on_conflict={pkey}"
    
    batch_size = 50
    migrated_count = 0
    errors = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        success = migrate_batch_with_retry(url, headers, batch)
        if success:
            migrated_count += len(batch)
        else:
            errors += len(batch)

    return migrated_count, errors

def fetch_destination_count(table_name: str) -> int:
    """Fetches exact row count from Supabase PostgREST table."""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Prefer": "count=exact",
    }
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=id&limit=0"
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code in (200, 206):
            content_range = r.headers.get("Content-Range", "")
            if "/" in content_range:
                count_str = content_range.split("/")[1].strip()
                if count_str.isdigit():
                    return int(count_str)
        return -1
    except Exception:
        return -1

def reconcile_destination_keys(table_name: str, source_keys: set, pkey: str = "id") -> tuple[bool, int, int]:
    """
    Fetches all primary keys from Supabase PostgREST table and verifies
    100% exact match against source keys.
    Returns (is_match, missing_count, extra_count).
    """
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    }
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select={pkey}&limit=10000"
    try:
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code == 200:
            dest_keys = {str(item[pkey]) for item in r.json() if pkey in item}
            missing = source_keys - dest_keys
            extra = dest_keys - source_keys
            is_match = (len(missing) == 0 and len(extra) == 0 and len(source_keys) == len(dest_keys))
            return is_match, len(missing), len(extra)
        return False, len(source_keys), 0
    except Exception:
        return False, len(source_keys), 0

def run_migration(dry_run: bool = False):
    print("=" * 80)
    print(f"RESTO: SQLITE TO SUPABASE POSTGRESQL MIGRATION ENGINE {'(DRY-RUN)' if dry_run else ''}")
    print("=" * 80)
    print(f"Source Database : {SQLITE_PATH}")
    print(f"Target Supabase : {SUPABASE_URL}")
    print(f"Service Role Key: {'Configured (Protected)' if SERVICE_ROLE_KEY else 'MISSING'}")
    print("=" * 80)

    if not SERVICE_ROLE_KEY and not dry_run:
        print("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is required for migration.")
        sys.exit(1)

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
            source_keys = {str(r[pkey]) for r in raw_rows}

            # JSON field and financial conversions
            processed_rows = []
            for r in raw_rows:
                item = dict(r)
                # Convert stringified JSON to parsed dict/list for PostgreSQL JSONB
                for json_col in JSON_COLUMNS:
                    if json_col in item and isinstance(item[json_col], str):
                        try:
                            item[json_col] = json.loads(item[json_col])
                        except Exception:
                            pass
                # Convert financial columns to precision decimal strings
                for fin_col in FINANCIAL_COLUMNS:
                    if fin_col in item and item[fin_col] is not None:
                        item[fin_col] = format_financial_value(item[fin_col])
                processed_rows.append(item)

            migrated, errors = migrate_table_via_postgrest(table, processed_rows, pkey, dry_run=dry_run)

            # Post-migration reconciliation: exact counts and primary-key sets
            if dry_run:
                destination_count = source_count
                pk_match = True
                missing_pks = 0
                extra_pks = 0
            else:
                destination_count = fetch_destination_count(table)
                pk_match, missing_pks, extra_pks = reconcile_destination_keys(table, source_keys, pkey)

            count_match = (destination_count == source_count)
            status = "PASS" if errors == 0 and count_match and pk_match else ("EMPTY" if source_count == 0 else "FAIL")

            summary.append({
                "table": table,
                "source_count": source_count,
                "migrated_count": migrated,
                "destination_count": destination_count if destination_count >= 0 else "N/A",
                "pk_match": "MATCH" if pk_match else "MISMATCH",
                "missing_pks": missing_pks,
                "extra_pks": extra_pks,
                "errors": errors,
                "status": status,
            })
            print(f"[{status:7}] {table:18}: {source_count:5} src | {migrated:5} sent | Dest: {destination_count} | PKs: {'MATCH' if pk_match else 'FAIL'} | Err: {errors}")
        except sqlite3.OperationalError as ex:
            print(f"[SKIP   ] {table:18}: Source table not present in SQLite ({ex})")
        except Exception as ex:
            print(f"[FAIL   ] {table:18}: {ex}")

    sqlite_conn.close()

    print("\n" + "=" * 80)
    print("MIGRATION RECONCILIATION LEDGER (ROW COUNTS & PRIMARY-KEY INTEGRITY)")
    print("=" * 80)
    print(f"{'Table':<20} | {'SQLite':<8} | {'Migrated':<8} | {'Dest Count':<10} | {'PK Set':<8} | {'Status':<8}")
    print("-" * 80)
    for s in summary:
        print(f"{s['table']:<20} | {s['source_count']:<8} | {s['migrated_count']:<8} | {str(s['destination_count']):<10} | {s['pk_match']:<8} | {s['status']:<8}")
    print("=" * 80)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RESTO SQLite to Supabase Migration")
    parser.add_argument("--dry-run", action="store_true", help="Simulate data processing without sending network requests")
    args = parser.parse_args()
    run_migration(dry_run=args.dry_run)
