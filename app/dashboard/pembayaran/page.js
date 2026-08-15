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
                .select('*')
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
            const nominal = Number(item.jumlah_dibayar)
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

            {/* Header Halaman */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Riwayat Pembayaran</h1>
                    <p className="text-slate-400 text-sm mt-1">Buku kas harian & log mutasi transaksi WiFi.</p>
                </div>
                <button
                    onClick={fetchPembayaran}
                    disabled={loading}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed text-slate-200 text-sm font-semibold rounded-xl transition border border-slate-700 flex items-center gap-2 w-fit shadow-sm"
                >
                    <span>🔄</span> {loading ? 'Memuat...' : 'Refresh Data'}
                </button>
            </div>

            {/* Metric Cards Ringkasan Kas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition hover:border-cyan-500/50">
                    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Kas Masuk</div>
                    <div className="text-2xl font-bold text-cyan-400">
                        Rp {metrik.totalMasuk.toLocaleString('id-ID')}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition hover:border-blue-500/50">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Via Midtrans</div>
                        <span className="text-base">🌐</span>
                    </div>
                    <div className="text-xl font-bold text-blue-400">
                        Rp {metrik.totalMidtrans.toLocaleString('id-ID')}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition hover:border-emerald-500/50">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Kas Tunai (Cash)</div>
                        <span className="text-base">💵</span>
                    </div>
                    <div className="text-xl font-bold text-emerald-400">
                        Rp {metrik.totalTunai.toLocaleString('id-ID')}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition hover:border-amber-500/50">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Transaksi Hari Ini</div>
                        <span className="text-base">⚡</span>
                    </div>
                    <div className="text-xl font-bold text-amber-400">
                        {metrik.transaksiHariIni} Transaksi
                    </div>
                </div>
            </div>

            {/* Tabel Riwayat Pembayaran */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4 align-middle">Waktu</th>
                                <th className="px-6 py-4 align-middle">Pelanggan</th>
                                <th className="px-6 py-4 align-middle">Nominal</th>
                                <th className="px-6 py-4 align-middle">Metode</th>
                                <th className="px-6 py-4 text-right align-middle">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Memuat riwayat transaksi...
                                    </td>
                                </tr>
                            ) : pembayaran.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="text-slate-500 text-4xl mb-3">📭</div>
                                        <div className="text-slate-400 font-medium">Belum ada pembayaran masuk.</div>
                                        <div className="text-slate-500 text-xs mt-1">Transaksi yang berhasil dibayar akan otomatis tercatat di buku kas ini.</div>
                                    </td>
                                </tr>
                            ) : (
                                pembayaran.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-300 align-middle">
                                            {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleString('id-ID') : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white align-middle">
                                            {item.tagihan?.pelanggan?.nama || 'Pelanggan Umum'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-cyan-400 align-middle">
                                            Rp {Number(item.jumlah_dibayar).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                                {item.metode_pembayaran || 'TUNAI'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2 align-middle">
                                            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700">
                                                🖨️ Struk
                                            </button>
                                            <button className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 rounded-xl text-xs font-semibold transition border border-emerald-800">
                                                💬 Kirim Nota
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