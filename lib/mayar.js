import crypto from 'node:crypto'

// Mayar API v2.
// Sandbox and production live on different hosts:
//   sandbox    -> https://api.mayar.io/hl/v2
//   production -> https://api.mayar.id/hl/v2
const SANDBOX_BASE_URL = 'https://api.mayar.io/hl/v2'
const PRODUCTION_BASE_URL = 'https://api.mayar.id/hl/v2'
const REQUEST_TIMEOUT_MS = 15_000
// Mayar rejects `notes` longer than 24 characters.
const NOTES_MAX_LENGTH = 24

export class MayarError extends Error {
    constructor(message, { status = 0, code = 'MAYAR_ERROR', details = null } = {}) {
        super(message)
        this.name = 'MayarError'
        this.status = status
        this.code = code
        this.details = details
    }
}

let warnedAboutSandboxInProduction = false

export function getMayarEnvironment() {
    const explicit = process.env.MAYAR_ENV?.trim().toLowerCase()
    if (explicit === 'production' || explicit === 'sandbox') return explicit

    // Backwards compatibility: infer the environment from an explicit base URL.
    const configuredBaseUrl = process.env.MAYAR_BASE_URL?.trim()
    if (configuredBaseUrl) {
        try {
            const host = new URL(configuredBaseUrl).hostname
            if (host === 'api.mayar.id') return 'production'
            if (host === 'api.mayar.io') return 'sandbox'
        } catch {
            // The URL is validated by getMayarConfig().
        }
    }

    // Fail safe: an unconfigured environment must never charge real customers.
    return 'sandbox'
}

export function getMayarConfig() {
    const apiKey = process.env.MAYAR_API_KEY?.trim()
    if (!apiKey) {
        throw new MayarError('Konfigurasi Mayar tidak lengkap: MAYAR_API_KEY belum diatur', {
            code: 'MAYAR_CONFIG',
        })
    }

    const environment = getMayarEnvironment()
    const fallbackBaseUrl = environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL
    const configuredBaseUrl = process.env.MAYAR_BASE_URL?.trim() || fallbackBaseUrl

    let baseUrl
    try {
        const parsed = new URL(configuredBaseUrl)
        if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Unsupported protocol')
        baseUrl = parsed.toString().replace(/\/+$/, '')
    } catch {
        throw new MayarError('Konfigurasi Mayar tidak valid: MAYAR_BASE_URL harus berupa URL absolut', {
            code: 'MAYAR_CONFIG',
        })
    }

    if (environment === 'sandbox' && process.env.NODE_ENV === 'production' && !warnedAboutSandboxInProduction) {
        warnedAboutSandboxInProduction = true
        console.warn('[MAYAR] Sandbox environment aktif di deployment production. Set MAYAR_ENV=production untuk menerima pembayaran nyata.')
    }

    return { apiKey, baseUrl, environment }
}

export function getAppBaseUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (!configuredUrl) throw new Error('Konfigurasi URL aplikasi tidak lengkap: NEXT_PUBLIC_APP_URL belum diatur')
    let parsed
    try {
        parsed = new URL(configuredUrl)
    } catch {
        throw new Error('Konfigurasi URL aplikasi tidak valid: NEXT_PUBLIC_APP_URL harus berupa URL absolut')
    }
    if (!['https:', 'http:'].includes(parsed.protocol)) {
        throw new Error('Konfigurasi URL aplikasi tidak valid: NEXT_PUBLIC_APP_URL harus menggunakan HTTP atau HTTPS')
    }
    return parsed.toString().replace(/\/+$/, '')
}

export function buildPaymentRedirectUrl(tagihanId) {
    if (!tagihanId) throw new Error('ID tagihan untuk redirect wajib diisi')
    return `${getAppBaseUrl()}/bayar/${encodeURIComponent(tagihanId)}`
}

/**
 * Convert a calendar date (YYYY-MM-DD, interpreted as WIB) or an ISO timestamp
 * into the ISO-8601 `expiredAt` value expected by Mayar.
 * Falls back to `fallbackDays` from now, and never returns a past timestamp.
 */
export function toExpirationIso(value, { fallbackDays = 3, now = new Date() } = {}) {
    const raw = value == null ? '' : String(value).trim()
    let date = null

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        // End of day in WIB (UTC+7) so the customer has the full due date to pay.
        date = new Date(`${raw}T23:59:59+07:00`)
    } else if (raw) {
        const parsed = new Date(raw)
        if (!Number.isNaN(parsed.getTime())) date = parsed
    }

    if (!date || date.getTime() <= now.getTime()) {
        date = new Date(now.getTime() + fallbackDays * 86_400_000)
        date.setUTCHours(16, 59, 59, 0) // 23:59:59 WIB
    }

    return date.toISOString()
}

export function isPaidGatewayStatus(status) {
    const normalized = String(status ?? '').trim().toLowerCase()
    return ['paid', 'settled', 'settlement', 'success', 'succeeded', 'true'].includes(normalized)
}

function getErrorMessage(payload, fallback) {
    if (typeof payload === 'string') return payload
    if (Array.isArray(payload?.data)) {
        const validation = payload.data.map((item) => item?.message).filter(Boolean).join('; ')
        if (validation) return validation
    }
    if (payload?.data && typeof payload.data === 'object') {
        const validation = Object.values(payload.data)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .filter((value) => typeof value === 'string')
            .join('; ')
        if (validation) return validation
    }
    return payload?.messages || payload?.message || payload?.error || fallback
}

async function requestMayar(path, { method = 'GET', body } = {}) {
    const config = getMayarConfig()
    const requestUrl = new URL(path.replace(/^\/+/, ''), `${config.baseUrl}/`).toString()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const response = await fetch(requestUrl, {
            method,
            headers: {
                Accept: 'application/json',
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                Authorization: `Bearer ${config.apiKey}`,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: controller.signal,
            cache: 'no-store',
        })

        const responseBody = await response.json().catch(() => null)

        if (!response.ok) {
            const message = getErrorMessage(responseBody, `Mayar API error (${response.status})`)
            const code = response.status === 429
                ? 'MAYAR_DUPLICATE_REQUEST'
                : response.status === 401
                    ? 'MAYAR_UNAUTHORIZED'
                    : 'MAYAR_API_ERROR'

            console.error('[MAYAR] Request failed:', { status: response.status, path, message, code })
            throw new MayarError(message, { status: response.status, code, details: responseBody })
        }

        return responseBody
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[MAYAR] Request timeout:', { path })
            throw new MayarError('Mayar API timeout', { code: 'MAYAR_TIMEOUT' })
        }
        throw error
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Create a Mayar "single payment request" (Payment Request v2).
 * The amount must come from the server-side invoice, never from the client.
 */
export async function createPaymentLink({
    amount,
    referenceId,
    customerName,
    customerEmail,
    customerPhone,
    description,
    dueDate,
    expiresAt,
    redirectUrl,
    metadata = {},
}) {
    const numericAmount = Number(amount)

    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
        throw new MayarError('Nominal pembayaran Mayar tidak valid', { code: 'MAYAR_INVALID_AMOUNT' })
    }
    if (!referenceId) {
        throw new MayarError('Reference pembayaran Mayar wajib diisi', { code: 'MAYAR_INVALID_REFERENCE' })
    }

    const expiration = expiresAt
        ? toExpirationIso(expiresAt)
        : toExpirationIso(dueDate)

    // Mayar only accepts string values inside extraData.
    const extraData = {}
    for (const [key, value] of Object.entries({ ...metadata, reference_id: referenceId })) {
        if (value === undefined || value === null) continue
        extraData[key] = typeof value === 'string'
            ? value
            : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)
    }

    const payload = {
        name: (customerName ? `Tagihan ${customerName}` : 'Tagihan Internet').substring(0, 100),
        amount: numericAmount,
        mobile: customerPhone || undefined,
        description: description || `Pembayaran ${referenceId}`,
        notes: (description || `Bayar ${referenceId}`).substring(0, NOTES_MAX_LENGTH),
        redirectUrl: redirectUrl || undefined,
        expiredAt: expiration,
        extraData,
    }

    // Mayar tries to send an email receipt when `email` is present. Sandbox
    // accounts do not have the email channel connected, so it is opt-in.
    if (customerEmail && process.env.MAYAR_SEND_EMAIL === 'true') {
        payload.email = customerEmail
    }

    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') delete payload[key]
    })

    const responseBody = await requestMayar('/payments/create', { method: 'POST', body: payload })
    const data = responseBody?.data || responseBody
    const paymentUrl = data?.link || data?.payment_url || data?.checkout_url
    const gatewayOrderId = data?.id || data?.paymentLinkId

    if (!paymentUrl || !gatewayOrderId) {
        console.error('[MAYAR] Invalid payment response:', { referenceId, hasLink: Boolean(paymentUrl) })
        throw new MayarError('Response payment Mayar tidak lengkap', { code: 'MAYAR_INVALID_RESPONSE' })
    }

    return {
        requestId: gatewayOrderId,
        paymentLinkId: data?.paymentLinkId || gatewayOrderId,
        transactionId: data?.transactionId || null,
        gatewayOrderId,
        paymentUrl,
        status: data?.status || 'unpaid',
        expiresAt: data?.expiredAt || data?.expired_at || expiration,
        environment: getMayarEnvironment(),
        rawResponse: responseBody,
    }
}

function normalizeExpiration(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 1_000_000_000_000) {
        // Invoice responses use epoch milliseconds.
        return new Date(numeric).toISOString()
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

function buildExtraData(metadata, referenceId) {
    // Mayar only accepts string values inside extraData.
    const extraData = {}
    for (const [key, value] of Object.entries({ ...metadata, reference_id: referenceId })) {
        if (value === undefined || value === null) continue
        extraData[key] = typeof value === 'string'
            ? value
            : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)
    }
    return extraData
}

/**
 * Create a Mayar Invoice (POST /hl/v2/invoices/create).
 *
 * Invoices are used instead of single payment requests for recurring billing:
 *  - payment requests reject a second create with the same amount within a
 *    minute (429), which makes it impossible to bill many customers on the
 *    same package in one cron run;
 *  - invoices do not add Mayar's admin/channel fee on top, so the 30% customer
 *    share computed by this app is the only fee added to the invoice total.
 *
 * Mayar requires an email on invoices. The caller supplies a deterministic
 * placeholder when the customer only has a WhatsApp number.
 */
export async function createInvoice({
    amount,
    referenceId,
    customerName,
    customerEmail,
    customerPhone,
    description,
    itemDescription,
    dueDate,
    expiresAt,
    metadata = {},
}) {
    const numericAmount = Number(amount)
    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
        throw new MayarError('Nominal pembayaran Mayar tidak valid', { code: 'MAYAR_INVALID_AMOUNT' })
    }
    if (!referenceId) {
        throw new MayarError('Reference pembayaran Mayar wajib diisi', { code: 'MAYAR_INVALID_REFERENCE' })
    }
    if (!customerName?.trim()) {
        throw new MayarError('Nama pelanggan Mayar wajib diisi', { code: 'MAYAR_INVALID_CUSTOMER' })
    }
    if (!customerEmail?.trim()) {
        throw new MayarError('Email pelanggan Mayar wajib diisi', { code: 'MAYAR_INVALID_CUSTOMER' })
    }

    const expiration = toExpirationIso(expiresAt || dueDate)
    const label = description || `Tagihan ${referenceId}`

    const payload = {
        name: customerName.trim().substring(0, 100),
        email: customerEmail.trim(),
        mobile: customerPhone || undefined,
        description: label,
        expiredAt: expiration,
        items: [{
            quantity: 1,
            rate: numericAmount,
            description: (itemDescription || label).substring(0, 100),
        }],
        extraData: buildExtraData(metadata, referenceId),
    }

    Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') delete payload[key]
    })

    const responseBody = await requestMayar('/invoices/create', { method: 'POST', body: payload })
    const data = responseBody?.data || responseBody
    const paymentUrl = data?.link || data?.paymentUrl || data?.payment_url
    const gatewayOrderId = data?.id || data?.paymentLinkId

    if (!paymentUrl || !gatewayOrderId) {
        console.error('[MAYAR] Invalid invoice response:', { referenceId, hasLink: Boolean(paymentUrl) })
        throw new MayarError('Response invoice Mayar tidak lengkap', { code: 'MAYAR_INVALID_RESPONSE' })
    }

    return {
        requestId: gatewayOrderId,
        paymentLinkId: data?.paymentLinkId || gatewayOrderId,
        transactionId: data?.transactionId || null,
        gatewayOrderId,
        paymentUrl,
        status: data?.status || 'unpaid',
        expiresAt: normalizeExpiration(data?.expiredAt, expiration),
        providerType: 'invoice',
        environment: getMayarEnvironment(),
        rawResponse: responseBody,
    }
}

/** Fetch the current state of a Mayar invoice. */
export async function getInvoice(id) {
    if (!id) throw new MayarError('ID invoice Mayar wajib diisi', { code: 'MAYAR_INVALID_REFERENCE' })
    const responseBody = await requestMayar(`/invoices/${encodeURIComponent(id)}`)
    return responseBody?.data || responseBody
}

/**
 * Expire an invoice so a superseded payment link can no longer be paid.
 * Mayar's update endpoint requires the invoice items in every update.
 */
export async function expireInvoice(id, amount) {
    if (!id) return null
    const rate = Number.isSafeInteger(Number(amount)) && Number(amount) > 0
        ? Number(amount)
        : 1
    return requestMayar(`/invoices/${encodeURIComponent(id)}/update`, {
        method: 'POST',
        body: {
            id,
            items: [{ quantity: 1, rate, description: 'Kedaluwarsa' }],
            expiredAt: new Date().toISOString(),
        },
    })
}

/** Fetch the current state of a Mayar payment request. */
export async function getPaymentRequest(id) {
    if (!id) throw new MayarError('ID payment request Mayar wajib diisi', { code: 'MAYAR_INVALID_REFERENCE' })
    const responseBody = await requestMayar(`/payments/${encodeURIComponent(id)}`)
    return responseBody?.data || responseBody
}

/** Fetch a Mayar transaction (used to resolve the payment method and paid time). */
export async function getTransaction(id) {
    if (!id) throw new MayarError('ID transaksi Mayar wajib diisi', { code: 'MAYAR_INVALID_REFERENCE' })
    const responseBody = await requestMayar(`/transactions/${encodeURIComponent(id)}`)
    return responseBody?.data || responseBody
}

/** Close a Mayar payment request so an expired link can no longer be paid. */
export async function closePaymentRequest(id) {
    if (!id) return null
    return requestMayar(`/payments/${encodeURIComponent(id)}/close`, { method: 'POST' })
}

function safeEqual(provided, expected) {
    const a = crypto.createHash('sha256').update(String(provided ?? '')).digest()
    const b = crypto.createHash('sha256').update(String(expected ?? '')).digest()
    return crypto.timingSafeEqual(a, b)
}

/**
 * Verify that a webhook call really points at the URL configured in Mayar.
 *
 * Mayar v2 webhooks are NOT signed with an HMAC header, so the shared secret is
 * carried in the registered webhook URL (`?token=...`) or in the
 * `x-mayar-webhook-token` header. Every accepted webhook is additionally
 * re-verified against the Mayar API before an invoice is marked as paid.
 */
export function verifyWebhookToken(request, secret = process.env.MAYAR_WEBHOOK_SECRET) {
    if (!secret?.trim()) {
        console.error('[MAYAR] Konfigurasi tidak lengkap: MAYAR_WEBHOOK_SECRET belum diatur')
        return false
    }

    let token = ''
    try {
        token = new URL(request.url).searchParams.get('token') || ''
    } catch {
        token = ''
    }
    if (!token) token = request.headers.get('x-mayar-webhook-token') || ''
    if (!token) return false

    return safeEqual(token, secret)
}

/**
 * Legacy HMAC helper kept for callers that front Mayar with their own proxy.
 * Real Mayar webhooks do not carry a signature header.
 */
export function verifyWebhookSignature(rawBody, signature, secret = process.env.MAYAR_WEBHOOK_SECRET) {
    if (!secret?.trim() || !rawBody || !signature) return false

    const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const expectedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
    const provided = String(signature).trim().replace(/^sha256=/i, '')

    return [expectedHex, expectedBase64].some((expected) => safeEqual(provided, expected))
}
