-- Atomically apply a verified Mayar payment callback.
-- Apply in Supabase SQL Editor before deploying the webhook.
-- Duplicate event_id values return already_processed=true without mutating data.

CREATE TABLE IF NOT EXISTS public.payment_events (
    event_id TEXT PRIMARY KEY,
    tagihan_id UUID NOT NULL REFERENCES public.tagihan(id) ON DELETE CASCADE,
    gateway_order_id TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    IF p_event_id IS NULL OR p_reference IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid payment event';
    END IF;

    INSERT INTO public.payment_events (event_id, tagihan_id, gateway_order_id)
    VALUES (p_event_id, p_tagihan_id, p_reference)
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

    IF p_amount <> v_tagihan.jumlah_tagihan + COALESCE(v_tagihan.customer_fee, 0) THEN
        RAISE EXCEPTION 'Nominal pembayaran tidak sesuai tagihan';
    END IF;

    SELECT * INTO v_attempt
    FROM public.payment_attempts
    WHERE tagihan_id = p_tagihan_id
      AND gateway_order_id = p_reference
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment attempt tidak ditemukan';
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

    UPDATE public.tagihan
    SET status_pembayaran = 'lunas',
        gateway_order_id = p_reference,
        gateway_provider = 'mayar'
    WHERE id = p_tagihan_id;

    RETURN jsonb_build_object('already_processed', false, 'tagihan_id', p_tagihan_id);
END;
$$;

REVOKE ALL ON FUNCTION public.process_gateway_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_gateway_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ) TO service_role;
