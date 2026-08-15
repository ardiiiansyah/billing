'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Sidebar from '@/components/sidebar'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // Tambahkan state loading
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false) // Matikan loading jika user ditemukan
      }
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Tampilkan loading sebentar alih-alih langsung mental ke login
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p>Memuat sesi...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar userEmail={user?.email} onLogout={handleLogout} />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}