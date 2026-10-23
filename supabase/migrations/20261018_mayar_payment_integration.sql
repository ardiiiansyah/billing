-- Mayar payment integration schema.
-- Apply after supabase/schema.sql and before the payment webhook is enabled.

ALTER TABLE public.tagihan
  ADD COLUMN IF NOT EXISTS customer_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_provider TEXT;

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tagihan_id UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  gateway_order_id TEXT NOT NULL,
  payment_url TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  customer_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  settlement_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_attempts_amount_positive CHECK (amount > 0),
  CONSTRAINT payment_attempts_provider_reference_unique UNIQUE (provider, gateway_order_id)
);

CREATE INDEX IF NOT EXISTS payment_attempts_tagihan_created_idx
  ON public.payment_attempts (tagihan_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_one_pending_per_invoice_idx
  ON public.payment_attempts (tagihan_id)
  WHERE provider = 'mayar' AND status IN ('PENDING', 'OPEN');

-- The service role is used by the server routes; do not expose this table to clients.
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attempts FROM anon, authenticated;
GRANT ALL ON public.payment_attempts TO service_role;
