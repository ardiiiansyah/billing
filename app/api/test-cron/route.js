// app/api/test-cron/route.js
// Test endpoint untuk trigger cron jobs manually (for testing only)
// Access: https://beatnet.vercel.app/api/test-cron

import { createClient } from '@supabase/supabase-js'
import { createAttemptForInvoice, PaymentError } from '@/lib/payments'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request) {
  // SECURITY: this debug endpoint can create invoices and payment links.
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 })
  }

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
        .select('id')
        .in('status_pembayaran', ['belum_bayar', 'UNPAID', 'OVERDUE'])
        .is('payment_url', null)
        .limit(5)

      let created = 0
      let failed = 0

      for (const invoice of invoices || []) {
        try {
          const result = await createAttemptForInvoice(invoice.id)
          if (!result.reused) created++
        } catch (err) {
          failed++
          console.error('[TEST-CRON] Payment link creation failed:', {
            invoice_id: invoice.id,
            message: err.message,
            status: err instanceof PaymentError ? err.status : undefined,
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
