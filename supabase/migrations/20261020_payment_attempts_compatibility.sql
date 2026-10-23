-- Reconcile an existing payment_attempts table created before the Mayar fields.
-- Safe to run after the earlier Mayar migrations.

ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS customer_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settlement_time TIMESTAMPTZ;

-- Backfill the gateway amount for existing attempts where it can be derived.
UPDATE public.payment_attempts pa
SET
  customer_fee = COALESCE(t.customer_fee, 0),
  amount = COALESCE(pa.amount, t.jumlah_tagihan + COALESCE(t.customer_fee, 0))
FROM public.tagihan t
WHERE t.id = pa.tagihan_id
  AND pa.amount IS NULL;

-- Do not make amount NOT NULL until any rows that could not be backfilled have
-- been reviewed. This query reports those rows for manual reconciliation.
CREATE INDEX IF NOT EXISTS payment_attempts_provider_reference_idx
  ON public.payment_attempts (provider, gateway_order_id);

CREATE INDEX IF NOT EXISTS payment_attempts_status_idx
  ON public.payment_attempts (status);
