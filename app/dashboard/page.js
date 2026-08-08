'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    pelangganAktif: 0,
    totalPaket: 0,
    tagihanUnpaid: 0,
    pendapatanBulanIni: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        // 1. Total Pelanggan Aktif
        const { count: countPelanggan } = await supabase
          .from('pelanggan')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'aktif')

        // 2. Total Paket
        const { count: countPaket } = await supabase
          .from('paket')
          .select('*', { count: 'exact', head: true })

        // 3. Tagihan Belum Dibayar (Belum Lunas)
        const { data: unpaidData } = await supabase
          .from('tagihan')
          .select('jumlah_tagihan')
          .neq('status_pembayaran', 'lunas')

        const totalUnpaid = unpaidData ? unpaidData.reduce((acc, curr) => acc + Number(curr.jumlah_tagihan), 0) : 0

        // 4. Pendapatan Bulan Ini (Total Pembayaran)
        const { data: paidData } = await supabase
          .from('pembayaran')
          .select('jumlah_bayar')

        const totalPaid = paidData ? paidData.reduce((acc, curr) => acc + Number(curr.jumlah_bayar), 0) : 0

        setStats({
          pelangganAktif: countPelanggan || 0,
          totalPaket: countPaket || 0,
          tagihanUnpaid: totalUnpaid,
          pendapatanBulanIni: totalPaid,
        })
      } catch (err) {
        console.error('Gagal mengambil statistik:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Ringkasan Dashboard</h1>
        <p className="text-slate-400 mt-1">Pantau statistik operasional WiFi RT/RW secara akumulatif.</p>
      </div>

      {/* Grid Cards Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Pelanggan Aktif</span>
            <span className="p-2 bg-emerald-950/60 text-emerald-400 rounded-xl text-lg">👥</span>
          </div>
          <p className="text-3xl font-bold text-white mt-4">{loading ? '...' : stats.pelangganAktif}</p>
          <span className="text-xs text-slate-500 mt-2 block">Rumah / Perangkat terhubung</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Varian Paket</span>
            <span className="p-2 bg-cyan-950/60 text-cyan-400 rounded-xl text-lg">📦</span>
          </div>
          <p className="text-3xl font-bold text-white mt-4">{loading ? '...' : stats.totalPaket}</p>
          <span className="text-xs text-slate-500 mt-2 block">Pilihan opsi bandwidth</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Tunggakan Tagihan</span>
            <span className="p-2 bg-amber-950/60 text-amber-400 rounded-xl text-lg">⚠️</span>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-4">{loading ? '...' : formatRupiah(stats.tagihanUnpaid)}</p>
          <span className="text-xs text-slate-500 mt-2 block">Belum dibayar warga</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Total Terkumpul</span>
            <span className="p-2 bg-blue-950/60 text-blue-400 rounded-xl text-lg">💰</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-4">{loading ? '...' : formatRupiah(stats.pendapatanBulanIni)}</p>
          <span className="text-xs text-slate-500 mt-2 block">Pembayaran terverifikasi</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-2">💡 Tips Pengelolaan</h3>
        <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
          <li>Pastikan paket internet sudah terisi di menu <strong>Paket Internet</strong> sebelum menambah pelanggan.</li>
          <li>Setiap awal bulan, buka menu <strong>Tagihan & Kasir</strong> untuk men-generate tagihan baru secara otomatis.</li>
          <li>Catat pembayaran tunai langsung di kasir agar status tagihan berubah menjadi Lunas.</li>
        </ul>
      </div>
    </div>
  )
}
