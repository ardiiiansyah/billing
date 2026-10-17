import crypto from 'node:crypto'

const DEFAULT_BASE_URL = 'https://api.mayar.id/hl/v2'
const PAYMENT_REQUEST_PATH = '/payment/request/single'
const REQUEST_TIMEOUT_MS = 10_000

function getConfig() {
    const apiKey = process.env.MAYAR_API_KEY
    if (!apiKey) {
        throw new Error('MAYAR_API_KEY belum dikonfigurasi')
    }

    return {
        apiKey,
        baseUrl: (process.env.MAYAR_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    }
}

function getErrorMessage(payload, fallback) {
    if (typeof payload === 'string') return payload
    return payload?.message || payload?.error || payload?.errors?.[0]?.message || fallback
}

/**
 * Create a Mayar single-payment link.
 * The caller must provide an amount sourced from the server-side invoice.
 */
export async function createPaymentLink({
    amount,
    referenceId,
    customerName,
    customerEmail,
    customerPhone,
    description,
    dueDate,
    redirectUrl,
    metadata,
}) {
    const config = getConfig()
    const numericAmount = Number(amount)

    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
        throw new Error('Nominal pembayaran Mayar tidak valid')
    }
    if (!referenceId) throw new Error('Reference pembayaran Mayar wajib diisi')
    if (!dueDate) throw new Error('Tanggal kedaluwarsa pembayaran wajib diisi')

    const payload = {
        amount: numericAmount,
        reference_id: referenceId,
        name: customerName || 'Pelanggan',
        email: customerEmail,
        mobile: customerPhone,
        description: description || `Pembayaran ${referenceId}`,
        due_date: dueDate,
        redirect_url: redirectUrl,
        metadata,
    }

    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
            delete payload[key]
        }
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const response = await fetch(`${config.baseUrl}${PAYMENT_REQUEST_PATH}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        })

        const responseBody = await response.json().catch(() => null)
        if (!response.ok) {
            console.error('[MAYAR] Payment request failed:', {
                status: response.status,
                message: getErrorMessage(responseBody, 'Mayar API error'),
                referenceId,
            })
            throw new Error('Gagal membuat payment link Mayar')
        }

        const data = responseBody?.data || responseBody
        const paymentUrl = data?.link || data?.payment_url || data?.checkout_url
        const gatewayOrderId = data?.id || data?.reference_id || data?.transaction_id

        if (!paymentUrl || !gatewayOrderId) {
            console.error('[MAYAR] Invalid payment response:', { referenceId })
            throw new Error('Response payment Mayar tidak lengkap')
        }

        return {
            paymentUrl,
            gatewayOrderId,
            expiresAt: data?.expired_at || data?.expires_at || dueDate,
            rawResponse: responseBody,
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[MAYAR] Payment request timeout:', { referenceId })
            throw new Error('Mayar API timeout')
        }
        throw error
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Verify a webhook signature against the exact raw request body.
 * Supports hex or base64 signatures and uses constant-time comparison.
 */
export function verifyWebhookSignature(rawBody, signature, secret = process.env.MAYAR_WEBHOOK_SECRET) {
    if (!rawBody || !signature || !secret) return false

    const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const expectedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
    const provided = String(signature).trim().replace(/^sha256=/i, '')

    const candidates = [expectedHex, expectedBase64]
    return candidates.some((expected) => {
        const expectedBuffer = Buffer.from(expected)
        const providedBuffer = Buffer.from(provided)
        return expectedBuffer.length === providedBuffer.length &&
            crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    })
}
