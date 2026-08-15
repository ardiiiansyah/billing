'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import * as XLSX from 'xlsx'

export default function LaporanKeuanganPage() {
    const [loading, setLoading] = useState(true)
    const [tagihanList, setTagihanList] = useState([])
    const [wilayahList, setWilayahList] = useState([])

    // Filter States (default bulan = 0 artinya Semua Bulan / Tahunan)
    const [selectedWilayah, setSelectedWilayah] = useState('')
    const [selectedBulan, setSelectedBulan] = useState(0)
    const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear())
    const [selectedStatus, setSelectedStatus] = useState('')

    // Summary States
    const [summary, setSummary] = useState({
        totalPemasukan: 0,
        totalMenunggak: 0,
        totalTagihan: 0,
        jumlahLunas: 0,
        jumlahMenunggak: 0
    })

    const namaBulanList = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]

    useEffect(() => {
        fetchWilayah()
    }, [])

    useEffect(() => {
        fetchLaporan()
    }, [selectedWilayah, selectedBulan, selectedTahun, selectedStatus])

    async function fetchWilayah() {
        const { data } = await supabase.from('wilayah').select('*').order('rw').order('rt')
        setWilayahList(data || [])
    }

    async function fetchLaporan() {
        setLoading(true)

        // Query tagihan filter berdasarkan tahun
        let query = supabase
            .from('tagihan')
            .select(`
                *,
                pelanggan (
                    id,
                    nama,
                    no_wa,
                    wilayah_id,
                    paket_id,
                    wilayah (*),
                    paket (*)
                ),
                pembayaran (
                    created_at
                )
            `)
            .eq('tahun', Number(selectedTahun))
            .order('created_at', { ascending: false })

        // Jika memilih bulan spesifik (bukan Semua Bulan / 0)
        if (selectedBulan && Number(selectedBulan) !== 0) {
            query = query.eq('bulan', Number(selectedBulan))
        }

        if (selectedStatus) {
            query = query.eq('status', selectedStatus)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching laporan:', error)
            setLoading(false)
            return
        }

        let filteredData = data || []

        // Filter manual berdasarkan wilayah jika dipilih
        if (selectedWilayah) {
            filteredData = filteredData.filter(
                (item) => String(item.pelanggan?.wilayah_id) === String(selectedWilayah) || String(item.pelanggan?.wilayah?.id) === String(selectedWilayah)
            )
        }

        setTagihanList(filteredData)

        // Hitung Ringkasan (Summary)
        let pemasukan = 0
        let nunggak = 0
        let lunasCount = 0
        let nunggakCount = 0

        filteredData.forEach((item) => {
            const nominal = Number(item.jumlah_tagihan) || Number(item.nominal) || 0
            if (item.status === 'lunas') {
                pemasukan += nominal
                lunasCount++
            } else {
                nunggak += nominal
                nunggakCount++
            }
        })

        setSummary({
            totalPemasukan: pemasukan,
            totalMenunggak: nunggak,
            totalTagihan: pemasukan + nunggak,
            jumlahLunas: lunasCount,
            jumlahMenunggak: nunggakCount
        })

        setLoading(false)
    }

    // Function Export ke Excel
    const handleExportExcel = () => {
        if (tagihanList.length === 0) {
            alert('Tidak ada data untuk diexport.')
            return
        }

        const excelData = tagihanList.map((item, index) => ({
            No: index + 1,
            'Nama Pelanggan': item.pelanggan?.nama || '-',
            'No. WhatsApp': item.pelanggan?.no_wa || '-',
            Wilayah: item.pelanggan?.wilayah ? `RT ${item.pelanggan.wilayah.rt}/RW ${item.pelanggan.wilayah.rw}` : '-',
            Paket: item.pelanggan?.paket?.nama_paket || '-',
            Bulan: item.bulan ? (namaBulanList[Number(item.bulan) - 1] || item.bulan) : '-', // Konversi Angka ke Nama Bulan
            Tahun: item.tahun || '-',
            Nominal: Number(item.jumlah_tagihan) || Number(item.nominal) || 0,
            Status: item.status?.toUpperCase() || '-',
            'Metode Bayar': item.metode_pembayaran || '-',
            'Tanggal Tagihan': item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-',
            'Tanggal Bayar': item.tanggal_bayar ? new Date(item.tanggal_bayar).toLocaleDateString('id-ID') : '-'
        }))

        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Keuangan')

        worksheet['!cols'] = [
            { wch: 5 },
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 20 },
            { wch: 14 },
            { wch: 8 },
            { wch: 15 },
            { wch: 12 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ]

        const namaFileBulan = Number(selectedBulan) === 0
            ? 'Tahunan'
            : (namaBulanList[selectedBulan - 1] || 'Bulanan')

        XLSX.writeFile(workbook, `Laporan_Keuangan_SultanWiFi_${namaFileBulan}_${selectedTahun}.xlsx`)
    }

    const daftarBulan = [
        { val: 0, label: '🗓️ Semua Bulan (Tahunan)' },
        { val: 1, label: 'Januari' },
        { val: 2, label: 'Februari' },
        { val: 3, label: 'Maret' },
        { val: 4, label: 'April' },
        { val: 5, label: 'Mei' },
        { val: 6, label: 'Juni' },
        { val: 7, label: 'Juli' },
        { val: 8, label: 'Agustus' },
        { val: 9, label: 'September' },
        { val: 10, label: 'Oktober' },
        { val: 11, label: 'November' },
        { val: 12, label: 'Desember' }
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Laporan Keuangan</h1>
                    <p className="text-slate-400 text-sm mt-1">Rekapitulasi transaksi, pendapatan, dan tunggakan tagihan bulanan & tahunan.</p>
                </div>
                <button
                    onClick={handleExportExcel}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center gap-2 w-fit"
                >
                    <span>📊</span> Export Excel
                </button>
            </div>

            {/* Cards Summary dengan Efek 3D Hover */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Pemasukan (Lunas)</p>
                        <span className="text-base">📈</span>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-400 mt-2 font-mono">
                        Rp {summary.totalPemasukan.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{summary.jumlahLunas} transaksi lunas</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-500/50 cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Menunggak</p>
                        <span className="text-base">⚠️</span>
                    </div>
                    <p className="text-2xl font-extrabold text-rose-400 mt-2 font-mono">
                        Rp {summary.totalMenunggak.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{summary.jumlahMenunggak} tagihan belum dibayar</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/50 cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Potensi Tagihan</p>
                        <span className="text-base">💰</span>
                    </div>
                    <p className="text-2xl font-extrabold text-cyan-400 mt-2 font-mono">
                        Rp {summary.totalTagihan.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Payment Rate: {summary.jumlahLunas + summary.jumlahMenunggak > 0
                            ? Math.round((summary.jumlahLunas / (summary.jumlahLunas + summary.jumlahMenunggak)) * 100)
                            : 0}%
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Periode Bulan</label>
                    <select
                        value={selectedBulan}
                        onChange={(e) => setSelectedBulan(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        {daftarBulan.map((b) => (
                            <option key={b.val} value={b.val}>{b.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Tahun</label>
                    <select
                        value={selectedTahun}
                        onChange={(e) => setSelectedTahun(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        {[2025, 2026, 2027].map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Wilayah</label>
                    <select
                        value={selectedWilayah}
                        onChange={(e) => setSelectedWilayah(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="">Semua Wilayah</option>
                        {wilayahList.map((w) => (
                            <option key={w.id} value={w.id}>
                                RT {w.rt} / RW {w.rw} {w.nama ? `(${w.nama})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Status Tagihan</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="">Semua Status</option>
                        <option value="lunas">Lunas</option>
                        <option value="belum_bayar">Belum Bayar</option>
                    </select>
                </div>
            </div>

            {/* Tabel Tagihan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Pelanggan</th>
                                <th className="px-6 py-4">Wilayah</th>
                                <th className="px-6 py-4">Paket</th>
                                <th className="px-6 py-4">Bulan / Thn</th>
                                <th className="px-6 py-4">Nominal</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Metode Bayar</th>
                                <th className="px-6 py-4">Tgl Bayar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Memuat laporan keuangan...</td>
                                </tr>
                            ) : tagihanList.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Tidak ada data transaksi pada periode ini.</td>
                                </tr>
                            ) : (
                                tagihanList.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-white">{item.pelanggan?.nama || '-'}</div>
                                            <div className="text-xs text-slate-500 font-mono">{item.pelanggan?.no_wa || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-cyan-400 text-xs">
                                            {item.pelanggan?.wilayah ? `RT ${item.pelanggan.wilayah.rt}/RW ${item.pelanggan.wilayah.rw}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-300">
                                            {item.pelanggan?.paket?.nama_paket || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-300 font-semibold">
                                            {item.bulan ? (namaBulanList[Number(item.bulan) - 1] || item.bulan) : '-'} {item.tahun}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            Rp {(Number(item.jumlah_tagihan) || Number(item.nominal) || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'lunas'
                                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                                : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                                                }`}>
                                                {item.status === 'lunas' ? 'LUNAS' : 'BELUM BAYAR'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400">
                                            {item.metode_pembayaran || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                                            {item.pembayaran && item.pembayaran.length > 0
                                                ? new Date(item.pembayaran[0].created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })
                                                : '-'
                                            }
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