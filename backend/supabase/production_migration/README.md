# RESTO Production Supabase Migration Guide

## Migration File Manifest

| Order | File | Description |
| :---: | :--- | :--- |
| **Step 1** | `01_schema.sql` | Creates all 10 application tables with strict constraints, foreign keys, and defaults. |
| **Step 2** | `02_rls_policies.sql` | Enables and enforces Row Level Security (RLS) on all tables with tenant isolation. |
| **Step 3** | `03_indexes.sql` | Creates composite indexes matching actual query patterns for high-throughput reads. |
| **Step 4** | `04_storage.sql` | Provisions `resto-media` storage bucket and configures storage object RLS. |
| **Step 5** | `05_realtime.sql` | Configures `REPLICA IDENTITY FULL` and adds operational tables to `supabase_realtime`. |
| **Step 6** | `06_verification.sql` | Comprehensive audit queries verifying tables, constraints, policies, and indexes. |

---

## Execution Instructions (Supabase Web Console)

1. Open your Supabase Project: `https://supabase.com/dashboard/project/zmpthsiiouukjjyrbpnz`
2. Navigate to the **SQL Editor** in the left sidebar.
3. Open and run each script sequentially from **Step 1** to **Step 5**:
   - Paste the contents of `01_schema.sql` -> Click **Run**.
   - Paste the contents of `02_rls_policies.sql` -> Click **Run**.
   - Paste the contents of `03_indexes.sql` -> Click **Run**.
   - Paste the contents of `04_storage.sql` -> Click **Run**.
   - Paste the contents of `05_realtime.sql` -> Click **Run**.
4. Run `06_verification.sql` to confirm that all 10 tables, foreign keys, RLS policies, indexes, and publications are active.

