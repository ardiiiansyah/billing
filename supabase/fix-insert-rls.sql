-- Fix RLS policies for admin INSERT operations
-- Run this in Supabase SQL Editor

-- 1. Enable admin to INSERT paket
DROP POLICY IF EXISTS "Admin can insert paket" ON paket;
CREATE POLICY "Admin can insert paket" ON paket
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        SELECT email FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'admin'
        OR email LIKE '%admin%'
      )
    )
  );

-- 2. Enable admin to INSERT wilayah
DROP POLICY IF EXISTS "Admin can insert wilayah" ON wilayah;
CREATE POLICY "Admin can insert wilayah" ON wilayah
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        SELECT email FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'admin'
        OR email LIKE '%admin%'
      )
    )
  );

-- 3. Enable admin to INSERT pelanggan
DROP POLICY IF EXISTS "Admin can insert pelanggan" ON pelanggan;
CREATE POLICY "Admin can insert pelanggan" ON pelanggan
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        SELECT email FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'admin'
        OR email LIKE '%admin%'
      )
    )
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('paket', 'wilayah', 'pelanggan')
ORDER BY tablename, cmd;
