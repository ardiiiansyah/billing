'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient' // Diubah agar sesuai dengan proyek Anda

export default function AutoLogout({ timeoutMinutes = 15 }) {
    const router = useRouter()
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
                startTimer()
            } else {
                clearTimer()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            clearTimer()
        }
    }, [timeoutMinutes])

    return null
}