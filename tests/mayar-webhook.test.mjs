import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const routeUrl = pathToFileURL(path.resolve('app/api/payment/webhook/route.js')).href
const secret = 'test-webhook-token'
const tagihanId = '11111111-1111-4111-8111-111111111111'
const gatewayOrderId = 'mayar-request-123'
const amount = 150240

const state = {
  attempt: null,
  invoice: null,
  events: [],
  attemptUpdates: [],
  rpcArgs: null,
  rpcResult: { data: { already_processed: false }, error: null },
  rpcCalls: 0,
}

function queryFor(table) {
  const builder = {
    select() { return builder },
    eq() { return builder },
    in() { return builder },
    order() { return builder },
    limit() {
      if (table === 'payment_attempts') {
        return Promise.resolve({ data: state.attempt ? [state.attempt] : [], error: null })
      }
      return Promise.resolve({ data: [], error: null })
    },
    maybeSingle() { return Promise.resolve({ data: state.attempt, error: null }) },
    single() {
      if (table === 'tagihan') return Promise.resolve({ data: state.invoice, error: null })
      return Promise.resolve({ data: null, error: null })
    },
    update(patch) {
      state.attemptUpdates.push({ table, patch })
      return builder
    },
    upsert(row) {
      state.events.push(row)
      return Promise.resolve({ error: null })
    },
    then(resolve, reject) {
      return Promise.resolve({ data: null, error: null }).then(resolve, reject)
    },
  }
  return builder
}

globalThis[Symbol.for('mayar-test-supabase')] = {
  from: queryFor,
  rpc: async (name, args) => {
    state.rpcCalls++
    state.rpcArgs = { name, args }
    return state.rpcResult
  },
}

function reset() {
  state.attempt = {
    id: 'attempt-1',
    tagihan_id: tagihanId,
    gateway_order_id: gatewayOrderId,
    amount,
    status: 'PENDING',
    payment_metadata: {},
  }
  state.invoice = {
    id: tagihanId,
    jumlah_tagihan: amount - 240,
    customer_fee: 240,
    status_pembayaran: 'belum_bayar',
    gateway_order_id: null,
  }
  state.events = []
  state.attemptUpdates = []
  state.rpcArgs = null
  state.rpcResult = { data: { already_processed: false }, error: null }
  state.rpcCalls = 0
}

function paidEvent(overrides = {}) {
  return {
    event: 'payment.received',
    data: {
      id: 'trx-1',
      transactionId: 'trx-1',
      status: 'SUCCESS',
      transactionStatus: 'paid',
      amount,
      paymentMethod: 'QRIS',
      updatedAt: '2026-11-11T10:00:00.000Z',
      extraData: { tagihan_id: tagihanId, reference_id: 'SULTAN-REF-1' },
      ...overrides,
    },
  }
}

function signed(body, { token = secret } = {}) {
  return new Request(`http://localhost/api/payment/webhook?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function loadRoute() {
  process.env.MAYAR_WEBHOOK_SECRET = secret
  process.env.MAYAR_VERIFY_WEBHOOK = 'false'
  const route = await import(routeUrl)
  return route.POST
}

test('accepts a Mayar payment.received webhook and reconciles the invoice', async () => {
  reset()
  const POST = await loadRoute()

  const response = await POST(signed(paidEvent()))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    sukses: true,
    already_processed: false,
    payment_method: 'QRIS',
  })

  assert.equal(state.rpcArgs.name, 'process_gateway_payment')
  assert.equal(state.rpcArgs.args.p_tagihan_id, tagihanId)
  assert.equal(state.rpcArgs.args.p_event_id, 'trx-1')
  // The RPC looks the attempt up by the payment request id we stored.
  assert.equal(state.rpcArgs.args.p_reference, gatewayOrderId)
  assert.equal(state.rpcArgs.args.p_amount, amount)
  assert.equal(state.rpcArgs.args.p_method, 'QRIS')
  assert.equal(state.rpcArgs.args.p_paid_at, '2026-11-11T10:00:00.000Z')
})

test('rejects a request without the shared webhook token', async () => {
  reset()
  const POST = await loadRoute()

  const response = await POST(signed(paidEvent(), { token: 'wrong-token' }))
  assert.equal(response.status, 401)
  assert.equal(state.rpcCalls, 0)
})

test('rejects a request with a missing token', async () => {
  reset()
  const POST = await loadRoute()

  const request = new Request('http://localhost/api/payment/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(paidEvent()),
  })
  const response = await POST(request)
  assert.equal(response.status, 401)
  assert.equal(state.rpcCalls, 0)
})

test('rejects an amount mismatch with 422 without calling the RPC', async () => {
  reset()
  const POST = await loadRoute()

  const response = await POST(signed(paidEvent({ amount: amount + 1 })))
  assert.equal(response.status, 422)
  assert.equal(state.rpcCalls, 0)
})

test('returns 422 for an unknown gateway reference', async () => {
  reset()
  state.attempt = null
  const POST = await loadRoute()

  const response = await POST(signed(paidEvent()))
  assert.equal(response.status, 422)
  assert.equal(state.rpcCalls, 0)
})

test('ignores non-paid events such as payment.reminder', async () => {
  reset()
  const POST = await loadRoute()

  const response = await POST(signed({
    event: 'payment.reminder',
    data: { id: 'trx-2', transactionId: 'trx-2', status: 'SUCCESS', transactionStatus: 'created', amount },
  }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { sukses: true, ignored: true, event: 'payment.reminder' })
  assert.equal(state.rpcCalls, 0)
})

test('duplicate delivery of an already processed payment is acknowledged', async () => {
  reset()
  state.attempt.status = 'PAID'
  const POST = await loadRoute()

  const response = await POST(signed(paidEvent()))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { sukses: true, already_processed: true })
  assert.equal(state.rpcCalls, 0)
})

test('flags a double payment when the invoice was already settled in cash', async () => {
  reset()
  state.invoice.status_pembayaran = 'lunas'
  const POST = await loadRoute()

  const response = await POST(signed(paidEvent({ id: 'trx-double', transactionId: 'trx-double' })))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { sukses: true, duplicate_payment: true })
  assert.equal(state.rpcCalls, 0)
  assert.equal(state.events.length, 1)
  assert.equal(state.events[0].status, 'DUPLICATE')
  assert.equal(state.events[0].event_id, 'trx-double:duplicate')
  assert.ok(state.attemptUpdates.some((entry) => entry.patch.status === 'PAID_DUPLICATE'))
})

test('accepts the dashboard test webhook', async () => {
  reset()
  const POST = await loadRoute()

  const response = await POST(signed({ event: 'testing', data: { id: '123456789' } }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, message: 'Test webhook received' })
})

test('returns 500 when the RPC fails so Mayar retries the delivery', async () => {
  reset()
  state.rpcResult = { data: null, error: { code: 'XX000' } }
  const POST = await loadRoute()

  const response = await POST(signed(paidEvent()))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'Gagal memproses pembayaran' })
})
