'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PelangganPage() {
  const [pelanggan, setPelanggan] = useState([])
  const [paket, setPaket] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua')
  const router = useRouter()

  const [form, setForm] = useState({
    kode_pelanggan: '',
    nama: '',
    no_wa: '',
    alamat: '',
    rt: '',
    rw: '',
    paket_id: '',
    tanggal_jatuh_tempo: 10,
    status: 'aktif',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: pel }, { data: pkt }] = await Promise.all([
      supabase.from('pelanggan').select('*, paket(nama_paket, harga, kecepatan)').order('created_at', { ascending: false }),
      supabase.from('paket').select('*'),
    ])
    setPelanggan(pel || [])
    setPaket(pkt || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editData) {
      await supabase.from('pelanggan').update(form).eq('id', editData.id)
    } else {
      await supabase.from('pelanggan').insert(form)
    }
    setShowForm(false)
    setEditData(null)
    setForm({ kode_pelanggan: '', nama: '', no_wa: '', alamat: '', rt: '', rw: '', paket_id: '', tanggal_jatuh_tempo: 10, status: 'aktif' })
    fetchData()
  }

  const handleEdit = (p) => {
    setEditData(p)
    setForm({
      kode_pelanggan: p.kode_pelanggan,
      nama: p.nama,
      no_wa: p.no_wa,
      alamat: p.alamat,
      rt: p.rt || '',
      rw: p.rw || '',
      paket_id: p.paket_id || '',
      tanggal_jatuh_tempo: p.tanggal_jatuh_tempo,
      status: p.status,
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus pelanggan ini?')) return
    await supabase.from('pelanggan').delete().eq('id', id)
    fetchData()
  }

  const filtered = pelanggan.filter(p => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.kode_pelanggan.toLowerCase().includes(search.toLowerCase()) ||
      p.no_wa.includes(search)
    const matchStatus = filterStatus === 'semua' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const statusBadge = (status) => {
    const map = {
      aktif: 'bg-green-900 text-green-300',
      isolir: 'bg-yellow-900 text-yellow-300',
      nonaktif: 'bg-red-900 text-red-300',
    }
    return map[status] || 'bg-slate-700 text-slate-300'
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-400 text-sm mb-1 hover:text-white">← Dashboard</button>
            <h1 className="text-2xl font-bold">Manajemen Pelanggan</h1>
            <p className="text-slate-400 text-sm">{pelanggan.length} total pelanggan</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditData(null); setForm({ kode_pelanggan: '', nama: '', no_wa: '', alamat: '', rt: '', rw: '', paket_id: '', tanggal_jatuh_tempo: 10, status: 'aktif' }) }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-medium transition"
          >
            + Tambah Pelanggan
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Cari nama, kode, atau no WA..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
          >
            <option value="semua">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="isolir">Isolir</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-20">Memuat data...</div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="text-left px-4 py-3">Pelanggan</th>
                  <th className="text-left px-4 py-3">No WA</th>
                  <th className="text-left px-4 py-3">RT/RW</th>
                  <th className="text-left px-4 py-3">Paket</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500">Belum ada pelanggan</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nama}</div>
                      <div className="text-slate-400 text-xs">{p.kode_pelanggan}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.no_wa}</td>
                    <td className="px-4 py-3 text-slate-300">RT {p.rt} / RW {p.rw}</td>
                    <td className="px-4 py-3">
                      <div>{p.paket?.nama_paket || '-'}</div>
                      <div className="text-slate-400 text-xs">{p.paket?.kecepatan}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusBadge(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(p)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded-lg text-xs transition">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">{editData ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Kode Pelanggan</label>
                    <input required value={form.kode_pelanggan} onChange={e => setForm({ ...form, kode_pelanggan: e.target.value })} placeholder="WIFI-001" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none">
                      <option value="aktif">Aktif</option>
                      <option value="isolir">Isolir</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nama Lengkap</label>
                  <input required value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} placeholder="Budi Santoso" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">No WhatsApp</label>
                  <input required value={form.no_wa} onChange={e => setForm({ ...form, no_wa: e.target.value })} placeholder="08123456789" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Alamat</label>
                  <textarea required value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} placeholder="Jl. Contoh No. 1" rows={2} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">RT</label>
                    <input value={form.rt} onChange={e => setForm({ ...form, rt: e.target.value })} placeholder="001" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">RW</label>
                    <input value={form.rw} onChange={e => setForm({ ...form, rw: e.target.value })} placeholder="002" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Tgl Jatuh Tempo</label>
                    <input type="number" min={1} max={28} value={form.tanggal_jatuh_tempo} onChange={e => setForm({ ...form, tanggal_jatuh_tempo: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Paket Internet</label>
                  <select required value={form.paket_id} onChange={e => setForm({ ...form, paket_id: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none">
                    <option value="">Pilih paket...</option>
                    {paket.map(p => (
                      <option key={p.id} value={p.id}>{p.nama_paket} - {p.kecepatan} - Rp {p.harga.toLocaleString('id-ID')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowForm(false); setEditData(null) }} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition">Batal</button>
                  <button type="submit" className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-medium transition">
                    {editData ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}