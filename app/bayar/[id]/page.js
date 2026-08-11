'use client'

import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { formatBulan, formatRupiah } from '@/lib/whatsapp'

export default function BayarPage({ params }) {
    const { id } = use(params)
    const [tagihan, setTagihan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchTagihan()
    }, [])

    async function fetchTagihan() {
        const { data, error } = await supabase
            .from('tagihan')
            .select('*, pelanggan(nama, kode_pelanggan, no_wa, alamat, paket(nama_paket, kecepatan))')
            .eq('id', id)
            .single()

        if (error || !data) {
            setError('Tagihan tidak ditemukan.')
        } else {
            setTagihan(data)
        }
        setLoading(false)
    }

    const handleBayar = async () => {
        if (!tagihan) return
        setPaying(true)

        try {
            const res = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tagihan_id: tagihan.id,
                    pelanggan_nama: tagihan.pelanggan?.nama,
                    pelanggan_wa: tagihan.pelanggan?.no_wa,
                    jumlah: tagihan.jumlah_tagihan,
                    bulan: tagihan.bulan,
                    tahun: tagihan.tahun,
                }),
            })

            const data = await res.json()

            if (!res.ok || data.error) {
                alert('Gagal membuat link pembayaran: ' + (data.error || 'Unknown error'))
                return
            }

            window.location.href = data.payment_url
        } catch (err) {
            alert('Error koneksi ke server.')
        } finally {
            setPaying(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-slate-400">Memuat tagihan...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <div className="text-white text-lg font-semibold">{error}</div>
                    <div className="text-slate-400 text-sm mt-2">Pastikan link yang kamu gunakan sudah benar.</div>
                </div>
            </div>
        )
    }

    const isLunas = tagihan.status_pembayaran === 'lunas'

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-cyan-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">📶</div>
                    <h1 className="text-xl font-bold text-white">Sultan WiFi</h1>
                    <p className="text-slate-400 text-sm">Portal Pembayaran Pelanggan</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {isLunas ? (
                        <div className="bg-emerald-900/50 border-b border-emerald-800 px-5 py-3 flex items-center gap-2">
                            <span className="text-emerald-400 text-lg">✅</span>
                            <span className="text-emerald-400 font-semibold text-sm">Tagihan ini sudah LUNAS</span>
                        </div>
                    ) : (
                        <div className="bg-red-900/30 border-b border-red-900 px-5 py-3 flex items-center gap-2">
                            <span className="text-red-400 text-lg">⚠️</span>
                            <span className="text-red-400 font-semibold text-sm">Tagihan belum dibayar</span>
                        </div>
                    )}

                    <div className="p-5 border-b border-slate-800">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="text-white font-bold text-lg">{tagihan.pelanggan?.nama}</div>
                                <div className="text-slate-400 text-xs font-mono">{tagihan.pelanggan?.kode_pelanggan}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400">Paket</div>
                                <div className="text-cyan-400 text-sm font-semibold">{tagihan.pelanggan?.paket?.nama_paket || '-'}</div>
                                <div className="text-slate-500 text-xs">{tagihan.pelanggan?.paket?.kecepatan}</div>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">{tagihan.pelanggan?.alamat}</div>
                    </div>

                    <div className="p-5 border-b border-slate-800 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Periode</span>
                            <span className="text-white font-medium">Bulan {formatBulan(tagihan.bulan)} {tagihan.tahun}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Jatuh Tempo</span>
                            <span className="text-white">{new Date(tagihan.tanggal_jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Status</span>
                            <span className={`font-semibold ${isLunas ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tagihan.status_pembayaran.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <div className="border-t border-slate-800 pt-3 flex justify-between">
                            <span className="text-slate-300 font-medium">Total Tagihan</span>
                            <span className="text-emerald-400 font-bold text-xl">{formatRupiah(tagihan.jumlah_tagihan)}</span>
                        </div>
                    </div>

                    <div className="p-5">
                        {isLunas ? (
                            <div className="text-center py-3">
                                <div className="text-emerald-400 text-4xl mb-2">🎉</div>
                                <div className="text-emerald-400 font-semibold">Terima kasih sudah membayar!</div>
                                <div className="text-slate-400 text-xs mt-1">Internet kamu tetap aktif bulan ini.</div>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={handleBayar}
                                    disabled={paying}
                                    className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
                                >
                                    {paying ? '⏳ Memproses...' : '💳 Bayar Sekarang'}
                                </button>
                                <p className="text-center text-xs text-slate-500 mt-3">
                                    Pembayaran via Virtual Account, Alfamart, atau Indomaret
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-slate-600 mt-4">
                    Powered by Sultan WiFi Billing System
                </p>
            </div>
        </div>
    )
}