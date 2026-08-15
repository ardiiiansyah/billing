'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PembayaranPage() {
    const [pembayaran, setPembayaran] = useState([])
    const [loading, setLoading] = useState(true)

    // Metrik Data
    const [metrik, setMetrik] = useState({
        totalMasuk: 0,
        totalMidtrans: 0,
        totalTunai: 0,
        transaksiHariIni: 0,
    })

    useEffect(() => {
        fetchPembayaran()
    }, [])

    const fetchPembayaran = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('pembayaran')
                .select('*, tagihan(pelanggan(nama))')
                .order('tanggal_bayar', { ascending: false })

            if (error) throw error

            if (data) {
                setPembayaran(data)
                kalkulasiMetrik(data)
            }
        } catch (err) {
            console.error('DEBUG FETCH PEMBAYARAN ERROR:', err.message || err)
            alert('Maaf, gagal memuat data pembayaran. Silakan coba beberapa saat lagi.')
        } finally {
            setLoading(false)
        }
    }

    const kalkulasiMetrik = (data) => {
        let totalMasuk = 0
        let totalMidtrans = 0
        let totalTunai = 0
        let transaksiHariIni = 0

        const hariIni = new Date().toISOString().split('T')[0]

        data.forEach(item => {
            const nominal = Number(item.jumlah_bayar || 0)
            totalMasuk += nominal

            if (item.metode_pembayaran?.toUpperCase() === 'TUNAI' || item.metode_pembayaran?.toUpperCase() === 'CASH') {
                totalTunai += nominal
            } else {
                totalMidtrans += nominal
            }

            if (item.tanggal_bayar && item.tanggal_bayar.startsWith(hariIni)) {
                transaksiHariIni++
            }
        })

        setMetrik({ totalMasuk, totalMidtrans, totalTunai, transaksiHariIni })
    }

    return (
        <div className="space-y-6">

            {/* Header Halaman Glassmorphism */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl shadow-black/20 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                        Riwayat Pembayaran
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        Buku kas harian & log mutasi transaksi WiFi.
                    </p>
                </div>
                <button
                    onClick={fetchPembayaran}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition border border-slate-700 flex items-center justify-center gap-2 shadow-sm"
                >
                    <span>🔄</span> {loading ? 'Memuat...' : 'Refresh Data'}
                </button>
            </div>

            {/* Metric Cards Ringkasan Kas (Grid 2x2 di HP, 4 di PC - Disamakan dengan halaman lain) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Card 1 */}
                <div className="bg-gradient-to-b from-cyan-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
                    <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Total Kas Masuk</p>
                        <p className="text-sm sm:text-lg font-extrabold text-cyan-400 mt-1 truncate">
                            Rp {metrik.totalMasuk.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">
                        💰
                    </span>
                </div>

                {/* Card 2 */}
                <div className="bg-gradient-to-b from-blue-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
                    <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Via Midtrans</p>
                        <p className="text-sm sm:text-lg font-extrabold text-blue-400 mt-1 truncate">
                            Rp {metrik.totalMidtrans.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">
                        🌐
                    </span>
                </div>

                {/* Card 3 */}
                <div className="bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
                    <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Kas Tunai (Cash)</p>
                        <p className="text-sm sm:text-lg font-extrabold text-emerald-400 mt-1 truncate">
                            Rp {metrik.totalTunai.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">
                        💵
                    </span>
                </div>

                {/* Card 4 */}
                <div className="bg-gradient-to-b from-amber-950/30 to-slate-900/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out flex items-center justify-between">
                    <div>
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-400">Transaksi Hari Ini</p>
                        <p className="text-sm sm:text-lg font-extrabold text-amber-400 mt-1">
                            {metrik.transaksiHariIni} Trx
                        </p>
                    </div>
                    <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0">
                        ⚡
                    </span>
                </div>
            </div>

            {/* Tabel Riwayat Pembayaran */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                        <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-800/80">
                            <tr>
                                <th className="px-4 sm:px-6 py-3.5 align-middle">Waktu</th>
                                <th className="px-4 sm:px-6 py-3.5 align-middle">Pelanggan</th>
                                <th className="px-4 sm:px-6 py-3.5 align-middle">Nominal</th>
                                <th className="px-4 sm:px-6 py-3.5 align-middle">Metode</th>
                                <th className="px-4 sm:px-6 py-3.5 text-right align-middle">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        Memuat riwayat transaksi...
                                    </td>
                                </tr>
                            ) : pembayaran.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="text-slate-500 text-3xl mb-2">📭</div>
                                        <div className="text-slate-400 font-medium text-xs">Belum ada pembayaran masuk.</div>
                                        <div className="text-slate-500 text-[11px] mt-1">Transaksi yang berhasil dibayar akan otomatis tercatat di buku kas ini.</div>
                                    </td>
                                </tr>
                            ) : (
                                pembayaran.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                                        <td className="px-4 sm:px-6 py-4 font-mono text-[11px] sm:text-xs text-slate-300 align-middle whitespace-nowrap">
                                            {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 font-bold text-white text-xs sm:text-sm align-middle">
                                            {item.tagihan?.pelanggan?.nama || 'Pelanggan Umum'}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 font-bold text-cyan-400 text-xs sm:text-sm align-middle">
                                            Rp {Number(item.jumlah_bayar || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 align-middle">
                                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                                {item.metode_pembayaran || 'TUNAI'}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-right space-x-1.5 align-middle whitespace-nowrap">
                                            <button className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold transition border border-slate-700">
                                                🖨️ Struk
                                            </button>
                                            <button className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 rounded-xl text-[11px] font-semibold transition border border-emerald-800">
                                                💬 Nota
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}