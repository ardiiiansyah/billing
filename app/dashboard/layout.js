'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Jika tidak ada sesi (belum login/env belum diset authnya), 
        // untuk dev/preview jika belum buat user auth bisa lewat dulu atau tetap redirect
      }
      setUser(session?.user || null)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Pelanggan', path: '/dashboard/pelanggan', icon: '👥' },
    { name: 'Paket Internet', path: '/dashboard/paket', icon: '📦' },
    { name: 'Tagihan & Kasir', path: '/dashboard/tagihan', icon: '💳' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-600/30">
              📶
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight text-white">Sultan WiFi</h2>
              <p className="text-xs text-slate-400">Admin Panel RT/RW</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 mt-6 md:mt-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/40 hover:border-red-900/50 border border-transparent transition"
          >
            <span className="text-lg">🚪</span>
            Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
