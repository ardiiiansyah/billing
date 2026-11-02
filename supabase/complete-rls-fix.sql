-- COMPLETE RLS FIX: Allow INSERT for authenticated users
-- Run this in Supabase SQL Editor
-- This fixes: paket, wilayah, pelanggan, tagihan

BEGIN;

-- 1. PAKET table
DROP POLICY IF EXISTS "Admin can insert paket" ON paket;
DROP POLICY IF EXISTS "Authenticated users can insert paket" ON paket;
CREATE POLICY "Authenticated users can insert paket" ON paket
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update paket" ON paket;
CREATE POLICY "Admin can update paket" ON paket
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. WILAYAH table
DROP POLICY IF EXISTS "Admin can insert wilayah" ON wilayah;
DROP POLICY IF EXISTS "Authenticated users can insert wilayah" ON wilayah;
CREATE POLICY "Authenticated users can insert wilayah" ON wilayah
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update wilayah" ON wilayah;
CREATE POLICY "Admin can update wilayah" ON wilayah
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. PELANGGAN table
DROP POLICY IF EXISTS "Admin can insert pelanggan" ON pelanggan;
DROP POLICY IF EXISTS "Authenticated users can insert pelanggan" ON pelanggan;
CREATE POLICY "Authenticated users can insert pelanggan" ON pelanggan
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update pelanggan" ON pelanggan;
CREATE POLICY "Admin can update pelanggan" ON pelanggan
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. TAGIHAN table (bonus, untuk nanti)
DROP POLICY IF EXISTS "Admin can insert tagihan" ON tagihan;
DROP POLICY IF EXISTS "Authenticated users can insert tagihan" ON tagihan;
CREATE POLICY "Authenticated users can insert tagihan" ON tagihan
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update tagihan" ON tagihan;
CREATE POLICY "Admin can update tagihan" ON tagihan
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;

-- Verify all policies
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'with_check'
    WHEN cmd = 'UPDATE' THEN 'using + with_check'
    ELSE 'other'
  END as check_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('paket', 'wilayah', 'pelanggan', 'tagihan')
  AND cmd IN ('INSERT', 'UPDATE')
ORDER BY tablename, cmd;
