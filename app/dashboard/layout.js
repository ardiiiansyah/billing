'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Sidebar from '@/components/sidebar'
import BottomNav from '@/components/bottomNav'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p>Memuat sesi...</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-slate-950 text-white pb-16 md:pb-0 overflow-x-hidden">

      {/* Efek Glow Kosmik */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[128px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none z-0" />

      <Sidebar
        userEmail={user?.email}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <main key={pathname} className="relative z-10 flex-1 p-6 overflow-y-auto min-w-0 animate-fadeIn">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}