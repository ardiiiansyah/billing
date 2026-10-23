import test from 'node:test'
import assert from 'node:assert/strict'
import { createPaymentLink } from '../lib/mayar.js'

const originalFetch = globalThis.fetch
const originalEnv = {
  MAYAR_API_KEY: process.env.MAYAR_API_KEY,
  MAYAR_BASE_URL: process.env.MAYAR_BASE_URL,
}

test('sends amount and Mayar v2 invoice fields to configured base URL', async () => {
  process.env.MAYAR_API_KEY = 'unit-test-key'
  process.env.MAYAR_BASE_URL = 'https://api.mayar.io/hl/v2'
  let captured
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options, payload: JSON.parse(options.body) }
    return new Response(JSON.stringify({ data: { id: 'inv-test', link: 'https://pay.example/test' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    await createPaymentLink({
      amount: 1000,
      referenceId: 'SANDBOX-TEST-1',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '081234567890',
      description: 'Sandbox payment test',
      dueDate: '2026-12-31',
      redirectUrl: 'https://beatnet.vercel.app/payment-test/',
    })

    assert.equal(captured.url, 'https://api.mayar.io/hl/v2/payments/create')
    assert.equal(captured.options.method, 'POST')
    assert.equal(captured.options.headers.Authorization, 'Bearer unit-test-key')
    assert.equal(captured.payload.amount, 1000)
    assert.equal(typeof captured.payload.amount, 'number')
    assert.equal(captured.payload.reference_id, 'SANDBOX-TEST-1')
    assert.equal(captured.payload.redirect_url, 'https://beatnet.vercel.app/payment-test')
    assert.equal(captured.payload.nominal, undefined)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test.after(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})
