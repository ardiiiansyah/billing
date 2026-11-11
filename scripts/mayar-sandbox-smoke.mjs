#!/usr/bin/env node
// Mayar sandbox smoke test.
//
//   node scripts/mayar-sandbox-smoke.mjs
//   node scripts/mayar-sandbox-smoke.mjs --status <invoice_id>
//   node scripts/mayar-sandbox-smoke.mjs --amount 150240 --name "Bu Ratna"
//   node scripts/mayar-sandbox-smoke.mjs --payment-request   (legacy mode)
//
// Reads MAYAR_* from .env.local (or the current environment). Never touches
// the database and never creates a real charge while MAYAR_ENV=sandbox.

import fs from 'node:fs'
import path from 'node:path'
import {
  createInvoice,
  createPaymentLink,
  getInvoice,
  getMayarConfig,
  getPaymentRequest,
} from '../lib/mayar.js'

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const content = fs.readFileSync(file, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function parseArgs(argv) {
  const args = { amount: 1000, name: 'Sandbox Test', status: null, paymentRequest: false }
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--status') args.status = argv[++i]
    else if (arg === '--amount') args.amount = Number(argv[++i])
    else if (arg === '--name') args.name = argv[++i]
    else if (arg === '--payment-request') args.paymentRequest = true
  }
  return args
}

loadEnvFile(path.resolve('.env.local'))
loadEnvFile(path.resolve('.env'))

const args = parseArgs(process.argv)

try {
  const config = getMayarConfig()
  console.log(`Mayar environment : ${config.environment}`)
  console.log(`Mayar base URL    : ${config.baseUrl}`)
  console.log(`API key           : ${config.apiKey.slice(0, 12)}… (${config.apiKey.length} chars)`)
  console.log(`Mode              : ${args.paymentRequest ? 'payment request' : 'invoice'}`)

  if (config.environment === 'production') {
    console.warn('\n⚠️  MAYAR_ENV=production. This script will create a REAL payment request.\n')
  }

  if (args.status) {
    const detail = args.paymentRequest
      ? await getPaymentRequest(args.status)
      : await getInvoice(args.status)
    console.log('\nPayment status:')
    console.log(JSON.stringify(detail, null, 2))
    process.exit(0)
  }

  const referenceId = `SMOKE-${Date.now()}`
  const amount = Math.max(1, Math.trunc(args.amount))
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString()
  const customerPhone = '6281234567890'
  const customerEmail = 'sandbox@example.com'

  const payment = args.paymentRequest
    ? await createPaymentLink({
        amount,
        referenceId,
        customerName: args.name,
        customerPhone,
        description: 'Sandbox smoke test',
        expiresAt,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/bayar/sandbox`,
        metadata: { smoke_test: true },
      })
    : await createInvoice({
        amount,
        referenceId,
        customerName: args.name,
        customerEmail,
        customerPhone,
        description: 'Sandbox smoke test',
        itemDescription: 'Paket uji sandbox',
        expiresAt,
        metadata: { smoke_test: true },
      })

  console.log('\n✅ Payment created')
  console.log(`  reference       : ${referenceId}`)
  console.log(`  gateway id      : ${payment.gatewayOrderId}`)
  console.log(`  transaction id  : ${payment.transactionId || '-'}`)
  console.log(`  expires at      : ${payment.expiresAt}`)
  console.log(`  payment URL     : ${payment.paymentUrl}`)
  console.log('\nOpen the URL above, pay with the sandbox simulator, then run:')
  console.log(`  node scripts/mayar-sandbox-smoke.mjs --status ${payment.gatewayOrderId}${args.paymentRequest ? ' --payment-request' : ''}`)
} catch (error) {
  console.error('\n❌', error.message)
  if (error.details) console.error(JSON.stringify(error.details, null, 2))
  process.exit(1)
}
