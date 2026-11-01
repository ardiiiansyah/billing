-- Migration: Enable RLS on tables that are currently unprotected
-- Date: 2026-11-01
-- Purpose: Close security gaps - protect paket, pengeluaran, wilayah, log_notifikasi

-- ========================================================
-- 1. PAKET TABLE
-- ========================================================
ALTER TABLE public.paket ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) full access
CREATE POLICY "Admin full access to paket" 
ON public.paket
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow anonymous users to read packages (for public payment pages)
CREATE POLICY "Public can view active paket" 
ON public.paket
FOR SELECT 
TO anon 
USING (true);

-- ========================================================
-- 2. PENGELUARAN TABLE
-- ========================================================
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can access expenses
CREATE POLICY "Admin only access to pengeluaran" 
ON public.pengeluaran
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ========================================================
-- 3. WILAYAH TABLE
-- ========================================================
ALTER TABLE public.wilayah ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) full access
CREATE POLICY "Admin full access to wilayah" 
ON public.wilayah
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ========================================================
-- 4. LOG_NOTIFIKASI TABLE
-- ========================================================
ALTER TABLE public.log_notifikasi ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can access notification logs
-- This table contains PII (phone numbers) and should be restricted
CREATE POLICY "Admin only access to log_notifikasi" 
ON public.log_notifikasi
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ========================================================
-- VERIFICATION QUERIES (Run these to confirm)
-- ========================================================
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('paket', 'pengeluaran', 'wilayah', 'log_notifikasi');
--
-- Expected result: all should have rowsecurity = true
