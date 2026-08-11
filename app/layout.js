import './globals.css'

export const metadata = {
  title: 'Sultan WiFi Billing & Management',
  description: 'Aplikasi Manajemen & Tagihan WiFi RT/RW',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen antialiased bg-slate-900 text-slate-100">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}