import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const routeUrl = pathToFileURL(path.resolve('app/api/payment/webhook/route.js')).href
const secret = 'test-webhook-secret'
const tagihanId = '11111111-1111-4111-8111-111111111111'
const gatewayOrderId = 'mayar-order-123'
const amount = 150240
const state = { attempt: null, rpc: null }
globalThis[Symbol.for('mayar-test-supabase')] = {
  from(table) {
    assert.equal(table, 'payment_attempts')
    const chain = { select() { return chain }, eq() { return chain }, maybeSingle: async () => state.attempt }
    return chain
  },
  rpc: async (...args) => state.rpc(...args),
}

function signed(body) {
  const raw = JSON.stringify(body)
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return new Request('http://localhost/api/payment/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-mayar-signature': signature }, body: raw,
  })
}

async function withRoute({ attempt, rpc, secretValue = secret }) {
  process.env.MAYAR_WEBHOOK_SECRET = secretValue
  state.attempt = attempt
  state.rpc = rpc
  const route = await import(routeUrl)
  return route.POST
}

const attempt = { id: 'attempt-1', tagihan_id: tagihanId, gateway_order_id: gatewayOrderId, amount, status: 'PENDING' }
const event = (id = 'event-1', extra = {}) => ({ event_id: id, event: 'payment.received', reference: gatewayOrderId, status: 'PAID', amount, payment_method: 'qris', ...extra })

test('accepts valid HMAC, handles payment.received and calls RPC with verified values', async () => {
  let called
  const POST = await withRoute({ attempt: { data: attempt }, rpc: async (...args) => { called = args; return { data: { already_processed: false }, error: null } } })
  const response = await POST(signed(event()))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { sukses: true, already_processed: false })
  assert.equal(called[0], 'process_gateway_payment')
  assert.deepEqual({ ...called[1], p_paid_at: undefined }, {
    p_tagihan_id: tagihanId, p_event_id: 'event-1', p_reference: gatewayOrderId,
    p_amount: amount, p_method: 'qris', p_paid_at: undefined,
  })
  assert.ok(Number.isFinite(Date.parse(called[1].p_paid_at)))
})

test('rejects invalid HMAC before database/RPC processing', async () => {
  let rpcCalled = false
  const POST = await withRoute({ attempt: { data: attempt }, rpc: async () => { rpcCalled = true } })
  const req = signed(event())
  const response = await POST(new Request(req.url, { method: 'POST', headers: { 'x-mayar-signature': 'invalid' }, body: await req.text() }))
  assert.equal(response.status, 401)
  assert.equal(rpcCalled, false)
})

test('duplicate delivery returns already_processed without error', async () => {
  let seen = false
  let calls = 0
  const POST = await withRoute({ attempt: { data: attempt }, rpc: async () => {
    calls++
    if (seen) return { data: { already_processed: true }, error: null }
    seen = true
    return { data: { already_processed: false }, error: null }
  } })
  assert.equal((await POST(signed(event('duplicate-1')))).status, 200)
  const response = await POST(signed(event('duplicate-1')))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { sukses: true, already_processed: true })
  assert.equal(calls, 2) // The database RPC's unique event constraint makes side effects idempotent.
})

test('rejects amount mismatch with 422 without RPC', async () => {
  let called = false
  const POST = await withRoute({ attempt: { data: attempt }, rpc: async () => { called = true } })
  assert.equal((await POST(signed(event('wrong-amount', { amount: amount + 1 })))).status, 422)
  assert.equal(called, false)
})

test('rejects incomplete event payload with 400', async () => {
  const POST = await withRoute({ attempt: { data: attempt }, rpc: async () => ({ data: {}, error: null }) })
  const response = await POST(signed({ event_id: 'missing-fields', event: 'payment.received', status: 'PAID' }))
  assert.equal(response.status, 400)
})

test('returns 500 for RPC failure so webhook can be retried', async () => {
  const POST = await withRoute({ attempt: { data: attempt }, rpc: async () => ({ data: null, error: { code: 'XX000' } }) })
  const response = await POST(signed(event('rpc-failure')))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'Gagal memproses pembayaran' })
})
