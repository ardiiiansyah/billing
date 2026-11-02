// app/api/test-cron/route.js
// Test endpoint untuk trigger cron jobs manually (for testing only)
// Access: https://beatnet.vercel.app/api/test-cron

import { createClient } from '@supabase/supabase-js'
import { buildPaymentRedirectUrl, createPaymentLink } from '@/lib/mayar'
import { formatBulan } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'all'
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const results = {
    timestamp: new Date().toISOString(),
    action: action,
    results: {}
  }

  try {
    // Get current month/year
    const now = new Date()
    const bulan = now.getMonth() + 1
    const tahun = now.getFullYear()

    // TEST 1: Generate Tagihan
    if (action === 'all' || action === 'generate-tagihan') {
      const { data: pelanggan, error: pelangganError } = await supabase
        .from('pelanggan')
        .select('id, nama, kode_pelanggan, paket_id')
        .eq('status', 'aktif')

      if (pelangganError) throw pelangganError

      let generated = 0
      let skipped = 0

      for (const p of pelanggan || []) {
        // Check if tagihan already exists
        const { data: existing } = await supabase
          .from('tagihan')
          .select('id')
          .eq('pelanggan_id', p.id)
          .eq('bulan', bulan)
          .eq('tahun', tahun)
          .maybeSingle()

        if (existing) {
          skipped++
          continue
        }

        // Get paket price
        const { data: paket } = await supabase
          .from('paket')
          .select('harga')
          .eq('id', p.paket_id)
          .single()

        if (!paket) continue

        // Create tagihan
        const { error: insertError } = await supabase
          .from('tagihan')
          .insert({
            pelanggan_id: p.id,
            bulan: bulan,
            tahun: tahun,
            jumlah_tagihan: paket.harga,
            tanggal_jatuh_tempo: `${tahun}-${String(bulan).padStart(2, '0')}-10`,
            status_pembayaran: 'belum_bayar'
          })

        if (!insertError) generated++
      }

      results.results.generate_tagihan = {
        success: true,
        bulan,
        tahun,
        pelanggan_count: pelanggan?.length || 0,
        generated,
        skipped
      }
    }

    // TEST 2: Generate Payment Links
    if (action === 'all' || action === 'generate-payment-links') {
      const { data: invoices } = await supabase
        .from('tagihan')
        .select('id, bulan, tahun, jumlah_tagihan, tanggal_jatuh_tempo, pelanggan:pelanggan_id(nama, no_wa)')
        .in('status_pembayaran', ['belum_bayar', 'UNPAID'])
        .is('payment_url', null)
        .limit(5)

      let created = 0
      let failed = 0

      for (const invoice of invoices || []) {
        try {
          const amount = Number(invoice.jumlah_tagihan)
          const customerFee = 240
          const total = amount + customerFee

          console.log('[TEST-CRON] Creating payment link:', {
            invoice_id: invoice.id,
            amount: total,
            customer: invoice.pelanggan?.nama,
            due_date: invoice.tanggal_jatuh_tempo
          })

          const payment = await createPaymentLink({
            amount: total,
            referenceId: `SULTAN-${invoice.id.slice(0, 8)}-${Date.now()}`,
            customerName: invoice.pelanggan?.nama || 'Pelanggan',
            customerPhone: invoice.pelanggan?.no_wa,
            description: `Tagihan WiFi ${formatBulan(invoice.bulan)} ${invoice.tahun}`,
            dueDate: invoice.tanggal_jatuh_tempo,
            redirectUrl: buildPaymentRedirectUrl(invoice.id),
            metadata: { tagihan_id: invoice.id },
          })

          await supabase.from('payment_attempts').insert({
            tagihan_id: invoice.id,
            provider: 'mayar',
            gateway_order_id: payment.gatewayOrderId,
            payment_url: payment.paymentUrl,
            amount: total,
            customer_fee: customerFee,
            status: 'PENDING',
            payment_metadata: payment.rawResponse,
          })

          await supabase.from('tagihan').update({
            payment_url: payment.paymentUrl,
            gateway_order_id: payment.gatewayOrderId,
            gateway_provider: 'mayar',
            customer_fee: customerFee,
          }).eq('id', invoice.id)

          created++
        } catch (err) {
          failed++
          console.error('[TEST-CRON] Payment link creation failed:', {
            invoice_id: invoice.id,
            error: err.message,
            stack: err.stack
          })
        }
      }

      results.results.generate_payment_links = {
        success: true,
        scanned: invoices?.length || 0,
        created,
        failed
      }
    }

    return Response.json(results)
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
