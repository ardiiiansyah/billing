// Cari tagihan beserta data pelanggan (nama dan nomor WhatsApp) berdasarkan order_id
const { data: tagihan, error: errTagihan } = await supabase
  .from('tagihan')
  .select('id, bulan, tahun, pelanggan:pelanggan_id(nama, no_wa)')
  .eq('midtrans_order_id', order_id)
  .single()

if (errTagihan || !tagihan) {
  return Response.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
}

// Update status berdasarkan status Midtrans
const isLunas =
  (transaction_status === 'capture' && fraud_status === 'accept') ||
  transaction_status === 'settlement'

if (isLunas) {
  // 1. Insert ke tabel pembayaran
  await supabase.from('pembayaran').insert([{
    tagihan_id: tagihan.id,
    jumlah_bayar: Number(gross_amount),
    metode_pembayaran: 'midtrans',
    referensi_pembayaran: order_id,
    diterima_oleh: 'Midtrans',
    catatan: `Auto-confirmed via webhook. Status: ${transaction_status}`,
  }])

  // 2. UPDATE status tagihan menjadi lunas agar terbaca di laporan keuangan
  await supabase
    .from('tagihan')
    .update({
      status_pembayaran: 'lunas',
      status: 'lunas'
    })
    .eq('id', tagihan.id)

  // 3. Kirim WhatsApp otomatis konfirmasi lunas ke pelanggan via Fonnte menggunakan helper kirimWA atau fetch langsung
  if (tagihan.pelanggan?.no_wa) {
    const pesanWA = `Halo Bapak/Ibu *${tagihan.pelanggan.nama}*, pembayaran untuk tagihan WiFi bulan *${tagihan.bulan} ${tagihan.tahun}* sebesar *Rp ${Number(gross_amount).toLocaleString('id-ID')}* via Midtrans telah *BERHASIL* dan Lunas. Terima kasih sudah berlangganan! 🙏`

    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': process.env.FONNTE_TOKEN,
      },
      body: new URLSearchParams({
        target: tagihan.pelanggan.no_wa,
        message: pesanWA,
      }),
    })
  }
}