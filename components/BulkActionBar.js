'use client'

export default function BulkActionBar({ selectedCount, onClear, actions = [] }) {
    if (selectedCount === 0) return null

    // Helper pemetaan variasi warna tombol agar lebih rapi & kontras
    const getVariantStyle = (variant) => {
        switch (variant) {
            case 'danger':
                return 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
            case 'success':
                return 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'warning':
                return 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
            default:
                return 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
        }
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl shadow-black/80 rounded-full px-4 py-2.5">

                {/* Badge Jumlah Item */}
                <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                        {selectedCount}
                    </span>
                    <span className="text-slate-300 text-xs font-medium whitespace-nowrap">
                        terpilih
                    </span>
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center gap-2">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={action.onClick}
                            disabled={action.loading}
                            title={action.title || action.label}
                            className={`
                flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${getVariantStyle(action.variant)}
              `}
                        >
                            <span>{action.icon}</span>
                            <span>{action.loading ? 'Memproses...' : action.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tombol Batal */}
                <button
                    onClick={onClear}
                    className="ml-1 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    title="Batal seleksi"
                >
                    ✕
                </button>
            </div>
        </div>
    )
}