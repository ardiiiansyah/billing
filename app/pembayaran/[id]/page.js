'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function CheckoutPage() {
    const { id } = useParams()
    const [tagihan, setTagihan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)

    useEffect(() => {
        if (id) fetchTagihan()
    }, [id])

    const fetchTagihan = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('tagihan')
            .select('*, pelanggan(nama, no_wa, kode_pelanggan), paket(nama_paket, kecepatan)')
            .eq('id', id)
            .single()

        if (!error && data) {
            setTagihan(data)
        }
        setLoading(false)
    }

    const handlePay = async () => {
        setPaying(true)
        try {
            const res = await fetch('/api/midtrans/charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tagihan_id: tagihan.id,
                    nominal: tagihan.total_bayar || tagihan.jumlah_tagihan,
                    nama_pelanggan: tagihan.pelanggan?.nama || 'Pelanggan Sultan WiFi',
                    no_wa: tagihan.pelanggan?.no_wa || '08123456789',
                }),
            })

            const data = await res.json()

            if (data.redirect_url) {
                window.location.href = data.redirect_url
            } else {
                alert('Gagal memproses pembayaran Midtrans')
            }
        } catch (err) {
            console.error(err)
            alert('Terjadi kesalahan koneksi')
        } finally {
            setPaying(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Memuat tagihan...</div>
    }

    if (!tagihan) {
        return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Tagihan tidak ditemukan</div>
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
                <div className="text-center mb-6">
                    <span className="px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800/50 rounded-full text-xs font-semibold uppercase tracking-wider">
                        Sultan WiFi
                    </span>
                    <h1 className="text-xl font-bold mt-3">Tagihan Internet</h1>
                    <p className="text-slate-400 text-xs mt-1">ID Tagihan: #{tagihan.id.slice(0, 8)}</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Nama Pelanggan</span>
                        <span className="font-medium text-slate-200">{tagihan.pelanggan?.nama}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Kode Pelanggan</span>
                        <span className="font-medium text-slate-200">{tagihan.pelanggan?.kode_pelanggan}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Paket Layanan</span>
                        <span className="font-medium text-cyan-400">{tagihan.paket?.nama_paket} ({tagihan.paket?.kecepatan})</span>
                    </div>
                    <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                        <span className="text-slate-300 font-semibold text-sm">Total Bayar</span>
                        <span className="text-xl font-bold text-green-400">
                            Rp {(tagihan.total_bayar || tagihan.jumlah_tagihan || 0).toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>

                {tagihan.status === 'lunas' ? (
                    <div className="bg-green-950/80 border border-green-800 text-green-300 text-center py-3 rounded-xl font-medium text-sm">
                        ✓ Tagihan Ini Sudah Lunas
                    </div>
                ) : (
                    <button
                        onClick={handlePay}
                        disabled={paying}
                        className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-2xl shadow-lg shadow-cyan-600/20 transition"
                    >
                        {paying ? 'Memproses Pembayaran...' : 'Pilih Metode Bayar (QRIS / Minimarket)'}
                    </button>
                )}
            </div>
        </main>
    )
}