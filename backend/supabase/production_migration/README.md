# RESTO Production Supabase Migration Guide

## Migration File Manifest

| Order | File | Description |
| :---: | :--- | :--- |
| **Step 1** | `01_schema.sql` | Creates all 10 application tables with strict constraints, foreign keys, and defaults. |
| **Step 2** | `02_rls_policies.sql` | Enables and enforces Row Level Security (RLS) on all tables with tenant isolation. |
| **Step 3** | `03_indexes.sql` | Creates composite indexes matching actual query patterns for high-throughput reads. |
| **Step 4** | `04_storage.sql` | Provisions `resto-media` storage bucket and configures storage object RLS. |
| **Step 5** | `05_realtime.sql` | Configures `REPLICA IDENTITY FULL` and adds operational tables to `supabase_realtime`. |
| **Step 6** | `sync_sequences.sql` | Dynamic sequence synchronization to MAX(id) after importing existing data. |
| **Step 7** | `06_verification.sql` | Comprehensive audit queries verifying tables, constraints, policies, and indexes. |

---

## Execution Instructions (Supabase Web Console)

1. Open your Supabase Project: `https://supabase.com/dashboard/project/zmpthsiiouukjjyrbpnz`
2. Navigate to the **SQL Editor** in the left sidebar.
3. Open and run scripts sequentially from **Step 1** to **Step 5**:
   - Paste the contents of `01_schema.sql` -> Click **Run**.
   - Paste the contents of `02_rls_policies.sql` -> Click **Run**.
   - Paste the contents of `03_indexes.sql` -> Click **Run**.
   - Paste the contents of `04_storage.sql` -> Click **Run**.
   - Paste the contents of `05_realtime.sql` -> Click **Run**.
4. Run the data migration script from your terminal:
   `python backend/supabase/migrate_sqlite_to_supabase.py`
5. Back in the Supabase SQL Editor:
   - Run `sync_sequences.sql` to align sequences with the imported records.
   - Run `06_verification.sql` to verify tables, row counts, constraints, policies, and publications.

