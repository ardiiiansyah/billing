-- Add missing `odp` column used by the dashboard pelanggan form/filter.
-- Run once in Supabase SQL Editor. Safe to re-run.
ALTER TABLE public.pelanggan ADD COLUMN IF NOT EXISTS odp VARCHAR(50);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='pelanggan'
ORDER BY ordinal_position;
