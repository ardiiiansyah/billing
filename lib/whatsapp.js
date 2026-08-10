// lib/whatsapp.js
// Helper untuk kirim WhatsApp via Fonnte API

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const FONNTE_URL = "https://api.fonnte.com/send";

/**
 * Kirim pesan WhatsApp via Fonnte
 * @param {string} nomor - Nomor WA tujuan (format: 08xxx atau 628xxx)
 * @param {string} pesan - Isi pesan yang akan dikirim
 * @returns {Promise<{sukses: boolean, data: any}>}
 */
export async function kirimWA(nomor, pesan) {
    if (!FONNTE_TOKEN) {
        console.error("[WA] FONNTE_TOKEN belum dikonfigurasi di .env.local");
        return { sukses: false, data: null };
    }

    // Normalisasi nomor: pastikan format 628xxx (bukan 08xxx)
    const nomorFormatted = nomor.startsWith("0")
        ? "62" + nomor.slice(1)
        : nomor;

    try {
        const response = await fetch(FONNTE_URL, {
            method: "POST",
            headers: {
                Authorization: FONNTE_TOKEN,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                target: nomorFormatted,
                message: pesan,
                countryCode: "62",
            }),
        });

        const data = await response.json();

        if (!response.ok || data.status === false) {
            console.error("[WA] Gagal kirim ke", nomorFormatted, ":", data);
            return { sukses: false, data };
        }

        console.log("[WA] Berhasil kirim ke", nomorFormatted);
        return { sukses: true, data };
    } catch (error) {
        console.error("[WA] Error saat kirim WA:", error.message);
        return { sukses: false, data: null };
    }
}

/**
 * Format bulan dari angka ke teks Indonesia
 * @param {number} bulan - Angka bulan (1-12)
 * @returns {string}
 */
export function formatBulan(bulan) {
    const namaBulan = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return namaBulan[bulan] || bulan;
}

/**
 * Format nominal ke format Rupiah
 * @param {number} nominal
 * @returns {string}
 */
export function formatRupiah(nominal) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(nominal);
}

/**
 * Format tanggal ke format Indonesia (misal: 10 Agustus 2026)
 * @param {string} tanggal - Format ISO date string
 * @returns {string}
 */
export function formatTanggal(tanggal) {
    return new Date(tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}