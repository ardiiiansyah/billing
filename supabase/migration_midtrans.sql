-- ========================================================
-- MIGRATION: Tambah kolom Midtrans ke tabel tagihan
-- Jalankan di Supabase SQL Editor
-- ========================================================

-- Tambah kolom midtrans_order_id dan payment_url ke tabel tagihan
ALTER TABLE public.tagihan 
  ADD COLUMN IF NOT EXISTS midtrans_order_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_url TEXT;

-- Index untuk pencarian cepat berdasarkan order_id (dipakai webhook)
CREATE INDEX IF NOT EXISTS idx_tagihan_midtrans_order_id 
  ON public.tagihan(midtrans_order_id);
