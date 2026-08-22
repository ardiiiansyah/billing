// app/api/cron/notif-tagihan/route.js
import { createClient } from "@supabase/supabase-js";
import { kirimWABatch, formatBulan, formatRupiah, formatTanggal } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper tanggal zona WIB (Asia/Jakarta) format YYYY-MM-DD
function getLocalDateString(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
}

export async function GET(request) {
    const authHeader = request.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tglHariIni = getLocalDateString(0);      // Hari H
    const tglHPlus3 = getLocalDateString(-3);     // Jatuh tempo 3 hari lalu

    console.log(`[CRON NOTIF] Target Hari H: ${tglHariIni} | Target H+3: ${tglHPlus3}`);

    // 1. Ambil tagihan belum bayar yang jatuh temponya Hari H atau H+3
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
                kode_pelanggan,
                nama,
                no_wa
            )
        `)
        .eq("status_pembayaran", "belum_bayar")
        .in("tanggal_jatuh_tempo", [tglHariIni, tglHPlus3]);

    if (error) {
        console.error("[CRON NOTIF] Gagal ambil tagihan:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }

    if (!tagihan || tagihan.length === 0) {
        return Response.json({ sukses: true, message: "Tidak ada tagihan yang jatuh tempo hari ini atau H+3." });
    }

    // 2. Ambil log pengiriman hari ini untuk mencegah duplikasi (Anti-Spam)
    const tagihanIds = tagihan.map((t) => t.id);
    const startOfDay = `${tglHariIni}T00:00:00+07:00`;

    const { data: existingLogs } = await supabase
        .from("log_notifikasi")
        .select("tagihan_id, jenis_pesan")
        .in("tagihan_id", tagihanIds)
        .gte("created_at", startOfDay)
        .eq("status", "sent");

    const sentMap = new Set(
        (existingLogs || []).map((l) => `${l.tagihan_id}_${l.jenis_pesan}`)
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
    const antreanPesan = [];

    for (const t of tagihan) {
        if (!t.pelanggan || !t.pelanggan.no_wa) continue;

        const { nama, no_wa } = t.pelanggan;
        const jatuhTempoStr = String(t.tanggal_jatuh_tempo);
        const bulanText = formatBulan(t.bulan);
        const nominalText = formatRupiah(t.jumlah_tagihan);
        const tglText = formatTanggal(t.tanggal_jatuh_tempo);
        const linkBayar = baseUrl ? `${baseUrl}/bayar/${t.id}` : "-";

        let pesan = null;
        let kategori = null;

        if (jatuhTempoStr === tglHariIni) {
            kategori = "hari_h";
            pesan = `Halo Bapak/Ibu *${nama}*,\n\nPengingat tagihan Beat Net Indonesia periode *${bulanText} ${t.tahun}* sebesar *${nominalText}* jatuh tempo *HARI INI* (${tglText}).\n\n💳 *Link Pembayaran Online (Bisa QRIS, VA, E-Wallet):*\n${linkBayar}\n\nMohon segera melakukan pembayaran agar koneksi internet tetap lancar dan tidak terputus. Mohon untuk di save nomer ini karna segala informasi mengenai layanan akan di infokan di sini 🙏`;
        } else if (jatuhTempoStr === tglHPlus3) {
            kategori = "h_plus_3";
            pesan = `⚠️ *PERINGATAN TUNGGAKAN INTERNET*\n\nHalo Bapak/Ibu *${nama}*,\nKami menginformasikan bahwa tagihan WiFi periode *${bulanText} ${t.tahun}* sebesar *${nominalText}* telah *MELEWATI JATUH TEMPO* sejak ${tglText}.\n\n💳 *Segera lunasi melalui link berikut:*\n${linkBayar}\n\n⚠️ *PENTING:* Mohon segera melakukan pelunasan hari ini untuk menghindari *pemutusan/isolir jaringan secara otomatis*. Abaikan pesan ini jika Anda sudah melakukan pembayaran. Terima kasih.`;
        }

        // Cek apakah sudah pernah terkirim hari ini
        if (kategori && !sentMap.has(`${t.id}_${kategori}`)) {
            antreanPesan.push({
                nomor: no_wa,
                pesan,
                kategori,
                nama,
                tagihan_id: t.id,
                pelanggan_id: t.pelanggan.id,
            });
        }
    }

    if (antreanPesan.length === 0) {
        return Response.json({
            sukses: true,
            message: "Semua notifikasi untuk target hari ini sudah terkirim sebelumnya.",
        });
    }

    // 3. Kirim via Batching Fonnte
    const batchResult = await kirimWABatch(antreanPesan, {
        batchSize: 10,
        delayMs: 2000,
    });

    // 4. Rekam ke Log Notifikasi
    const logData = batchResult.detail.map((item) => ({
        tagihan_id: item.tagihan_id,
        pelanggan_id: item.pelanggan_id,
        no_wa: item.nomor,
        jenis_pesan: item.kategori,
        pesan: item.pesan,
        status: item.sukses ? "sent" : "failed",
    }));

    if (logData.length > 0) {
        await supabase.from("log_notifikasi").insert(logData);
    }

    return Response.json({
        sukses: true,
        total_antrean: antreanPesan.length,
        berhasil: batchResult.berhasil,
        gagal: batchResult.gagal,
    });
}
