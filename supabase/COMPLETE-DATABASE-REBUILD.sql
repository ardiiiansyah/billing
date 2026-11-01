-- ========================================================
-- BEATNET BILLING SYSTEM - COMPLETE DATABASE SCHEMA
-- ========================================================
-- Version: 1.0.0 (Security Hardened)
-- Date: November 1, 2026
-- Purpose: Complete database rebuild from scratch
-- 
-- This script combines:
-- - Initial schema (schema.sql)
-- - All migrations (20261017-20261101)
-- - RLS policies
-- - Stored procedures
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. Copy-paste this ENTIRE file
-- 3. Execute all at once
-- ========================================================

-- ========================================================
-- PART 1: CORE TABLES
-- ========================================================

-- 1. TABEL PAKET INTERNET
CREATE TABLE IF NOT EXISTS public.paket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_paket VARCHAR(100) NOT NULL,
    kecepatan VARCHAR(50) NOT NULL,
    harga NUMERIC(12, 2) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABEL WILAYAH
CREATE TABLE IF NOT EXISTS public.wilayah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rt VARCHAR(10) NOT NULL,
    rw VARCHAR(10) NOT NULL,
    nama VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL PELANGGAN
CREATE TABLE IF NOT EXISTS public.pelanggan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_pelanggan VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(150) NOT NULL,
    no_wa VARCHAR(20) NOT NULL,
    alamat TEXT NOT NULL,
    rt VARCHAR(10),
    rw VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    paket_id UUID REFERENCES public.paket(id) ON DELETE SET NULL,
    wilayah_id UUID REFERENCES public.wilayah(id) ON DELETE SET NULL,
    tanggal_jatuh_tempo INT DEFAULT 10 CHECK (tanggal_jatuh_tempo BETWEEN 1 AND 28),
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'isolir', 'nonaktif')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABEL TAGIHAN
CREATE TABLE IF NOT EXISTS public.tagihan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pelanggan_id UUID NOT NULL REFERENCES public.pelanggan(id) ON DELETE CASCADE,
    bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INT NOT NULL CHECK (tahun >= 2024),
    jumlah_tagihan NUMERIC(12, 2) NOT NULL,
    tanggal_jatuh_tempo DATE NOT NULL,
    status_pembayaran VARCHAR(20) DEFAULT 'belum_bayar' 
        CHECK (status_pembayaran IN ('belum_bayar', 'lunas', 'sebagian', 'dibatalkan', 'UNPAID', 'PAID', 'OVERDUE')),
    payment_url TEXT,
    gateway_order_id TEXT,
    gateway_provider VARCHAR(50),
    customer_fee NUMERIC(12, 2),
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (pelanggan_id, bulan, tahun)
);

-- 5. TABEL PEMBAYARAN (Legacy - for cash payments)
CREATE TABLE IF NOT EXISTS public.pembayaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tagihan_id UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
    jumlah_bayar NUMERIC(12, 2) NOT NULL,
    metode_pembayaran VARCHAR(50) DEFAULT 'cash' 
        CHECK (metode_pembayaran IN ('cash', 'transfer', 'qris', 'midtrans', 'mayar')),
    referensi_pembayaran VARCHAR(100),
    tanggal_bayar TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    diterima_oleh VARCHAR(100) DEFAULT 'Admin',
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABEL PAYMENT ATTEMPTS (Mayar Integration)
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tagihan_id UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'mayar',
    gateway_order_id TEXT NOT NULL,
    payment_url TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    customer_fee NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING',
    settlement_time TIMESTAMP WITH TIME ZONE,
    payment_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABEL PAYMENT EVENTS (Webhook Deduplication)
CREATE TABLE IF NOT EXISTS public.payment_events (
    event_id TEXT PRIMARY KEY,
    tagihan_id UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
    gateway_order_id TEXT NOT NULL,
    provider TEXT DEFAULT 'mayar',
    payload JSONB,
    status TEXT DEFAULT 'RECEIVED',
    rejection_reason TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABEL PENGELUARAN OPERASIONAL
CREATE TABLE IF NOT EXISTS public.pengeluaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori VARCHAR(100) NOT NULL,
    jumlah NUMERIC(12, 2) NOT NULL,
    keterangan TEXT,
    tanggal_pengeluaran DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABEL LOG NOTIFIKASI
CREATE TABLE IF NOT EXISTS public.log_notifikasi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tagihan_id UUID REFERENCES public.tagihan(id) ON DELETE SET NULL,
    pelanggan_id UUID REFERENCES public.pelanggan(id) ON DELETE SET NULL,
    no_wa VARCHAR(50) NOT NULL,
    jenis_pesan VARCHAR(50) NOT NULL,
    pesan TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent',
    attempt_count INT DEFAULT 1,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- PART 2: INDEXES FOR PERFORMANCE
-- ========================================================

-- Pelanggan indexes
CREATE INDEX IF NOT EXISTS idx_pelanggan_status ON public.pelanggan(status);
CREATE INDEX IF NOT EXISTS idx_pelanggan_paket ON public.pelanggan(paket_id);
CREATE INDEX IF NOT EXISTS idx_pelanggan_wilayah ON public.pelanggan(wilayah_id);
CREATE INDEX IF NOT EXISTS idx_pelanggan_tanggal_jatuh_tempo ON public.pelanggan(tanggal_jatuh_tempo) WHERE status = 'aktif';

-- Tagihan indexes
CREATE INDEX IF NOT EXISTS idx_tagihan_pelanggan ON public.tagihan(pelanggan_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_status ON public.tagihan(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_tagihan_bulan_tahun ON public.tagihan(bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_tagihan_jatuh_tempo ON public.tagihan(tanggal_jatuh_tempo);

-- Payment attempts indexes
CREATE INDEX IF NOT EXISTS idx_payment_attempts_tagihan ON public.payment_attempts(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON public.payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_gateway ON public.payment_attempts(gateway_order_id);

-- Payment events unique index (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_id_idx 
    ON public.payment_events (provider, event_id);

-- Log notifikasi indexes
CREATE INDEX IF NOT EXISTS idx_log_notif_tagihan ON public.log_notifikasi(tagihan_id);
CREATE INDEX IF NOT EXISTS idx_log_notif_pelanggan ON public.log_notifikasi(pelanggan_id);
CREATE INDEX IF NOT EXISTS idx_log_notif_status ON public.log_notifikasi(status);
CREATE INDEX IF NOT EXISTS idx_log_notif_created ON public.log_notifikasi(created_at DESC);

-- Partial index for notifications requiring retry
CREATE INDEX IF NOT EXISTS idx_log_notif_pending 
    ON public.log_notifikasi(tagihan_id, created_at) 
    WHERE status IN ('queued', 'failed');

-- ========================================================
-- PART 3: TRIGGERS & AUTOMATION
-- ========================================================

-- Trigger: Auto-update tagihan status when payment received
CREATE OR REPLACE FUNCTION check_tagihan_lunas()
RETURNS TRIGGER AS $$
DECLARE
    total_bayar NUMERIC(12, 2);
    target_tagihan NUMERIC(12, 2);
BEGIN
    SELECT COALESCE(SUM(jumlah_bayar), 0) INTO total_bayar 
    FROM public.pembayaran 
    WHERE tagihan_id = NEW.tagihan_id;

    SELECT jumlah_tagihan INTO target_tagihan 
    FROM public.tagihan 
    WHERE id = NEW.tagihan_id;

    IF total_bayar >= target_tagihan THEN
        UPDATE public.tagihan 
        SET status_pembayaran = 'lunas' 
        WHERE id = NEW.tagihan_id;
    ELSIF total_bayar > 0 THEN
        UPDATE public.tagihan 
        SET status_pembayaran = 'sebagian' 
        WHERE id = NEW.tagihan_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pembayaran_inserted ON public.pembayaran;
CREATE TRIGGER trigger_pembayaran_inserted
AFTER INSERT ON public.pembayaran
FOR EACH ROW EXECUTE FUNCTION check_tagihan_lunas();

-- ========================================================
-- PART 4: STORED PROCEDURES (RPC Functions)
-- ========================================================

-- RPC: Generate tagihan harian (Skema B - Anniversary)
CREATE OR REPLACE FUNCTION generate_tagihan_harian_skema_b(
    p_tanggal_hari_ini INT,
    p_bulan INT,
    p_tahun INT
)
RETURNS INT AS $$
DECLARE
    pel RECORD;
    count_generated INT := 0;
    tanggal_jatuh_tempo DATE;
BEGIN
    FOR pel IN 
        SELECT 
            p.id, 
            p.paket_id, 
            p.tanggal_jatuh_tempo, 
            pkt.harga 
        FROM public.pelanggan p
        JOIN public.paket pkt ON p.paket_id = pkt.id
        WHERE p.status = 'aktif'
          AND p.tanggal_jatuh_tempo = p_tanggal_hari_ini
    LOOP
        -- Calculate due date (billing_date + 3 days)
        tanggal_jatuh_tempo := MAKE_DATE(p_tahun, p_bulan, p_tanggal_hari_ini) + INTERVAL '3 days';
        
        INSERT INTO public.tagihan (
            pelanggan_id, 
            bulan, 
            tahun, 
            jumlah_tagihan, 
            tanggal_jatuh_tempo, 
            status_pembayaran
        )
        VALUES (
            pel.id, 
            p_bulan, 
            p_tahun, 
            pel.harga, 
            tanggal_jatuh_tempo, 
            'belum_bayar'
        )
        ON CONFLICT (pelanggan_id, bulan, tahun) DO NOTHING;
        
        IF FOUND THEN
            count_generated := count_generated + 1;
        END IF;
    END LOOP;

    RETURN count_generated;
END;
$$ LANGUAGE plpgsql;

-- RPC: Process gateway payment (Webhook handler)
CREATE OR REPLACE FUNCTION public.process_gateway_payment(
    p_tagihan_id UUID,
    p_event_id TEXT,
    p_reference TEXT,
    p_amount NUMERIC,
    p_method TEXT,
    p_paid_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt public.payment_attempts%ROWTYPE;
    v_tagihan public.tagihan%ROWTYPE;
    v_event_rows INTEGER;
BEGIN
    -- Validate inputs
    IF p_event_id IS NULL OR p_reference IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid payment event parameters';
    END IF;

    -- Insert event (idempotency via unique constraint)
    INSERT INTO public.payment_events (event_id, tagihan_id, gateway_order_id)
    VALUES (p_event_id, p_tagihan_id, p_reference)
    ON CONFLICT (event_id) DO NOTHING;
    GET DIAGNOSTICS v_event_rows = ROW_COUNT;

    -- If duplicate event, return early
    IF v_event_rows = 0 THEN
        RETURN jsonb_build_object('already_processed', true);
    END IF;

    -- Lock invoice row
    SELECT * INTO v_tagihan
    FROM public.tagihan
    WHERE id = p_tagihan_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tagihan not found: %', p_tagihan_id;
    END IF;

    -- Verify amount matches (invoice amount + customer fee)
    IF p_amount <> v_tagihan.jumlah_tagihan + COALESCE(v_tagihan.customer_fee, 0) THEN
        RAISE EXCEPTION 'Payment amount mismatch. Expected: %, Got: %', 
            v_tagihan.jumlah_tagihan + COALESCE(v_tagihan.customer_fee, 0), 
            p_amount;
    END IF;

    -- Find payment attempt
    SELECT * INTO v_attempt
    FROM public.payment_attempts
    WHERE tagihan_id = p_tagihan_id
      AND gateway_order_id = p_reference
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment attempt not found for reference: %', p_reference;
    END IF;

    -- Update payment attempt status
    UPDATE public.payment_attempts
    SET status = 'PAID',
        settlement_time = COALESCE(p_paid_at, NOW()),
        payment_metadata = COALESCE(payment_metadata, '{}'::jsonb) || jsonb_build_object(
            'event_id', p_event_id,
            'payment_method', p_method,
            'paid_amount', p_amount
        )
    WHERE id = v_attempt.id;

    -- Update invoice status
    UPDATE public.tagihan
    SET status_pembayaran = 'lunas',
        gateway_order_id = p_reference,
        gateway_provider = 'mayar'
    WHERE id = p_tagihan_id;

    RETURN jsonb_build_object(
        'already_processed', false, 
        'tagihan_id', p_tagihan_id,
        'amount', p_amount
    );
END;
$$;

-- RPC: Mark overdue tagihan
CREATE OR REPLACE FUNCTION mark_overdue_tagihan(p_business_date DATE)
RETURNS INT AS $$
DECLARE
    rows_updated INT;
BEGIN
    UPDATE public.tagihan
    SET status_pembayaran = 'OVERDUE'
    WHERE status_pembayaran IN ('belum_bayar', 'UNPAID')
      AND tanggal_jatuh_tempo < p_business_date;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- ========================================================

-- Enable RLS on all tables
ALTER TABLE public.paket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wilayah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pelanggan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_notifikasi ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin full access
CREATE POLICY "Admin full access to paket" ON public.paket
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to wilayah" ON public.wilayah
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to pelanggan" ON public.pelanggan
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to tagihan" ON public.tagihan
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to pembayaran" ON public.pembayaran
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to payment_attempts" ON public.payment_attempts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to payment_events" ON public.payment_events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to pengeluaran" ON public.pengeluaran
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access to log_notifikasi" ON public.log_notifikasi
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read access for paket (for public payment pages)
CREATE POLICY "Public can view active paket" ON public.paket
    FOR SELECT TO anon USING (true);

-- Grant execute permissions on RPC functions
REVOKE ALL ON FUNCTION public.process_gateway_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_gateway_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION generate_tagihan_harian_skema_b(INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_tagihan_harian_skema_b(INT, INT, INT) TO service_role;

REVOKE ALL ON FUNCTION mark_overdue_tagihan(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_overdue_tagihan(DATE) TO service_role;

-- ========================================================
-- PART 6: VIEWS (Optional but useful)
-- ========================================================

-- View: Statistik wilayah
CREATE OR REPLACE VIEW public.vw_statistik_wilayah AS
SELECT 
    w.id AS wilayah_id,
    w.rt,
    w.rw,
    w.nama,
    COALESCE(COUNT(p.id), 0) AS total_pelanggan,
    COALESCE(SUM(CASE WHEN p.status = 'aktif' THEN 1 ELSE 0 END), 0) AS total_pelanggan_aktif,
    COALESCE(SUM(CASE WHEN p.status = 'aktif' THEN pkt.harga ELSE 0 END), 0) AS potensi_pendapatan
FROM public.wilayah w
LEFT JOIN public.pelanggan p ON p.wilayah_id = w.id
LEFT JOIN public.paket pkt ON p.paket_id = pkt.id
GROUP BY w.id, w.rt, w.rw, w.nama;

-- ========================================================
-- PART 7: SEED DATA (Initial data for testing)
-- ========================================================

-- Insert default packages
INSERT INTO public.paket (nama_paket, kecepatan, harga, deskripsi) VALUES
('Hemat 10M', '10 Mbps', 100000, 'Paket internet ekonomis untuk rumah tangga 1-3 perangkat'),
('Reguler 20M', '20 Mbps', 150000, 'Paket internet standar keluarga 3-5 perangkat'),
('Super 50M', '50 Mbps', 250000, 'Paket internet cepat untuk usaha / streaming 4K')
ON CONFLICT DO NOTHING;

-- ========================================================
-- VERIFICATION QUERIES
-- ========================================================

-- Run these after executing the script to verify:

-- Check all tables exist
SELECT 
    schemaname, 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check stored procedures
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
      'generate_tagihan_harian_skema_b',
      'process_gateway_payment',
      'mark_overdue_tagihan'
  );

-- Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check initial data
SELECT 'Paket count:' as check_name, COUNT(*)::text as result FROM public.paket
UNION ALL
SELECT 'Tables with RLS:', COUNT(DISTINCT tablename)::text FROM pg_policies WHERE schemaname = 'public';

-- ========================================================
-- SUCCESS MESSAGE
-- ========================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE REBUILD COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: 9';
    RAISE NOTICE 'RLS policies: 10';
    RAISE NOTICE 'Stored procedures: 3';
    RAISE NOTICE 'Initial packages: 3';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify tables and RLS using queries above';
    RAISE NOTICE '2. Create your first admin user in Supabase Auth';
    RAISE NOTICE '3. Start adding customers via dashboard';
    RAISE NOTICE '========================================';
END $$;
