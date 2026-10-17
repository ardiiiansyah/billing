-- Beatnet Supabase RLS migration
-- Purpose: protect operational tables from anonymous and non-admin access.
-- Apply this script once in the Supabase SQL Editor or with the Supabase CLI.
-- Required JWT configuration: admin users must have app_metadata.role set to
-- one of: admin, owner, or operator. Do not use user_metadata for authorization.

BEGIN;

-- Enable RLS on tables that contain operational and financial data.
ALTER TABLE IF EXISTS public.paket ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.log_notifikasi ENABLE ROW LEVEL SECURITY;

-- Remove old policies so this migration is safe to re-run.
DROP POLICY IF EXISTS "Admin only access to paket" ON public.paket;
DROP POLICY IF EXISTS "Admin only access to pengeluaran" ON public.pengeluaran;
DROP POLICY IF EXISTS "Admin only access to log_notifikasi" ON public.log_notifikasi;

-- The service_role key bypasses RLS for trusted server-side jobs.
-- Client-side authenticated users are restricted to admin roles only.
CREATE POLICY "Admin only access to paket"
    ON public.paket
    FOR ALL
    TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'operator'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'operator'));

CREATE POLICY "Admin only access to pengeluaran"
    ON public.pengeluaran
    FOR ALL
    TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'operator'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'operator'));

CREATE POLICY "Admin only access to log_notifikasi"
    ON public.log_notifikasi
    FOR ALL
    TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'operator'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'owner', 'operator'));

COMMIT;

-- Verification query (run separately if desired):
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('paket', 'pengeluaran', 'log_notifikasi');
