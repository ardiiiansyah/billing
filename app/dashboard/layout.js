'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else setUser(user)
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menus = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Pelanggan', href: '/dashboard/pelanggan', icon: '👥' },
    { label: 'Wilayah', href: '/dashboard/wilayah', icon: '🗺️' },
    { label: 'Paket', href: '/dashboard/paket', icon: '📦' },
    { label: 'Tagihan', href: '/dashboard/tagihan', icon: '🧾' },
    { label: 'Pembayaran', href: '/dashboard/pembayaran', icon: '💳' },
    { label: 'Laporan', href: '/dashboard/laporan', icon: '📈' },
  ]

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center text-lg">📶</div>
            <div>
              <div className="font-bold text-white text-sm">Sultan WiFi</div>
              <div className="text-xs text-slate-400">Billing System</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${pathname === menu.href
                ? 'bg-cyan-600/20 text-cyan-400 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span>{menu.icon}</span>
              {menu.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2 truncate">{user.email}</div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-6">
        {children}
      </main>
    </div>
  )
}