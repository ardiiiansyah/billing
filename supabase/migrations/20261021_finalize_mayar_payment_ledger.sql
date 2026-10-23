-- Finalize Mayar payments in the existing public.pembayaran ledger.
-- This is a corrective migration for databases where earlier Mayar migrations
-- have already been applied.

ALTER TABLE public.pembayaran
  DROP CONSTRAINT IF EXISTS pembayaran_metode_pembayaran_check;

ALTER TABLE public.pembayaran
  ADD CONSTRAINT pembayaran_metode_pembayaran_check
  CHECK (metode_pembayaran IN ('cash', 'transfer', 'qris', 'midtrans', 'mayar'));

CREATE UNIQUE INDEX IF NOT EXISTS pembayaran_gateway_reference_unique
  ON public.pembayaran (tagihan_id, referensi_pembayaran)
  WHERE referensi_pembayaran IS NOT NULL;

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
    v_payment_method TEXT := 'mayar';
BEGIN
    IF p_event_id IS NULL OR p_reference IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid payment event';
    END IF;

    INSERT INTO public.payment_events (event_id, tagihan_id, gateway_order_id, provider, status)
    VALUES (p_event_id, p_tagihan_id, p_reference, 'mayar', 'RECEIVED')
    ON CONFLICT (event_id) DO NOTHING;
    GET DIAGNOSTICS v_event_rows = ROW_COUNT;

    IF v_event_rows = 0 THEN
        RETURN jsonb_build_object('already_processed', true);
    END IF;

    SELECT * INTO v_tagihan
    FROM public.tagihan
    WHERE id = p_tagihan_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tagihan tidak ditemukan';
    END IF;

    SELECT * INTO v_attempt
    FROM public.payment_attempts
    WHERE tagihan_id = p_tagihan_id
      AND provider = 'mayar'
      AND gateway_order_id = p_reference
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment attempt tidak ditemukan';
    END IF;

    IF v_attempt.amount IS NULL OR p_amount <> v_attempt.amount THEN
        RAISE EXCEPTION 'Nominal pembayaran tidak sesuai payment attempt';
    END IF;

    IF v_attempt.status = 'PAID' THEN
        UPDATE public.payment_events
        SET status = 'PROCESSED'
        WHERE event_id = p_event_id;
        RETURN jsonb_build_object('already_processed', true, 'tagihan_id', p_tagihan_id);
    END IF;

    UPDATE public.payment_attempts
    SET status = 'PAID',
        settlement_time = COALESCE(p_paid_at, NOW()),
        payment_metadata = COALESCE(payment_metadata, '{}'::jsonb) || jsonb_build_object(
            'event_id', p_event_id,
            'payment_method', p_method,
            'paid_amount', p_amount
        )
    WHERE id = v_attempt.id;

    INSERT INTO public.pembayaran (
        tagihan_id, jumlah_bayar, metode_pembayaran,
        referensi_pembayaran, tanggal_bayar, diterima_oleh, catatan
    ) VALUES (
        p_tagihan_id,
        v_tagihan.jumlah_tagihan,
        v_payment_method,
        p_reference,
        COALESCE(p_paid_at, NOW()),
        'Mayar',
        'Pembayaran gateway Mayar; event ' || p_event_id
    )
    ON CONFLICT (tagihan_id, referensi_pembayaran) DO NOTHING;

    UPDATE public.tagihan
    SET status_pembayaran = 'lunas',
        gateway_order_id = p_reference,
        gateway_provider = 'mayar'
    WHERE id = p_tagihan_id;

    UPDATE public.payment_events
    SET status = 'PROCESSED'
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object('already_processed', false, 'tagihan_id', p_tagihan_id);
END;
$$;

REVOKE ALL ON FUNCTION public.process_gateway_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_gateway_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) TO service_role;
