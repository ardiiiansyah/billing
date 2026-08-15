'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Users, Receipt, CreditCard,
    MoreHorizontal, Package, MapPin, MessageSquare, X
} from 'lucide-react'

const mainNav = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pelanggan', href: '/dashboard/pelanggan', icon: Users },
    { name: 'Tagihan', href: '/dashboard/tagihan', icon: Receipt },
    { name: 'Bayar', href: '/dashboard/pembayaran', icon: CreditCard },
]

const moreNav = [
    { name: 'Paket', href: '/dashboard/paket', icon: Package },
    { name: 'Wilayah', href: '/dashboard/wilayah', icon: MapPin },
    { name: 'Log WA', href: '/dashboard/laporan/notifikasi', icon: MessageSquare },
]

export default function BottomNav() {
    const pathname = usePathname()
    const [showMore, setShowMore] = useState(false)

    return (
        <>
            {/* Overlay Menu Lainnya */}
            {showMore && (
                <div className="md:hidden fixed inset-0 bg-slate-950/80 z-50 flex items-end">
                    <div className="w-full bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800 animate-in slide-in-from-bottom">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-white">Menu Lainnya</h3>
                            <button onClick={() => setShowMore(false)} className="p-2 bg-slate-800 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {moreNav.map((item) => (
                                <Link key={item.href} href={item.href} onClick={() => setShowMore(false)} className="flex flex-col items-center gap-2 p-3 bg-slate-800 rounded-xl text-slate-300">
                                    <item.icon size={24} />
                                    <span className="text-[10px]">{item.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 px-3 py-2">
                <div className="flex items-center justify-around">
                    {mainNav.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                                <Icon size={20} />
                                <span className="text-[10px] tracking-tight">{item.name}</span>
                            </Link>
                        )
                    })}
                    {/* Tombol Lainnya */}
                    <button onClick={() => setShowMore(true)} className="flex flex-col items-center gap-1 py-1 px-2 text-slate-400">
                        <MoreHorizontal size={20} />
                        <span className="text-[10px] tracking-tight">Lainnya</span>
                    </button>
                </div>
            </div>
        </>
    )
}