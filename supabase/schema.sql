-- ========================================================
-- SKEMA DATABASE APLIKASI TAGIHAN WIFI RT/RW (SULTAN WIFI)
-- ========================================================

-- 1. TABEL PAKET INTERNET
CREATE TABLE IF NOT EXISTS public.paket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_paket VARCHAR(100) NOT NULL,
    kecepatan VARCHAR(50) NOT NULL, -- contoh: '10 Mbps', '20 Mbps'
    harga NUMERIC(12, 2) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABEL PELANGGAN
CREATE TABLE IF NOT EXISTS public.pelanggan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_pelanggan VARCHAR(20) UNIQUE NOT NULL, -- contoh: 'WIFI-001'
    nama VARCHAR(150) NOT NULL,
    no_wa VARCHAR(20) NOT NULL,
    alamat TEXT NOT NULL,
    rt VARCHAR(10),
    rw VARCHAR(10),
    paket_id UUID REFERENCES public.paket(id) ON DELETE SET NULL,
    tanggal_jatuh_tempo INT DEFAULT 10, -- Tanggal 1-28 tiap bulan
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'isolir', 'nonaktif')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL TAGIHAN
CREATE TABLE IF NOT EXISTS public.tagihan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pelanggan_id UUID NOT NULL REFERENCES public.pelanggan(id) ON DELETE CASCADE,
    bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INT NOT NULL CHECK (tahun >= 2024),
    jumlah_tagihan NUMERIC(12, 2) NOT NULL,
    tanggal_jatuh_tempo DATE NOT NULL,
    status_pembayaran VARCHAR(20) DEFAULT 'belum_bayar' CHECK (status_pembayaran IN ('belum_bayar', 'lunas', 'sebagian', 'dibatalkan')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (pelanggan_id, bulan, tahun)
);

-- 4. TABEL PEMBAYARAN
CREATE TABLE IF NOT EXISTS public.pembayaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tagihan_id UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
    jumlah_bayar NUMERIC(12, 2) NOT NULL,
    metode_pembayaran VARCHAR(50) DEFAULT 'cash' CHECK (metode_pembayaran IN ('cash', 'transfer', 'qris', 'midtrans')),
    referensi_pembayaran VARCHAR(100),
    tanggal_bayar TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    diterima_oleh VARCHAR(100) DEFAULT 'Admin',
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABEL PENGELUARAN OPERASIONAL
CREATE TABLE IF NOT EXISTS public.pengeluaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori VARCHAR(100) NOT NULL, -- contoh: 'Listrik', 'Bandwidth', 'Perbaikan Alat'
    jumlah NUMERIC(12, 2) NOT NULL,
    keterangan TEXT,
    tanggal_pengeluaran DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- AUTOMATION & TRIGGERS
-- ========================================================

-- Trigger otomatis mengubah status tagihan menjadi 'lunas' jika total pembayaran memadai
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

CREATE OR REPLACE TRIGGER trigger_pembayaran_inserted
AFTER INSERT ON public.pembayaran
FOR EACH ROW EXECUTE FUNCTION check_tagihan_lunas();

-- Dynamic Function: Generate tagihan bulanan untuk seluruh pelanggan aktif
CREATE OR REPLACE FUNCTION generate_tagihan_bulanan(p_bulan INT, p_tahun INT)
RETURNS INT AS $$
DECLARE
    pel RECORD;
    count_generated INT := 0;
BEGIN
    FOR pel IN 
        SELECT p.id, p.paket_id, p.tanggal_jatuh_tempo, pkt.harga 
        FROM public.pelanggan p
        JOIN public.paket pkt ON p.paket_id = pkt.id
        WHERE p.status = 'aktif'
    LOOP
        INSERT INTO public.tagihan (pelanggan_id, bulan, tahun, jumlah_tagihan, tanggal_jatuh_tempo, status_pembayaran)
        VALUES (
            pel.id, 
            p_bulan, 
            p_tahun, 
            pel.harga, 
            MAKE_DATE(p_tahun, p_bulan, LEAST(pel.tanggal_jatuh_tempo, 28)), 
            'belum_bayar'
        )
        ON CONFLICT (pelanggan_id, bulan, tahun) DO NOTHING;
        
        count_generated := count_generated + 1;
    END LOOP;

    RETURN count_generated;
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- INITIAL SEED DATA (DUMMY DATA)
-- ========================================================

INSERT INTO public.paket (nama_paket, kecepatan, harga, deskripsi) VALUES
('Hemat 10M', '10 Mbps', 100000, 'Paket internet ekonomis untuk rumah tangga 1-3 perangkat'),
('Reguler 20M', '20 Mbps', 150000, 'Paket internet standar keluarga 3-5 perangkat'),
('Super 50M', '50 Mbps', 250000, 'Paket internet cepat untuk usaha / streaming 4K');
