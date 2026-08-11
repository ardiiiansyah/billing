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
        const { data, error } = await supabase
            .from('pembayaran')
            .select('id, jumlah_dibayar, metode_pembayaran, tanggal_bayar, tagihan(pelanggan(nama))')
            .order('tanggal_bayar', { ascending: false })

        if (!error && data) {
            setPembayaran(data)
            kalkulasiMetrik(data)
        }
        setLoading(false)
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

            // Hitung metode
            if (item.metode_pembayaran?.toUpperCase() === 'TUNAI') {
                totalTunai += nominal
            } else {
                totalMidtrans += nominal
            }

            // Hitung transaksi hari ini
            if (item.tanggal_bayar && item.tanggal_bayar.startsWith(hariIni)) {
                transaksiHariIni++
            }
        })

        setMetrik({ totalMasuk, totalMidtrans, totalTunai, transaksiHariIni })
    }

    return (
        <div className="space-y-6">

            {/* Header Halaman */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Riwayat Pembayaran</h1>
                    <p className="text-slate-400 text-sm">Buku kas harian & log mutasi transaksi WiFi.</p>
                </div>
                <button
                    onClick={fetchPembayaran}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm transition border border-slate-700 flex items-center gap-2"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* 🚀 MOCKUP: METRIC CARDS RINGKASAN KAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Kas Masuk */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-cyan-500/50 transition">
                    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Kas Masuk</div>
                    <div className="text-2xl font-bold text-cyan-400">
                        Rp {metrik.totalMasuk.toLocaleString('id-ID')}
                    </div>
                </div>

                {/* Card 2: Pembayaran Midtrans (Online) */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500/50 transition">
                    <div className="flex justify-between items-start">
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Via Midtrans</div>
                        <span className="text-lg">🌐</span>
                    </div>
                    <div className="text-xl font-bold text-blue-400">
                        Rp {metrik.totalMidtrans.toLocaleString('id-ID')}
                    </div>
                </div>

                {/* Card 3: Pembayaran Tunai (Cash) */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-emerald-500/50 transition">
                    <div className="flex justify-between items-start">
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Kas Tunai (Cash)</div>
                        <span className="text-lg">💵</span>
                    </div>
                    <div className="text-xl font-bold text-emerald-400">
                        Rp {metrik.totalTunai.toLocaleString('id-ID')}
                    </div>
                </div>

                {/* Card 4: Transaksi Hari Ini */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-amber-500/50 transition">
                    <div className="flex justify-between items-start">
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Transaksi Hari Ini</div>
                        <span className="text-lg">⚡</span>
                    </div>
                    <div className="text-xl font-bold text-amber-400">
                        {metrik.transaksiHariIni} Transaksi
                    </div>
                </div>
            </div>
            {/* 🚀 AKHIR MOCKUP METRIC CARDS */}

            {/* Tabel Riwayat Pembayaran (Sederhana untuk mock) */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto p-1">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="py-4 px-4">Waktu</th>
                                <th className="py-4 px-4">Pelanggan</th>
                                <th className="py-4 px-4">Nominal</th>
                                <th className="py-4 px-4">Metode</th>
                                <th className="py-4 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-slate-500">Memuat riwayat transaksi...</td>
                                </tr>
                            ) : pembayaran.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-slate-500">Belum ada pembayaran masuk.</td>
                                </tr>
                            ) : (
                                pembayaran.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                                        <td className="py-3 px-4 font-mono text-xs">{new Date(item.tanggal_bayar).toLocaleDateString('id-ID')}</td>
                                        <td className="py-3 px-4 font-medium text-white">{item.tagihan?.pelanggan?.nama}</td>
                                        <td className="py-3 px-4 font-bold text-cyan-400">Rp {Number(item.jumlah_dibayar).toLocaleString('id-ID')}</td>
                                        <td className="py-3 px-4 text-xs font-semibold">{item.metode_pembayaran || 'TUNAI'}</td>
                                        <td className="py-3 px-4 text-right space-x-2">
                                            {/* Mock Tombol Cetak & Kirim WA */}
                                            <button className="bg-slate-800 text-slate-300 hover:text-white px-3 py-1 rounded text-xs border border-slate-700">🖨️ Struk</button>
                                            <button className="bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/80 px-3 py-1 rounded text-xs border border-emerald-800">💬 Kirim Nota</button>
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