// app/api/cron/notif-tagihan/route.js
// Cron job: kirim notifikasi WA otomatis untuk tagihan jatuh tempo (H-3, H-1, Hari H, H+1)
// Menggunakan sistem batching & jeda waktu (delay) untuk keamanan API dan performa tinggi
// Dijadwalkan tiap hari jam 08:00 WIB via vercel.json

import { createClient } from "@supabase/supabase-js";
import { kirimWABatch, formatBulan, formatRupiah, formatTanggal } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
    // Pengecekan CRON_SECRET (opsional untuk testing manual)
    const authHeader = request.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hari_ini = new Date();
    hari_ini.setHours(0, 0, 0, 0);

    // Hitung tanggal target untuk masing-masing kondisi notifikasi
    const h_minus_3 = new Date(hari_ini);
    h_minus_3.setDate(h_minus_3.getDate() + 3);

    const h_minus_1 = new Date(hari_ini);
    h_minus_1.setDate(h_minus_1.getDate() + 1);

    const h_plus_1 = new Date(hari_ini);
    h_plus_1.setDate(h_plus_1.getDate() - 1);

    const toISO = (d) => d.toISOString().split("T")[0]; // format: YYYY-MM-DD

    // Ambil semua tagihan belum bayar beserta data pelanggan
    const { data: tagihan, error } = await supabase
        .from("tagihan")
        .select(`
            id,
            bulan,
            tahun,
            jumlah_tagihan,
            tanggal_jatuh_tempo,
            status_pembayaran,
            pelanggan:pelanggan_id (
                id,
                nama,
                no_wa
            )
        `)
        .eq("status_pembayaran", "belum_bayar")
        .not("pelanggan", "is", null);

    if (error) {
        console.error("[CRON NOTIF] Gagal ambil data tagihan:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }

    const hasil = {
        total_tagihan_belum_bayar: tagihan ? tagihan.length : 0,
        antrean_terproses: 0,
        h_minus_3: { dikirim: 0, gagal: 0 },
        h_minus_1: { dikirim: 0, gagal: 0 },
        hari_h: { dikirim: 0, gagal: 0 },
        h_plus_1: { dikirim: 0, gagal: 0 },
        dilewati: 0,
    };

    if (!tagihan || tagihan.length === 0) {
        return Response.json({ sukses: true, message: "Tidak ada tagihan belum bayar.", hasil });
    }

    // 1. Susun antrean pesan berdasarkan kriteria jatuh tempo
    const antreanPesan = [];

    for (const t of tagihan) {
        if (!t.pelanggan) continue;

        const { nama, no_wa } = t.pelanggan;
        const jatuh_tempo = t.tanggal_jatuh_tempo; // format: YYYY-MM-DD
        const bulanText = formatBulan(t.bulan);
        const nominalText = formatRupiah(t.jumlah_tagihan);
        const tanggalText = formatTanggal(jatuh_tempo);

        let pesan = null;
        let kategori = null;

        if (jatuh_tempo === toISO(h_minus_3)) {
            pesan = `Halo Bapak/Ibu *${nama}*, tagihan WiFi Sultan bulan ${bulanText} ${t.tahun} sebesar *${nominalText}* akan jatuh tempo pada *${tanggalText}*. Mohon disiapkan pembayarannya. Terima kasih 🙏`;
            kategori = "h_minus_3";
        } else if (jatuh_tempo === toISO(h_minus_1)) {
            pesan = `Halo Bapak/Ibu *${nama}*, mengingatkan tagihan WiFi Sultan bulan ${bulanText} ${t.tahun} sebesar *${nominalText}* jatuh tempo *besok ${tanggalText}*. Segera lakukan pembayaran agar layanan tidak terputus. Terima kasih 🙏`;
            kategori = "h_minus_1";
        } else if (jatuh_tempo === toISO(hari_ini)) {
            pesan = `Halo Bapak/Ibu *${nama}*, tagihan WiFi Sultan bulan ${bulanText} ${t.tahun} sebesar *${nominalText}* jatuh tempo *hari ini ${tanggalText}*. Mohon segera lakukan pembayaran. Terima kasih 🙏`;
            kategori = "hari_h";
        } else if (jatuh_tempo === toISO(h_plus_1)) {
            pesan = `Halo Bapak/Ibu *${nama}*, tagihan WiFi Sultan bulan ${bulanText} ${t.tahun} sebesar *${nominalText}* sudah *melewati jatuh tempo* sejak kemarin. Mohon segera lakukan pembayaran agar layanan tidak diputus. Terima kasih 🙏`;
            kategori = "h_plus_1";
        } else {
            hasil.dilewati++;
            continue;
        }

        if (!no_wa) {
            console.warn(`[CRON NOTIF] Pelanggan ${nama} tidak punya nomor WA, dilewati.`);
            hasil[kategori].gagal++;
            continue;
        }

        antreanPesan.push({
            nomor: no_wa,
            pesan,
            kategori,
            nama,
            tagihan_id: t.id,
            pelanggan_id: t.pelanggan.id,
        });
    }

    hasil.antrean_terproses = antreanPesan.length;
    console.log(`[CRON NOTIF] Menyiapkan pengiriman ${antreanPesan.length} notifikasi...`);

    // 2. Kirim bertahap dengan sistem batching (12 pesan/batch, jeda 2.5s)
    const batchResult = await kirimWABatch(antreanPesan, {
        batchSize: 12,
        delayMs: 2500,
    });

    // 3. Rekapitulasi hasil per kategori
    for (const item of batchResult.detail) {
        const kat = item.kategori;
        if (kat && hasil[kat]) {
            if (item.sukses) {
                hasil[kat].dikirim++;
            } else {
                hasil[kat].gagal++;
            }
        }
    }

    console.log("[CRON NOTIF] Notifikasi selesai diproses:", hasil);
    return Response.json({
        sukses: true,
        total_terkirim: batchResult.berhasil,
        total_gagal: batchResult.gagal,
        hasil,
    });
}