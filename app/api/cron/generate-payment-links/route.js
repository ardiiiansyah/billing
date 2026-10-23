import { createClient } from '@supabase/supabase-js'
import { buildPaymentRedirectUrl, createPaymentLink } from '@/lib/mayar'
import { formatBulan } from '@/lib/whatsapp'
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
    .select('id, jumlah_tagihan, bulan, tahun, tanggal_jatuh_tempo, status_pembayaran, payment_url, pelanggan:pelanggan_id(nama, no_wa)')
    .in('status_pembayaran', ['belum_bayar', 'UNPAID'])
    .is('payment_url', null)
    .order('created_at', { ascending: true })
    .limit(MAX_INVOICES_PER_RUN)

  if (error) {
    console.error('[CRON PAYMENT LINKS] Query failed:', error.message)
    return NextResponse.json({ error: 'Gagal mengambil tagihan' }, { status: 500 })
  }

  let created = 0
  let failed = 0
  for (const invoice of invoices || []) {
    try {
      const amount = Number(invoice.jumlah_tagihan)
      if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Nominal tagihan tidak valid')

      const customerFee = 240
      const payment = await createPaymentLink({
        amount: amount + customerFee,
        referenceId: `SULTAN-${invoice.id.slice(0, 8)}-${Date.now()}`,
        customerName: invoice.pelanggan?.nama || 'Pelanggan',
        customerPhone: invoice.pelanggan?.no_wa,
        description: `Tagihan WiFi ${formatBulan(invoice.bulan)} ${invoice.tahun}`,
        dueDate: invoice.tanggal_jatuh_tempo,
        redirectUrl: buildPaymentRedirectUrl(invoice.id),
        metadata: { tagihan_id: invoice.id },
      })

      const { error: attemptError } = await supabase.from('payment_attempts').insert({
        tagihan_id: invoice.id,
        provider: 'mayar',
        gateway_order_id: payment.gatewayOrderId,
        payment_url: payment.paymentUrl,
        amount: amount + customerFee,
        customer_fee: customerFee,
        status: 'PENDING',
        payment_metadata: payment.rawResponse,
      })
      if (attemptError) throw attemptError

      const { error: updateError } = await supabase
        .from('tagihan')
        .update({
          payment_url: payment.paymentUrl,
          gateway_order_id: payment.gatewayOrderId,
          gateway_provider: 'mayar',
          customer_fee: customerFee,
        })
        .eq('id', invoice.id)
        .is('payment_url', null)
      if (updateError) throw updateError

      created++
    } catch (err) {
      failed++
      console.error('[CRON PAYMENT LINKS] Failed:', { invoiceId: invoice.id, message: err.message })
    }
  }

  return NextResponse.json({ success: true, scanned: invoices?.length || 0, created, failed })
}
