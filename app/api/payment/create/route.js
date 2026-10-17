import { createClient } from '@supabase/supabase-js'
import { formatBulan } from '@/lib/whatsapp'
import { createPaymentLink } from '@/lib/mayar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { tagihan_id } = body

    if (!tagihan_id) {
      return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Never trust payment amount or customer details from the browser.
    const { data: tagihan, error: tagihanError } = await supabase
      .from('tagihan')
      .select('id, jumlah_tagihan, bulan, tahun, status_pembayaran, pelanggan:pelanggan_id(nama, no_wa)')
      .eq('id', tagihan_id)
      .single()

    if (tagihanError || !tagihan) {
      return Response.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    }

    if (!['belum_bayar', 'UNPAID'].includes(tagihan.status_pembayaran)) {
      return Response.json({ error: 'Tagihan tidak tersedia untuk pembayaran' }, { status: 409 })
    }

    const amount = Math.round(Number(tagihan.jumlah_tagihan))
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return Response.json({ error: 'Nominal tagihan tidak valid' }, { status: 500 })
    }

    const pelangganNama = tagihan.pelanggan?.nama || 'Pelanggan'
    const pelangganWa = tagihan.pelanggan?.no_wa || ''

    const customerFee = 240
    const totalAmount = amount + customerFee
    const referenceId = `SULTAN-${tagihan_id.slice(0, 8)}-${Date.now()}`
    const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const payment = await createPaymentLink({
      amount: totalAmount,
      referenceId,
      customerName: pelangganNama,
      customerPhone: pelangganWa,
      description: `Tagihan WiFi ${formatBulan(tagihan.bulan)} ${tagihan.tahun}`,
      dueDate,
      redirectUrl: `${baseUrl}/bayar/${tagihan_id}`,
      metadata: { tagihan_id },
    })

    const { error: attemptError } = await supabase.from('payment_attempts').insert({
      tagihan_id: tagihan.id,
      status: 'PENDING',
      provider: 'mayar',
      payment_url: payment.paymentUrl,
      gateway_order_id: payment.gatewayOrderId,
      customer_fee: customerFee,
      payment_metadata: { ...payment.rawResponse, reference_id: referenceId },
    })
    if (attemptError) throw attemptError

    const { error: updateError } = await supabase.from('tagihan').update({
      payment_url: payment.paymentUrl,
      gateway_order_id: payment.gatewayOrderId,
      gateway_provider: 'mayar',
      customer_fee: customerFee,
    }).eq('id', tagihan.id)
    if (updateError) {
      await supabase.from('payment_attempts')
        .delete()
        .eq('gateway_order_id', payment.gatewayOrderId)
        .eq('tagihan_id', tagihan.id)
      throw updateError
    }

    return Response.json({ sukses: true, payment_url: payment.paymentUrl, order_id: payment.gatewayOrderId })
  } catch (err) {
    console.error('[PAYMENT] Error:', err)
    return Response.json({ error: err.message || 'Gagal membuat transaksi' }, { status: 500 })
  }
}