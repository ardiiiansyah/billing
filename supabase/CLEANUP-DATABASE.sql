-- ========================================================
-- DATABASE CLEANUP SCRIPT
-- ========================================================
-- Purpose: Drop all existing tables, functions, and policies
-- Use this BEFORE running COMPLETE-DATABASE-REBUILD.sql
-- 
-- INSTRUCTIONS:
-- 1. Run this script FIRST if you have existing tables
-- 2. Then run COMPLETE-DATABASE-REBUILD.sql
-- 
-- WARNING: This will DELETE ALL DATA!
-- Make sure you have backup if needed!
-- ========================================================

-- Check what exists first
DO $$
DECLARE
    table_count INT;
    function_count INT;
BEGIN
    SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO function_count FROM information_schema.routines WHERE routine_schema = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CURRENT DATABASE STATUS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables found: %', table_count;
    RAISE NOTICE 'Functions found: %', function_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Proceeding with cleanup...';
    RAISE NOTICE '========================================';
END $$;

-- ========================================================
-- STEP 1: Drop all policies (must be done before tables)
-- ========================================================

DROP POLICY IF EXISTS "Admin full access to paket" ON public.paket;
DROP POLICY IF EXISTS "Public can view active paket" ON public.paket;
DROP POLICY IF EXISTS "Admin full access to wilayah" ON public.wilayah;
DROP POLICY IF EXISTS "Admin full access to pelanggan" ON public.pelanggan;
DROP POLICY IF EXISTS "Admin full access to tagihan" ON public.tagihan;
DROP POLICY IF EXISTS "Admin full access to pembayaran" ON public.pembayaran;
DROP POLICY IF EXISTS "Admin full access to payment_attempts" ON public.payment_attempts;
DROP POLICY IF EXISTS "Admin full access to payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "Admin full access to pengeluaran" ON public.pengeluaran;
DROP POLICY IF EXISTS "Admin full access to log_notifikasi" ON public.log_notifikasi;

-- ========================================================
-- STEP 2: Drop all triggers
-- ========================================================

DROP TRIGGER IF EXISTS trigger_pembayaran_inserted ON public.pembayaran;

-- ========================================================
-- STEP 3: Drop all functions
-- ========================================================

DROP FUNCTION IF EXISTS check_tagihan_lunas() CASCADE;
DROP FUNCTION IF EXISTS generate_tagihan_bulanan(INT, INT) CASCADE;
DROP FUNCTION IF EXISTS generate_tagihan_harian_skema_b(INT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS process_gateway_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS mark_overdue_tagihan(DATE) CASCADE;

-- ========================================================
-- STEP 4: Drop all views
-- ========================================================

DROP VIEW IF EXISTS public.vw_statistik_wilayah CASCADE;
DROP VIEW IF EXISTS public.vw_detail_wilayah CASCADE;

-- ========================================================
-- STEP 5: Drop all tables (with CASCADE to handle dependencies)
-- ========================================================

DROP TABLE IF EXISTS public.log_notifikasi CASCADE;
DROP TABLE IF EXISTS public.payment_events CASCADE;
DROP TABLE IF EXISTS public.payment_attempts CASCADE;
DROP TABLE IF EXISTS public.pembayaran CASCADE;
DROP TABLE IF EXISTS public.pengeluaran CASCADE;
DROP TABLE IF EXISTS public.tagihan CASCADE;
DROP TABLE IF EXISTS public.pelanggan CASCADE;
DROP TABLE IF EXISTS public.wilayah CASCADE;
DROP TABLE IF EXISTS public.paket CASCADE;

-- ========================================================
-- VERIFICATION: Check if everything is cleaned
-- ========================================================

DO $$
DECLARE
    table_count INT;
    function_count INT;
    policy_count INT;
BEGIN
    SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO function_count FROM information_schema.routines WHERE routine_schema = 'public';
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CLEANUP COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining tables: %', table_count;
    RAISE NOTICE 'Remaining functions: %', function_count;
    RAISE NOTICE 'Remaining policies: %', policy_count;
    RAISE NOTICE '';
    
    IF table_count = 0 AND function_count = 0 AND policy_count = 0 THEN
        RAISE NOTICE '✅ Database is now CLEAN and ready for rebuild!';
        RAISE NOTICE '';
        RAISE NOTICE 'NEXT STEP:';
        RAISE NOTICE '→ Run COMPLETE-DATABASE-REBUILD.sql';
    ELSE
        RAISE WARNING '⚠️  Some objects still remain. Check manually.';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;
