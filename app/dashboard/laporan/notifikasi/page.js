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

        if (!error && data) {
            setLogs(data)
        }
        setLoading(false)
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Riwayat Notifikasi WA</h1>
                    <p className="text-slate-400 text-sm">Log seluruh pesan WhatsApp yang dikirimkan oleh sistem.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm transition border border-slate-700 flex items-center gap-2 w-fit"
                >
                    🔄 Refresh Log
                </button>
            </div>

            {/* Input Search */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <input
                    type="text"
                    placeholder="Cari berdasarkan nama pelanggan, nomor WA, atau jenis pesan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
            </div>

            {/* Tabel Log */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="py-3.5 px-4">Waktu Dikirim</th>
                                <th className="py-3.5 px-4">Pelanggan</th>
                                <th className="py-3.5 px-4">No. WA</th>
                                <th className="py-3.5 px-4">Kategori</th>
                                <th className="py-3.5 px-4">Isi Pesan</th>
                                <th className="py-3.5 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-500">
                                        Memuat riwayat log notifikasi...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-500">
                                        Belum ada riwayat notifikasi dikirim.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                                            {new Date(log.created_at).toLocaleString('id-ID', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-white">
                                            {log.pelanggan?.nama || 'Non-Pelanggan'}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{log.no_wa}</td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                                {log.jenis_pesan}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-300 text-xs" title={log.pesan}>
                                            {log.pesan}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {log.status === 'terkirim' ? (
                                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                    ✓ Terkirim
                                                </span>
                                            ) : (
                                                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                    ✕ Gagal
                                                </span>
                                            )}
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