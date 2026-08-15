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

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val)
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
                    className="self-end sm:self-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center justify-center gap-1.5 shadow-sm"
                >
                    <span>🔄</span> {loading ? 'Memuat...' : 'Refresh'}
                </button>
            </div>

            {/* Metric Cards Ringkasan Kas (Dilengkapi efek hover interaktif) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Total Kas Masuk', val: formatRupiah(metrik.totalMasuk), color: 'text-cyan-400', icon: '💰', bgIcon: 'bg-cyan-500/15 text-cyan-400', gradient: 'from-cyan-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-cyan-500/10 hover:border-cyan-500/50' },
                    { label: 'Via Midtrans', val: formatRupiah(metrik.totalMidtrans), color: 'text-blue-400', icon: '🌐', bgIcon: 'bg-blue-500/15 text-blue-400', gradient: 'from-blue-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-blue-500/10 hover:border-blue-500/50' },
                    { label: 'Kas Tunai (Cash)', val: formatRupiah(metrik.totalTunai), color: 'text-emerald-400', icon: '💵', bgIcon: 'bg-emerald-500/15 text-emerald-400', gradient: 'from-emerald-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-emerald-500/10 hover:border-emerald-500/50' },
                    { label: 'Transaksi Hari Ini', val: `${metrik.transaksiHariIni} Trx`, color: 'text-amber-400', icon: '⚡', bgIcon: 'bg-amber-500/15 text-amber-400', gradient: 'from-amber-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-amber-500/10 hover:border-amber-500/50' },
                ].map((s, i) => (
                    <div
                        key={i}
                        className={`bg-gradient-to-b ${s.gradient} border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl ${s.hoverShadow} cursor-pointer flex items-center justify-between`}
                    >
                        <div>
                            <p className="text-[10px] sm:text-xs font-semibold text-slate-400">{s.label}</p>
                            <p className={`text-sm sm:text-lg font-extrabold mt-1 ${s.color} truncate`}>{s.val}</p>
                        </div>
                        <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm sm:text-base shadow-inner shrink-0 ${s.bgIcon}`}>
                            {s.icon}
                        </span>
                    </div>
                ))}
            </div>

            {/* Daftar Riwayat Pembayaran: Mobile Card View & Desktop Table View */}
            <div className="space-y-3">
                {loading ? (
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                        Memuat riwayat transaksi...
                    </div>
                ) : pembayaran.length === 0 ? (
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="text-3xl mb-1">📭</span>
                            <span className="font-medium text-slate-400 text-xs">Belum ada pembayaran masuk.</span>
                            <span className="text-[11px] text-slate-600">Transaksi yang berhasil dibayar akan otomatis tercatat di buku kas ini.</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tampilan Card khusus Mobile (md:hidden) */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {pembayaran.map((item) => (
                                <div key={item.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                        <span className="font-mono text-slate-400 text-[11px]">
                                            {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleString('id-ID') : '-'}
                                        </span>
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                            {item.metode_pembayaran || 'TUNAI'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">PELANGGAN</span>
                                            <span className="font-bold text-white text-sm">{item.tagihan?.pelanggan?.nama || 'Pelanggan Umum'}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-slate-500 block text-[10px]">NOMINAL</span>
                                            <span className="font-extrabold text-cyan-400 text-sm">{formatRupiah(item.jumlah_bayar)}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                                        <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700">
                                            🖨️ Struk
                                        </button>
                                        <button className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 rounded-xl text-xs font-semibold transition border border-emerald-800">
                                            💬 Nota
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tampilan Tabel khusus Desktop (hidden md:block) */}
                        <div className="hidden md:block bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                                    <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-800/80">
                                        <tr>
                                            <th className="px-4 sm:px-6 py-3.5 align-middle font-bold">Waktu</th>
                                            <th className="px-4 sm:px-6 py-3.5 align-middle font-bold">Pelanggan</th>
                                            <th className="px-4 sm:px-6 py-3.5 align-middle font-bold">Nominal</th>
                                            <th className="px-4 sm:px-6 py-3.5 align-middle font-bold">Metode</th>
                                            <th className="px-4 sm:px-6 py-3.5 text-right align-middle font-bold">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {pembayaran.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                                                <td className="px-4 sm:px-6 py-4 font-mono text-[11px] sm:text-xs text-slate-300 align-middle whitespace-nowrap">
                                                    {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 font-bold text-white text-xs sm:text-sm align-middle">
                                                    {item.tagihan?.pelanggan?.nama || 'Pelanggan Umum'}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 font-bold text-cyan-400 text-xs sm:text-sm align-middle">
                                                    {formatRupiah(item.jumlah_bayar)}
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

        </div>
    )
}