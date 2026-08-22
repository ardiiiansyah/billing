'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const msg = params.get('message')
      if (msg) {
        setInfoMsg(msg)
      }
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('data:', data)
      console.log('error:', error)

      if (error) {
        setErrorMsg(error.message || 'Login gagal. Periksa email & password Anda.')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan koneksi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <img
            src="/LogoLogo_Transparent.png" // Sesuaikan dengan nama file asli di folder public Anda
            alt="Beat Net Indonesia"
            className="w-40 h-auto object-contain mb-2"
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">Sultan WiFi</h1>
          <p className="text-slate-400 text-sm mt-1">Portal Login Admin & Pengelola</p>
        </div>

        {infoMsg && (
          <div className="mb-6 p-3.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs sm:text-sm rounded-xl flex items-center gap-2.5">
            <span className="text-base">⏱️</span>
            <span>{infoMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sultanwifi.id"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold rounded-xl text-sm transition duration-150 ease-in-out shadow-lg shadow-cyan-900/30 disabled:opacity-50"
          >
            {loading ? 'Memproses Login...' : 'Masuk ke Dashboard'}
          </button>
        </form>
      </div>
    </main>
  )
}
