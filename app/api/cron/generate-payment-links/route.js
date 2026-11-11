import { createClient } from '@supabase/supabase-js'
import { createAttemptForInvoice, PaymentError } from '@/lib/payments'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const MAX_INVOICES_PER_RUN = 20

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: invoices, error } = await supabase
    .from('tagihan')
    .select('id')
    .in('status_pembayaran', ['belum_bayar', 'UNPAID', 'OVERDUE'])
    .is('payment_url', null)
    .order('created_at', { ascending: true })
    .limit(MAX_INVOICES_PER_RUN)

  if (error) {
    console.error('[CRON PAYMENT LINKS] Query failed:', error.message)
    return NextResponse.json({ error: 'Gagal mengambil tagihan' }, { status: 500 })
  }

  let created = 0
  let reused = 0
  let failed = 0
  const errors = []

  for (const invoice of invoices || []) {
    try {
      const result = await createAttemptForInvoice(invoice.id)
      if (result.reused) reused++
      else created++
    } catch (err) {
      failed++
      // A 429 from Mayar is expected when two invoices share the same nominal
      // within one minute; the next cron run will pick the invoice up again.
      if (!(err instanceof PaymentError && err.status === 429)) {
        console.error('[CRON PAYMENT LINKS] Failed:', { invoiceId: invoice.id, message: err.message })
      }
      if (errors.length < 10) errors.push({ invoice_id: invoice.id, message: err.message, status: err.status })
    }
  }

  return NextResponse.json({
    success: true,
    scanned: invoices?.length || 0,
    created,
    reused,
    failed,
    errors,
    environment: process.env.MAYAR_ENV || 'sandbox',
  })
}
