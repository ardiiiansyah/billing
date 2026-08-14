'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    MapPin,
    Package,
    Receipt,
    CreditCard,
    BarChart3,
    MessageSquare,
    LogOut
} from 'lucide-react'
import InstallPWAButton from '@/components/InstallPWAButton'

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pelanggan', href: '/dashboard/pelanggan', icon: Users },
    { name: 'Wilayah', href: '/dashboard/wilayah', icon: MapPin },
    { name: 'Paket', href: '/dashboard/paket', icon: Package },
    { name: 'Tagihan', href: '/dashboard/tagihan', icon: Receipt },
    { name: 'Pembayaran', href: '/dashboard/pembayaran', icon: CreditCard },
    { name: 'Laporan', href: '/dashboard/laporan', icon: BarChart3 },
    { name: 'Log WA', href: '/dashboard/laporan/notifikasi', icon: MessageSquare },
]

export default function Sidebar({ userEmail = 'ardia6916@wifi.id', onLogout }) {
    const pathname = usePathname()

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col justify-between hidden md:flex shrink-0">
            <div>
                {/* Header / Brand Logo */}
                <div className="p-5 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-cyan-500/20">
                        📶
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-sm tracking-wide leading-tight">Sultan WiFi</h2>
                        <p className="text-xs text-slate-400">Billing System</p>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="p-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                                        ? 'bg-cyan-600/20 text-cyan-400 font-medium'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Footer Area: Install PWA + User Email + Logout */}
            <div className="p-4 border-t border-slate-800 space-y-3">
                {/* Tombol Install PWA tersimpan rapi di dalam Sidebar */}
                <InstallPWAButton />

                <div className="pt-2 border-t border-slate-800/60">
                    <p className="text-xs text-slate-500 truncate mb-2 px-1 font-mono text-center">
                        {userEmail}
                    </p>
                    <button
                        onClick={onLogout}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    )
}