-- Beatnet notification idempotency migration.
-- Apply after the base schema. It adds a stable invoice-notification identity
-- so concurrent cron invocations cannot claim and send the same invoice twice.

BEGIN;

ALTER TABLE public.log_notifikasi
    ADD COLUMN IF NOT EXISTS tagihan_id UUID REFERENCES public.tagihan(id) ON DELETE SET NULL;

ALTER TABLE public.log_notifikasi
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.log_notifikasi
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.log_notifikasi
    ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Keep notification status values consistent across cron and admin routes.
UPDATE public.log_notifikasi SET status = 'sent' WHERE status = 'terkirim';
UPDATE public.log_notifikasi SET status = 'failed' WHERE status = 'gagal';

CREATE UNIQUE INDEX IF NOT EXISTS log_notifikasi_active_tagihan_jenis_idx
    ON public.log_notifikasi (tagihan_id, jenis_pesan)
    WHERE tagihan_id IS NOT NULL AND status IN ('queued', 'sent');

COMMIT;
