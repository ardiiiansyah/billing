'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PembayaranPage() {
    const [pembayaran, setPembayaran] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPembayaran()
    }, [])

    const fetchPembayaran = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('pembayaran')
            .select('*, tagihan(pelanggan(nama))')
            .order('created_at', { ascending: false })

        if (data) setPembayaran(data)
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Riwayat Pembayaran</h1>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                {loading ? (
                    <p className="text-slate-500 text-sm">Memuat data...</p>
                ) : (
                    <p className="text-slate-400 text-sm">Total transaksi masuk: {pembayaran.length}</p>
                )}
            </div>
        </div>
    )
}