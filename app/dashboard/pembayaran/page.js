'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PembayaranPage() {
    const [pembayaran, setPembayaran] = useState([])
    const [loading, setLoading] = useState(true)

    // State Filter & Pencarian
    const [search, setSearch] = useState('')
    const [filterMetode, setFilterMetode] = useState('semua')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchPembayaran()
    }, [])

    const fetchPembayaran = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('pembayaran')
                .select('*, tagihan(id, pelanggan(nama, kode_pelanggan, no_wa))')
                .order('tanggal_bayar', { ascending: false })

            if (error) throw error

            if (data) {
                setPembayaran(data)
            }
        } catch (err) {
            console.error('DEBUG FETCH PEMBAYARAN ERROR:', err.message || err)
            alert('Maaf, gagal memuat data pembayaran. Silakan coba beberapa saat lagi.')
        } finally {
            setLoading(false)
        }
    }

    // Filter Data Pembayaran Real-time
    const filteredPembayaran = useMemo(() => {
        return pembayaran.filter((item) => {
            const nama = item.tagihan?.pelanggan?.nama?.toLowerCase() || ''
            const kodePelanggan = item.tagihan?.pelanggan?.kode_pelanggan?.toLowerCase() || ''
            const tagihanId = item.tagihan_id ? String(item.tagihan_id).toLowerCase() : ''
            const referensi = item.referensi_pembayaran?.toLowerCase() || ''
            const noWa = item.tagihan?.pelanggan?.no_wa || ''
            const lowerSearch = search.toLowerCase()

            const matchSearch =
                !search ||
                nama.includes(lowerSearch) ||
                kodePelanggan.includes(lowerSearch) ||
                tagihanId.includes(lowerSearch) ||
                referensi.includes(lowerSearch) ||
                noWa.includes(lowerSearch)

            // Filter Metode Pembayaran
            let matchMetode = true
            if (filterMetode !== 'semua') {
                const met = item.metode_pembayaran?.toLowerCase() || ''
                if (filterMetode === 'cash') {
                    matchMetode = met === 'cash' || met === 'tunai'
                } else {
                    matchMetode = met === filterMetode
                }
            }

            // Filter Rentang Tanggal (Date Range)
            let matchDate = true
            if (item.tanggal_bayar) {
                const itemDateStr = item.tanggal_bayar.split('T')[0]
                if (startDate && itemDateStr < startDate) {
                    matchDate = false
                }
                if (endDate && itemDateStr > endDate) {
                    matchDate = false
                }
            }

            return matchSearch && matchMetode && matchDate
        })
    }, [pembayaran, search, filterMetode, startDate, endDate])

    // Hitung Metrik Kas Berdasarkan Data yang Sedang Terfilter
    const metrik = useMemo(() => {
        let totalMasuk = 0
        let totalMidtrans = 0
        let totalTunai = 0
        let transaksiHariIni = 0

        const hariIni = new Date().toISOString().split('T')[0]

        filteredPembayaran.forEach(item => {
            const nominal = Number(item.jumlah_bayar || 0)
            totalMasuk += nominal

            const met = item.metode_pembayaran?.toUpperCase()
            if (met === 'TUNAI' || met === 'CASH') {
                totalTunai += nominal
            } else {
                totalMidtrans += nominal
            }

            if (item.tanggal_bayar && item.tanggal_bayar.startsWith(hariIni)) {
                transaksiHariIni++
            }
        })

        return { totalMasuk, totalMidtrans, totalTunai, transaksiHariIni }
    }, [filteredPembayaran])

    // Quick filter preset tanggal
    const handleQuickDate = (type) => {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]

        if (type === 'hari_ini') {
            setStartDate(todayStr)
            setEndDate(todayStr)
        } else if (type === '7_hari') {
            const d = new Date()
            d.setDate(d.getDate() - 7)
            setStartDate(d.toISOString().split('T')[0])
            setEndDate(todayStr)
        } else if (type === 'bulan_ini') {
            const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
            setStartDate(startMonth)
            setEndDate(todayStr)
        } else if (type === 'semua') {
            setStartDate('')
            setEndDate('')
        }
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
                        Buku kas harian, mutasi transaksi, & riwayat pembayaran pelanggan WiFi.
                    </p>
                </div>
                <button
                    onClick={fetchPembayaran}
                    disabled={loading}
                    className="self-end sm:self-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                    <span>🔄</span> {loading ? 'Memuat...' : 'Refresh'}
                </button>
            </div>

            {/* Metric Cards Ringkasan Kas (Menyesuaikan Filter yang Aktif) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Total Kas Masuk', val: formatRupiah(metrik.totalMasuk), color: 'text-cyan-400', icon: '💰', bgIcon: 'bg-cyan-500/15 text-cyan-400', gradient: 'from-cyan-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-cyan-500/10 hover:border-cyan-500/50' },
                    { label: 'Via Midtrans / Gateway', val: formatRupiah(metrik.totalMidtrans), color: 'text-blue-400', icon: '🌐', bgIcon: 'bg-blue-500/15 text-blue-400', gradient: 'from-blue-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-blue-500/10 hover:border-blue-500/50' },
                    { label: 'Kas Tunai (Cash)', val: formatRupiah(metrik.totalTunai), color: 'text-emerald-400', icon: '💵', bgIcon: 'bg-emerald-500/15 text-emerald-400', gradient: 'from-emerald-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-emerald-500/10 hover:border-emerald-500/50' },
                    { label: 'Transaksi Terhitung', val: `${filteredPembayaran.length} Trx`, color: 'text-amber-400', icon: '⚡', bgIcon: 'bg-amber-500/15 text-amber-400', gradient: 'from-amber-950/30 to-slate-900/90', hoverShadow: 'hover:shadow-amber-500/10 hover:border-amber-500/50' },
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

            {/* Baris Pencarian & Filter Rentang Tanggal */}
            <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl space-y-3.5 shadow-xl shadow-black/20">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Input Search Bar */}
                    <div className="md:col-span-6 flex items-center gap-2.5 bg-slate-950 border border-slate-800 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/30 px-3.5 py-2.5 rounded-xl transition">
                        <span className="text-slate-400 text-xs">🔍</span>
                        <input
                            type="text"
                            placeholder="Cari Nama Pelanggan, ID Tagihan, No Referensi..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="text-slate-500 hover:text-slate-300 text-xs px-1"
                                title="Hapus pencarian"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Filter Rentang Tanggal (Mulai & Selesai) */}
                    <div className="md:col-span-4 flex items-center gap-2">
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-cyan-500">
                            <span className="block text-[9px] text-slate-500 uppercase font-semibold">Dari</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-transparent text-xs text-slate-200 font-mono focus:outline-none"
                            />
                        </div>
                        <span className="text-slate-500 text-xs font-bold">-</span>
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-cyan-500">
                            <span className="block text-[9px] text-slate-500 uppercase font-semibold">Sampai</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-transparent text-xs text-slate-200 font-mono focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Filter Metode Pembayaran */}
                    <div className="md:col-span-2">
                        <select
                            value={filterMetode}
                            onChange={(e) => setFilterMetode(e.target.value)}
                            className="w-full h-full min-h-[42px] px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                            <option value="semua">Semua Metode</option>
                            <option value="cash">Tunai (Cash)</option>
                            <option value="transfer">Transfer Bank</option>
                            <option value="qris">QRIS</option>
                            <option value="midtrans">Midtrans</option>
                        </select>
                    </div>
                </div>

                {/* Preset Rentang Tanggal Cepat & Status Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-500 mr-1">Preset:</span>
                        {[
                            { id: 'hari_ini', label: 'Hari Ini' },
                            { id: '7_hari', label: '7 Hari Terakhir' },
                            { id: 'bulan_ini', label: 'Bulan Ini' },
                            { id: 'semua', label: 'Semua Waktu' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => handleQuickDate(btn.id)}
                                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] text-slate-300 transition"
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {(search || filterMetode !== 'semua' || startDate || endDate) && (
                        <div className="flex items-center gap-2">
                            <span>
                                Ditemukan <strong>{filteredPembayaran.length}</strong> transaksi
                            </span>
                            <button
                                onClick={() => {
                                    setSearch('')
                                    setFilterMetode('semua')
                                    setStartDate('')
                                    setEndDate('')
                                }}
                                className="text-cyan-400 hover:underline text-[11px]"
                            >
                                Reset Filter
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Daftar Riwayat Pembayaran: Mobile Card View & Desktop Table View */}
            <div className="space-y-3">
                {loading ? (
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                        Memuat riwayat transaksi...
                    </div>
                ) : filteredPembayaran.length === 0 ? (
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="text-3xl mb-1">📭</span>
                            <span className="font-medium text-slate-400 text-xs">
                                {search || filterMetode !== 'semua' || startDate || endDate
                                    ? 'Tidak ada transaksi yang cocok dengan filter / pencarian.'
                                    : 'Belum ada pembayaran masuk.'}
                            </span>
                            <span className="text-[11px] text-slate-600">
                                {search || filterMetode !== 'semua' || startDate || endDate
                                    ? 'Coba ubah kata kunci atau rentang tanggal.'
                                    : 'Transaksi yang berhasil dibayar akan otomatis tercatat di buku kas ini.'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tampilan Card khusus Mobile (md:hidden) */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filteredPembayaran.map((item) => (
                                <div key={item.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                        <span className="font-mono text-slate-400 text-[11px]">
                                            {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleString('id-ID') : '-'}
                                        </span>
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                            {item.metode_pembayaran || 'TUNAI'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">PELANGGAN</span>
                                            <span className="font-bold text-white text-sm">
                                                {item.tagihan?.pelanggan?.nama || 'Pelanggan Umum'}
                                            </span>
                                            {item.tagihan?.pelanggan?.kode_pelanggan && (
                                                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                                                    {item.tagihan.pelanggan.kode_pelanggan}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-slate-500 block text-[10px]">NOMINAL</span>
                                            <span className="font-extrabold text-cyan-400 text-sm">{formatRupiah(item.jumlah_bayar)}</span>
                                        </div>
                                    </div>

                                    {(item.referensi_pembayaran || item.catatan) && (
                                        <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
                                            {item.referensi_pembayaran && (
                                                <div>Ref: <span className="text-slate-300">{item.referensi_pembayaran}</span></div>
                                            )}
                                            {item.catatan && (
                                                <div className="text-slate-400 italic font-sans">{item.catatan}</div>
                                            )}
                                        </div>
                                    )}
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
                                            <th className="px-4 sm:px-6 py-3.5 align-middle font-bold">Referensi / Catatan</th>
                                            <th className="px-4 sm:px-6 py-3.5 align-middle font-bold text-right">Diterima Oleh</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {filteredPembayaran.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                                                <td className="px-4 sm:px-6 py-4 font-mono text-[11px] sm:text-xs text-slate-300 align-middle whitespace-nowrap">
                                                    {item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 align-middle">
                                                    <div className="font-bold text-white text-xs sm:text-sm">
                                                        {item.tagihan?.pelanggan?.nama || 'Pelanggan Umum'}
                                                    </div>
                                                    {item.tagihan?.pelanggan?.kode_pelanggan && (
                                                        <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                                                            {item.tagihan.pelanggan.kode_pelanggan}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 font-bold text-cyan-400 text-xs sm:text-sm align-middle whitespace-nowrap">
                                                    {formatRupiah(item.jumlah_bayar)}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 align-middle whitespace-nowrap">
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                                        {item.metode_pembayaran || 'TUNAI'}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 align-middle text-xs">
                                                    {item.referensi_pembayaran && (
                                                        <div className="font-mono text-slate-300 text-[11px]">
                                                            Ref: {item.referensi_pembayaran}
                                                        </div>
                                                    )}
                                                    {item.catatan && (
                                                        <div className="text-slate-400 text-[11px] italic">
                                                            {item.catatan}
                                                        </div>
                                                    )}
                                                    {!item.referensi_pembayaran && !item.catatan && (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 sm:px-6 py-4 text-right align-middle text-xs text-slate-400 font-medium">
                                                    {item.diterima_oleh || 'Admin'}
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