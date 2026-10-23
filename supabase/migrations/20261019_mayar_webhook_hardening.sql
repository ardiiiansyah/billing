-- Keep webhook evidence and enforce provider event idempotency.
ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'mayar',
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'RECEIVED',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_id_idx
  ON public.payment_events (provider, event_id);

CREATE INDEX IF NOT EXISTS payment_events_tagihan_received_idx
  ON public.payment_events (tagihan_id, received_at DESC);
