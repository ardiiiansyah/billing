-- Fix dashboard: authenticated role lacked table GRANTs and RLS policies
-- caused SELECT empty + INSERT 403. Run once in Supabase SQL Editor. Safe to re-run.

-- 1. GRANTs
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- anon: read-only, minimal (public /bayar page only)
GRANT SELECT ON public.tagihan TO anon;
GRANT SELECT ON public.pelanggan TO anon;
GRANT SELECT ON public.paket TO anon;

-- 2. Permissive RLS for logged-in admin dashboard
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['paket','wilayah','pelanggan','tagihan','pembayaran','pengeluaran','payment_attempts'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "dashboard_full_access" ON public.%I', t);
      EXECUTE format($f$CREATE POLICY "dashboard_full_access" ON public.%I
        FOR ALL TO authenticated USING (true) WITH CHECK (true)$f$, t);
    END IF;
  END LOOP;
END $$;

-- 3. anon read-only policies for public billing page
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['tagihan','pelanggan','paket'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_read" ON public.%I', t);
    EXECUTE format($f$CREATE POLICY "anon_read" ON public.%I
      FOR SELECT TO anon USING (true)$f$, t);
  END LOOP;
END $$;

-- Verify
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies WHERE schemaname='public' ORDER BY tablename, cmd;
