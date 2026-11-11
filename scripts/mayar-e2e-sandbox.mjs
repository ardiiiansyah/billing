#!/usr/bin/env node
// End-to-end Mayar sandbox test against the real database.
//
// Creates a payment attempt for an existing unpaid invoice through the real
// `createAttemptForInvoice` helper, POSTs a simulated `payment.received`
// webhook to a locally running server, asserts the invoice became `lunas`,
// then restores the database to its original state.
//
//   npx next start -p 3100            (with MAYAR_VERIFY_WEBHOOK=false)
//   node --experimental-loader ./tests/alias-loader.mjs scripts/mayar-e2e-sandbox.mjs \
//        --tagihan <uuid> --base-url http://localhost:3100
//
// Use --keep to leave the rows in place for manual inspection.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile(path.resolve('.env.local'))

const args = { tagihan: null, baseUrl: 'http://localhost:3100', keep: false }
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--tagihan') args.tagihan = process.argv[++i]
  else if (process.argv[i] === '--base-url') args.baseUrl = process.argv[++i]
  else if (process.argv[i] === '--keep') args.keep = true
}

if (!args.tagihan) {
  console.error('Usage: node scripts/mayar-e2e-sandbox.mjs --tagihan <invoice-uuid> [--base-url http://localhost:3100]')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
// The test alias loader resolves '@/lib/supabaseAdmin' to this global.
globalThis[Symbol.for('mayar-test-supabase')] = supabase

const { createAttemptForInvoice, syncPaymentAttempt } = await import('../lib/payments.js')

const results = { steps: [] }
let attempt = null
let transactionId = null
let originalInvoice = null

function step(name, data) {
  results.steps.push({ name, ...data })
  console.log(`\n▶ ${name}`)
  if (data) console.log(JSON.stringify(data, null, 2))
}

try {
  const { data: invoice, error: invoiceError } = await supabase
    .from('tagihan')
    .select('id, status_pembayaran, payment_url, gateway_order_id, gateway_provider, customer_fee, jumlah_tagihan')
    .eq('id', args.tagihan)
    .single()
  if (invoiceError) throw invoiceError
  originalInvoice = invoice

  if (!['belum_bayar', 'UNPAID', 'OVERDUE'].includes(invoice.status_pembayaran)) {
    throw new Error(`Tagihan ${args.tagihan} tidak bisa dipakai (status ${invoice.status_pembayaran})`)
  }

  step('invoice before', invoice)

  const created = await createAttemptForInvoice(args.tagihan, { forceRenew: true })
  attempt = created.attempt
  step('payment attempt created', {
    id: attempt.id,
    gateway_order_id: attempt.gateway_order_id,
    amount: attempt.amount,
    customer_fee: attempt.customer_fee,
    payment_url: attempt.payment_url,
    environment: attempt.payment_metadata?.environment,
    expires_at: attempt.payment_metadata?.expires_at,
  })

  transactionId = `e2e-${Date.now()}`

  const webhookUrl = `${args.baseUrl}/api/payment/webhook?token=${encodeURIComponent(process.env.MAYAR_WEBHOOK_SECRET || '')}`
  const payload = {
    event: 'payment.received',
    data: {
      id: attempt.gateway_order_id,
      transactionId,
      status: 'SUCCESS',
      transactionStatus: 'paid',
      amount: Number(attempt.amount),
      paymentMethod: 'QRIS',
      updatedAt: new Date().toISOString(),
      extraData: {
        tagihan_id: args.tagihan,
        reference_id: attempt.payment_metadata?.reference_id,
      },
    },
  }

  const webhookResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const webhookBody = await webhookResponse.json().catch(() => null)
  step('webhook response', { status: webhookResponse.status, body: webhookBody })
  if (!webhookResponse.ok) throw new Error(`Webhook gagal: HTTP ${webhookResponse.status}`)

  const { data: paidInvoice, error: paidError } = await supabase
    .from('tagihan')
    .select('id, status_pembayaran, payment_url, gateway_order_id, gateway_provider')
    .eq('id', args.tagihan)
    .single()
  if (paidError) throw paidError
  step('invoice after', paidInvoice)
  if (paidInvoice.status_pembayaran !== 'lunas') throw new Error('Invoice tidak berubah menjadi lunas')

  const { data: paymentRows, error: paymentError } = await supabase
    .from('pembayaran')
    .select('id, jumlah_bayar, metode_pembayaran, referensi_pembayaran, diterima_oleh, catatan')
    .eq('tagihan_id', args.tagihan)
  if (paymentError) throw paymentError
  step('pembayaran rows', paymentRows)

  const { data: paidAttempt, error: attemptError } = await supabase
    .from('payment_attempts')
    .select('id, status, settlement_time, payment_metadata')
    .eq('id', attempt.id)
    .single()
  if (attemptError) throw attemptError
  step('attempt after', {
    status: paidAttempt.status,
    settlement_time: paidAttempt.settlement_time,
    payment_method: paidAttempt.payment_metadata?.payment_method,
  })

  const { data: eventRows, error: eventError } = await supabase
    .from('payment_events')
    .select('event_id, status, provider, rejection_reason')
    .eq('event_id', transactionId)
  if (eventError) throw eventError
  step('payment_events rows', eventRows)

  // Duplicate delivery must be idempotent.
  const duplicateResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  step('duplicate webhook response', {
    status: duplicateResponse.status,
    body: await duplicateResponse.json().catch(() => null),
  })

  // Manual "Cek Status" path should also report the invoice as already paid.
  const sync = await syncPaymentAttempt(args.tagihan)
  step('manual syncPaymentAttempt', sync)

  results.ok = true
} catch (error) {
  results.ok = false
  results.error = error.message
  console.error(`\n❌ ${error.message}`)
  if (error.details) console.error(JSON.stringify(error.details, null, 2))
} finally {
  if (!args.keep && attempt) {
    console.log('\n▶ cleanup')
    try {
      const { expireInvoice } = await import('../lib/mayar.js')
      await expireInvoice(attempt.gateway_order_id, attempt.amount).catch(() => {})
    } catch { /* best effort */ }

    if (transactionId) {
      await supabase.from('payment_events').delete().eq('event_id', transactionId)
    }
    await supabase.from('pembayaran').delete().eq('tagihan_id', args.tagihan)
      .eq('referensi_pembayaran', attempt.gateway_order_id)
    await supabase.from('payment_attempts').delete().eq('id', attempt.id)
    if (originalInvoice) {
      await supabase.from('tagihan').update({
        status_pembayaran: originalInvoice.status_pembayaran,
        payment_url: originalInvoice.payment_url,
        gateway_order_id: originalInvoice.gateway_order_id,
        gateway_provider: originalInvoice.gateway_provider,
        customer_fee: originalInvoice.customer_fee,
      }).eq('id', args.tagihan)
    }
    console.log('Database restored.')
  }
}

console.log('\nRESULT ' + JSON.stringify(results, null, 2))
process.exit(results.ok ? 0 : 1)
