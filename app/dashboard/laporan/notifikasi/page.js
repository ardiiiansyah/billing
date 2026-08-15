'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LogNotifikasiPage() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchLogs()
    }, [])

    const fetchLogs = async () => {
        setLoading(true)

        try {
            // 1. Hapus log yang berumur lebih dari 30 hari secara otomatis
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            await supabase
                .from('log_notifikasi')
                .delete()
                .lt('created_at', thirtyDaysAgo.toISOString())

            // 2. Ambil data log terbaru setelah pembersihan
            const { data, error } = await supabase
                .from('log_notifikasi')
                .select(`
                    id,
                    no_wa,
                    jenis_pesan,
                    pesan,
                    status,
                    created_at,
                    pelanggan ( nama )
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            if (data) {
                setLogs(data)
            }
        } catch (err) {
            console.error('Error fetching/cleaning logs:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter((item) => {
        const nama = item.pelanggan?.nama?.toLowerCase() || ''
        const wa = item.no_wa || ''
        const jenis = item.jenis_pesan?.toLowerCase() || ''
        const term = searchTerm.toLowerCase()
        return nama.includes(term) || wa.includes(term) || jenis.includes(term)
    })

    return (
        <div className="space-y-6">
            {/* Header Glassmorphism */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl shadow-black/20 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                        Riwayat Notifikasi WA
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                        Log seluruh pesan WhatsApp yang dikirimkan oleh sistem (otomatis dibersihkan jika &gt; 30 hari)[cite: 3].
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="self-end sm:self-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                >
                    <span>🔄</span> {loading ? 'Memuat...' : 'Refresh Log'}
                </button>
            </div>

            {/* Input Search */}
            <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-2xl shadow-xl shadow-black/20">
                <div className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 px-3.5 py-2.5 rounded-xl focus-within:border-cyan-500/80 transition duration-200">
                    <span className="text-slate-400 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari berdasarkan nama pelanggan, nomor WA, atau jenis pesan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-xs text-slate-500 hover:text-slate-300">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Daftar Log: Mobile Card View & Desktop Table View */}
            <div className="space-y-3">
                {loading ? (
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
                        Memuat riwayat log notifikasi...
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="text-3xl mb-1">📭</span>
                            <span className="font-medium text-slate-400">Belum ada riwayat notifikasi dikirim.</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tampilan Card khusus Mobile (md:hidden) */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                                        <span className="font-mono text-slate-400 text-[11px]">
                                            {new Date(log.created_at).toLocaleString('id-ID', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </span>
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'terkirim'
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                            }`}>
                                            {log.status === 'terkirim' ? '✓ Terkirim' : '✕ Gagal'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">PELANGGAN & WA</span>
                                            <span className="font-bold text-white text-sm">{log.pelanggan?.nama || 'Non-Pelanggan'}</span>
                                            <div className="font-mono text-xs text-slate-400 mt-0.5">📱 {log.no_wa}</div>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[10px] text-right">KATEGORI</span>
                                            <span className="inline-block mt-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold">
                                                {log.jenis_pesan}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-800/80">
                                        <span className="text-slate-500 block text-[10px] mb-1">ISI PESAN</span>
                                        <p className="text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[11px] leading-relaxed max-h-24 overflow-y-auto">
                                            {log.pesan}
                                        </p>
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
                                            <th className="py-3.5 px-6 font-bold">Waktu Dikirim</th>
                                            <th className="py-3.5 px-6 font-bold">Pelanggan</th>
                                            <th className="py-3.5 px-6 font-bold">No. WA</th>
                                            <th className="py-3.5 px-6 font-bold">Kategori</th>
                                            <th className="py-3.5 px-6 font-bold">Isi Pesan</th>
                                            <th className="py-3.5 px-6 font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {filteredLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                                                <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-400 font-mono align-middle">
                                                    {new Date(log.created_at).toLocaleString('id-ID', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short',
                                                    })}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-white text-xs sm:text-sm align-middle">
                                                    {log.pelanggan?.nama || 'Non-Pelanggan'}
                                                </td>
                                                <td className="py-4 px-6 font-mono text-xs text-slate-300 align-middle">{log.no_wa}</td>
                                                <td className="py-4 px-6 whitespace-nowrap align-middle">
                                                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                                        {log.jenis_pesan}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 max-w-xs truncate text-slate-300 text-xs align-middle" title={log.pesan}>
                                                    {log.pesan}
                                                </td>
                                                <td className="py-4 px-6 whitespace-nowrap align-middle">
                                                    {log.status === 'terkirim' ? (
                                                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                                            ✓ Terkirim
                                                        </span>
                                                    ) : (
                                                        <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                                            ✕ Gagal
                                                        </span>
                                                    )}
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