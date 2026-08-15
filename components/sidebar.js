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
    LogOut,
    ChevronLeft,
    ChevronRight
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

export default function Sidebar({ userEmail = 'ardia6916@wifi.id', onLogout, isOpen = true, setIsOpen }) {
    const pathname = usePathname()

    return (
        <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col justify-between hidden md:flex shrink-0 transition-all duration-300 relative`}>
            <div>
                {/* Header / Brand Logo & Tombol Collapse */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    {isOpen ? (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-cyan-500/20 shrink-0">
                                📶
                            </div>
                            <div className="truncate">
                                <h2 className="font-bold text-white text-sm tracking-wide leading-tight truncate">Sultan WiFi</h2>
                                <p className="text-xs text-slate-400">Billing System</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-9 h-9 bg-cyan-600 rounded-xl flex items-center justify-center text-slate-950 font-bold text-lg shadow-md shadow-cyan-500/20 mx-auto">
                            📶
                        </div>
                    )}

                    {/* Tombol Buka/Tutup Sidebar */}
                    {setIsOpen && (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title={isOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
                        >
                            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    )}
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
                                title={!isOpen ? item.name : ''}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                                        ? 'bg-cyan-600/20 text-cyan-400 font-medium'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                                {isOpen && <span className="truncate">{item.name}</span>}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Footer Area: Install PWA + User Email + Logout */}
            <div className="p-4 border-t border-slate-800 space-y-3">
                {/* Tombol Install PWA */}
                {isOpen && <InstallPWAButton />}

                <div className="pt-2 border-t border-slate-800/60">
                    {isOpen && (
                        <p className="text-xs text-slate-500 truncate mb-2 px-1 font-mono text-center">
                            {userEmail}
                        </p>
                    )}
                    <button
                        onClick={onLogout}
                        title="Logout"
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-800 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {isOpen && <span>Logout</span>}
                    </button>
                </div>
            </div>
        </aside>
    )
}