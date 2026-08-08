export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-sm">
        <span className="px-3 py-1 text-xs font-semibold tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800 rounded-full uppercase">
          Fase 0 - Initial Setup
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Sultan WiFi Billing
        </h1>
        <p className="mt-4 text-slate-300 text-lg">
          Sistem Manajemen & Tagihan WiFi RT/RW modern berbasis Next.js, Tailwind CSS, & Supabase.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="px-4 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-slate-300">
            ✅ Next.js App Router
          </div>
          <div className="px-4 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-slate-300">
            ✅ Tailwind CSS Styling
          </div>
          <div className="px-4 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-slate-300">
            ✅ Supabase Integration
          </div>
        </div>
      </div>
    </main>
  )
}
