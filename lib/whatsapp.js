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

/**
 * Jeda waktu asinkron dalam milidetik
 * @param {number} ms - Durasi delay dalam milidetik
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Kirim pesan WhatsApp secara bertahap (batching) dengan jeda waktu antar batch
 * @param {Array<{nomor: string, pesan: string, extra?: any}>} antreanPesan - Daftar pesan yang akan dikirim
 * @param {Object} [options] - Opsi konfigurasi batching
 * @param {number} [options.batchSize=12] - Jumlah pesan per batch (disarankan 10-15)
 * @param {number} [options.delayMs=2500] - Jeda waktu antar batch dalam milidetik (disarankan 2000-3000 ms)
 * @param {Function} [options.onBatchComplete] - Callback opsional yang dipanggil setiap batch selesai
 * @returns {Promise<{total: number, berhasil: number, gagal: number, detail: Array}>}
 */
export async function kirimWABatch(antreanPesan = [], options = {}) {
    const {
        batchSize = 12,
        delayMs = 2500,
        onBatchComplete = null,
    } = options;

    const total = antreanPesan.length;
    let berhasil = 0;
    let gagal = 0;
    const detail = [];

    if (total === 0) {
        return { total: 0, berhasil: 0, gagal: 0, detail: [] };
    }

    console.log(`[WA BATCH] Memulai pengiriman ${total} pesan (${batchSize} pesan/batch, jeda ${delayMs}ms)...`);

    for (let i = 0; i < total; i += batchSize) {
        const batch = antreanPesan.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize) + 1;
        const totalBatch = Math.ceil(total / batchSize);

        console.log(`[WA BATCH] Mengirim batch ${batchIndex}/${totalBatch} (${batch.length} pesan)...`);

        const batchPromises = batch.map(async (item) => {
            if (!item.nomor) {
                return {
                    ...item,
                    sukses: false,
                    error: "Nomor WhatsApp kosong",
                };
            }

            try {
                const res = await kirimWA(item.nomor, item.pesan);
                return {
                    ...item,
                    sukses: res.sukses,
                    data: res.data,
                };
            } catch (err) {
                return {
                    ...item,
                    sukses: false,
                    error: err.message,
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);

        for (const res of batchResults) {
            if (res.sukses) {
                berhasil++;
            } else {
                gagal++;
            }
            detail.push(res);
        }

        if (typeof onBatchComplete === "function") {
            try {
                await onBatchComplete(batchResults, batchIndex, totalBatch);
            } catch (cbErr) {
                console.error("[WA BATCH] Error pada onBatchComplete:", cbErr.message);
            }
        }

        // Berikan jeda waktu antar batch jika masih ada batch berikutnya
        if (i + batchSize < total) {
            console.log(`[WA BATCH] Jeda ${delayMs}ms sebelum batch selanjutnya...`);
            await delay(delayMs);
        }
    }

    console.log(`[WA BATCH] Selesai: ${berhasil} berhasil, ${gagal} gagal dari ${total} total.`);
    return {
        total,
        berhasil,
        gagal,
        detail,
    };
}