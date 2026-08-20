'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AutoLogout({ timeoutMinutes = 15 }) {
    const router = useRouter()
    const supabase = createClient()
    const timerRef = useRef(null)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        localStorage.clear()
        router.push('/login?message=Sesi+berakhir+karena+aplikasi+ditinggalkan')
    }

    const startTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        const timeoutMs = timeoutMinutes * 60 * 1000
        timerRef.current = setTimeout(handleLogout, timeoutMs)
    }

    const clearTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
    }

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Saat aplikasi ditinggal (pindah tab, minimize browser, atau layar HP dikunci)
                // Mulai hitung mundur 15 menit
                startTimer()
            } else {
                // Saat admin kembali membuka aplikasi sebelum waktunya habis, batalkan logout
                clearTimer()
            }
        }

        // Pantau perubahan status tab/aplikasi
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            clearTimer()
        }
    }, [timeoutMinutes])

    return null
}