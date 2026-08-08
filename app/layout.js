import './globals.css'

export const metadata = {
  title: 'Sultan WiFi Billing & Management',
  description: 'Aplikasi Manajemen & Tagihan WiFi RT/RW',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  )
}
