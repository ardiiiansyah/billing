import test from 'node:test'
import assert from 'node:assert/strict'
import { createInvoice, createPaymentLink, expireInvoice, isPaidGatewayStatus, toExpirationIso } from '../lib/mayar.js'

const originalFetch = globalThis.fetch
const originalEnv = {
  MAYAR_API_KEY: process.env.MAYAR_API_KEY,
  MAYAR_BASE_URL: process.env.MAYAR_BASE_URL,
  MAYAR_ENV: process.env.MAYAR_ENV,
  MAYAR_SEND_EMAIL: process.env.MAYAR_SEND_EMAIL,
}

function mockFetch(responseBody) {
  let captured
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options, payload: JSON.parse(options.body) }
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  return () => captured
}

test('creates a Mayar invoice with line items and stringified extraData', async () => {
  process.env.MAYAR_API_KEY = 'unit-test-key'
  process.env.MAYAR_BASE_URL = 'https://api.mayar.io/hl/v2'
  delete process.env.MAYAR_ENV

  const read = mockFetch({
    statusCode: 200,
    messages: 'success',
    data: {
      id: 'inv-123',
      transactionId: 'trx-123',
      link: 'https://beatnet.myr.lat/invoices/test',
      amount: 150240,
      status: 'unpaid',
      expiredAt: 1798736399000,
    },
  })

  try {
    const result = await createInvoice({
      amount: 150240,
      referenceId: 'SULTAN-INV-1',
      customerName: 'Bu Ratna',
      customerEmail: 'wifi-001@pelanggan.example.com',
      customerPhone: '6281234567890',
      description: 'Tagihan WiFi 11/2026',
      itemDescription: 'Hemat 10M - 11/2026',
      dueDate: '2026-12-31',
      metadata: { tagihan_id: '11111111-1111-4111-8111-111111111111' },
    })

    const captured = read()
    assert.equal(captured.url, 'https://api.mayar.io/hl/v2/invoices/create')
    assert.equal(captured.options.method, 'POST')
    assert.equal(captured.options.headers.Authorization, 'Bearer unit-test-key')

    assert.equal(captured.payload.name, 'Bu Ratna')
    assert.equal(captured.payload.email, 'wifi-001@pelanggan.example.com')
    assert.equal(captured.payload.mobile, '6281234567890')
    assert.equal(captured.payload.expiredAt, '2026-12-31T16:59:59.000Z')
    assert.equal(captured.payload.items.length, 1)
    assert.equal(captured.payload.items[0].quantity, 1)
    assert.equal(captured.payload.items[0].rate, 150240)
    assert.equal(captured.payload.items[0].description, 'Hemat 10M - 11/2026')
    assert.equal(captured.payload.extraData.reference_id, 'SULTAN-INV-1')
    assert.equal(captured.payload.extraData.tagihan_id, '11111111-1111-4111-8111-111111111111')

    assert.equal(result.gatewayOrderId, 'inv-123')
    assert.equal(result.transactionId, 'trx-123')
    assert.equal(result.paymentUrl, 'https://beatnet.myr.lat/invoices/test')
    assert.equal(result.providerType, 'invoice')
    assert.equal(result.expiresAt, new Date(Date.UTC(2026, 11, 31, 16, 59, 59)).toISOString())
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejects an invoice without a customer email before calling Mayar', async () => {
  process.env.MAYAR_API_KEY = 'unit-test-key'
  let called = false
  globalThis.fetch = async () => { called = true }

  try {
    await assert.rejects(
      () => createInvoice({ amount: 1000, referenceId: 'x', customerName: 'Budi' }),
      /Email pelanggan/,
    )
    assert.equal(called, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('expireInvoice updates the invoice with items and a past expiry', async () => {
  process.env.MAYAR_API_KEY = 'unit-test-key'
  process.env.MAYAR_BASE_URL = 'https://api.mayar.io/hl/v2'
  const read = mockFetch({ statusCode: 200, messages: 'success' })

  try {
    await expireInvoice('inv-123', 150240)
    const captured = read()
    assert.equal(captured.url, 'https://api.mayar.io/hl/v2/invoices/inv-123/update')
    assert.equal(captured.payload.id, 'inv-123')
    assert.equal(captured.payload.items[0].rate, 150240)
    assert.ok(new Date(captured.payload.expiredAt).getTime() <= Date.now())
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('creates a Mayar v2 single payment request with the documented camelCase fields', async () => {
  process.env.MAYAR_API_KEY = 'unit-test-key'
  process.env.MAYAR_BASE_URL = 'https://api.mayar.io/hl/v2'
  delete process.env.MAYAR_ENV
  delete process.env.MAYAR_SEND_EMAIL

  const read = mockFetch({
    statusCode: 200,
    messages: 'success',
    data: {
      id: 'req-123',
      transactionId: null,
      link: 'https://beatnet.myr.lat/pl/test',
      status: 'unpaid',
      expiredAt: '2026-12-31T16:59:59.000Z',
    },
  })

  try {
    const result = await createPaymentLink({
      amount: 150240,
      referenceId: 'SULTAN-TEST-1',
      customerName: 'Bu Ratna',
      customerPhone: '6281234567890',
      description: 'Tagihan WiFi 11/2026',
      dueDate: '2026-12-31',
      redirectUrl: 'https://beatnet.vercel.app/bayar/11111111-1111-4111-8111-111111111111',
      metadata: { tagihan_id: '11111111-1111-4111-8111-111111111111' },
    })

    const captured = read()
    assert.equal(captured.url, 'https://api.mayar.io/hl/v2/payments/create')
    assert.equal(captured.options.method, 'POST')
    assert.equal(captured.options.headers.Authorization, 'Bearer unit-test-key')

    // v2 field names
    assert.equal(captured.payload.amount, 150240)
    assert.equal(typeof captured.payload.amount, 'number')
    assert.equal(captured.payload.name, 'Tagihan Bu Ratna')
    assert.equal(captured.payload.mobile, '6281234567890')
    assert.equal(captured.payload.redirectUrl, 'https://beatnet.vercel.app/bayar/11111111-1111-4111-8111-111111111111')
    assert.equal(captured.payload.expiredAt, '2026-12-31T16:59:59.000Z')
    assert.ok(captured.payload.notes.length <= 24)
    assert.equal(captured.payload.extraData.reference_id, 'SULTAN-TEST-1')
    assert.equal(captured.payload.extraData.tagihan_id, '11111111-1111-4111-8111-111111111111')

    // Legacy/invalid v1 fields must not be sent.
    assert.equal(captured.payload.reference_id, undefined)
    assert.equal(captured.payload.due_date, undefined)
    assert.equal(captured.payload.redirect_url, undefined)
    // Sandbox accounts cannot send email receipts by default.
    assert.equal(captured.payload.email, undefined)

    assert.equal(result.gatewayOrderId, 'req-123')
    assert.equal(result.paymentUrl, 'https://beatnet.myr.lat/pl/test')
    assert.equal(result.environment, 'sandbox')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('includes email only when MAYAR_SEND_EMAIL=true', async () => {
  process.env.MAYAR_API_KEY = 'unit-test-key'
  process.env.MAYAR_BASE_URL = 'https://api.mayar.io/hl/v2'
  process.env.MAYAR_SEND_EMAIL = 'true'

  const read = mockFetch({ data: { id: 'req-1', link: 'https://pay.example/1' } })

  try {
    await createPaymentLink({
      amount: 1000,
      referenceId: 'REF-1',
      customerEmail: 'budi@example.com',
      dueDate: '2026-12-31',
    })
    assert.equal(read().payload.email, 'budi@example.com')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejects an invalid amount before calling Mayar', async () => {
  process.env.MAYAR_API_KEY = 'unit-test-key'
  let called = false
  globalThis.fetch = async () => { called = true }

  try {
    await assert.rejects(() => createPaymentLink({ amount: 0, referenceId: 'x' }), /Nominal pembayaran/)
    assert.equal(called, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('expiration is the end of the due date in WIB and never in the past', () => {
  assert.equal(toExpirationIso('2026-12-31'), '2026-12-31T16:59:59.000Z')

  const now = new Date('2026-11-11T00:00:00.000Z')
  const fallback = toExpirationIso('2026-01-01', { now, fallbackDays: 3 })
  assert.equal(fallback, '2026-11-14T16:59:59.000Z')
})

test('normalizes Mayar paid statuses', () => {
  for (const value of ['SUCCESS', 'paid', 'settled', 'SETTLEMENT', true]) {
    assert.equal(isPaidGatewayStatus(value), true, `expected ${value} to be paid`)
  }
  for (const value of ['unpaid', 'created', 'closed', false, null]) {
    assert.equal(isPaidGatewayStatus(value), false, `expected ${value} to be unpaid`)
  }
})

test.after(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})
