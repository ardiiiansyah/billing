# Design Brief — CRM & Billing RT/RW Net

**Produk:** Sistem Manajemen Pelanggan (CRM) & Billing Otomatis RT/RW Net  
**Sumber requirement:** `PRD.md`  
**Status:** Design baseline sebelum implementasi

## Arah Produk

Produk ini adalah alat kontrol arus kas untuk operator tunggal yang sering bekerja dari lapangan. UI harus segera menjawab tiga pertanyaan: berapa uang yang sudah masuk, siapa yang belum membayar, dan tindakan apa yang harus dilakukan berikutnya.

Keputusan utama:

- Mobile-first karena admin bekerja dari ponsel dan laptop.
- Nominal, status invoice, dan deadline menjadi konten paling dominan.
- Satu primary action per konteks.
- Desain terasa seperti alat kerja operasional yang hangat, bukan dashboard SaaS generik.

## 1. Design Principles

### 1.1 Cash position first

Setiap layar keuangan harus memprioritaskan pendapatan, piutang, overdue, dan tindakan berikutnya. Grafik hanya pelengkap; angka penting selalu tersedia dalam bentuk teks dan tabel.

### 1.2 One-person operation

Alur harus dapat diselesaikan satu admin tanpa pengetahuan teknis khusus. Gunakan label aksi yang jelas, default aman, konfirmasi untuk aksi berisiko, dan pesan error yang menjelaskan pemulihan.

### 1.3 Operational confidence

Sistem harus membuktikan proses otomatis berjalan melalui last run scheduler, status webhook, log WhatsApp, status integrasi, dan audit trail pembayaran.

## 2. Visual Direction

### Mood

**Warm operational finance:** profesional, jelas, stabil, dan dekat dengan konteks bisnis lokal. Gunakan permukaan terang, kontras tinggi, struktur seperti ledger modern, serta aksen warna yang tegas namun tidak agresif.

### Referensi

- Dashboard kasir modern untuk keterbacaan transaksi.
- Buku kas digital untuk struktur saldo dan arus uang.
- Aplikasi operasional lapangan untuk tombol cepat dan status koneksi.

### Yang dihindari

- Dashboard penuh kartu statistik tanpa tindakan.
- Purple-on-white SaaS styling.
- Gradient berlebihan dan dekorasi yang tidak membantu keputusan.
- Tabel desktop yang dipaksa tampil di mobile.
- Status yang hanya dibedakan dengan warna.
- Modal bertingkat dan ikon tanpa label untuk aksi penting.

### Tipografi

- **Font utama:** Plus Jakarta Sans. Ramah, jelas dalam Bahasa Indonesia, dan tetap modern pada mobile.
- **Font angka:** IBM Plex Mono. Dipakai untuk nominal, nomor invoice, ID transaksi, dan timestamp agar angka mudah dibandingkan seperti ledger.

## 3. Design Tokens

### Warna

| Token         | Hex       | Penggunaan                           |
| ------------- | --------- | ------------------------------------ |
| `brand-900`   | `#123C3A` | Teks brand gelap, header penting     |
| `brand-700`   | `#176B63` | Primary button, link, navigasi aktif |
| `brand-500`   | `#2C9B88` | Highlight dan grafik                 |
| `brand-100`   | `#DDF3ED` | Surface success ringan               |
| `ink-950`     | `#17211F` | Teks utama                           |
| `ink-700`     | `#40504C` | Teks sekunder                        |
| `ink-500`     | `#71807B` | Metadata dan placeholder             |
| `surface-0`   | `#FFFFFF` | Card dan modal                       |
| `surface-50`  | `#F7F9F7` | Background aplikasi                  |
| `surface-100` | `#EEF3F0` | Border dan area sekunder             |
| `success-700` | `#147A53` | Paid, connected, berhasil            |
| `success-100` | `#DDF5E8` | Background paid                      |
| `warning-700` | `#9A5B00` | Pending dan perhatian                |
| `warning-100` | `#FFF0C2` | Background warning                   |
| `danger-700`  | `#B33A32` | Overdue, failed, error               |
| `danger-100`  | `#FDE4E1` | Background error                     |
| `info-700`    | `#2167A8` | Informasi dan focus                  |
| `info-100`    | `#E3F0FC` | Background informasi                 |
| `coral-600`   | `#D96652` | Pembayaran ganda                     |
| `coral-100`   | `#FBE4DE` | Background duplicate payment         |
| `sand-100`    | `#F4E9D7` | Catatan kontekstual                  |

Teal dipilih sebagai brand color karena stabil untuk konteks finansial tetapi lebih hangat daripada biru korporat. Coral hanya digunakan untuk kondisi finansial yang membutuhkan perhatian khusus.

### Tipografi

| Token        | Ukuran / line-height | Penggunaan                   |
| ------------ | -------------------: | ---------------------------- |
| `display`    |           32 / 38 px | Saldo utama                  |
| `heading-xl` |           24 / 30 px | Judul halaman                |
| `heading-lg` |           20 / 26 px | Judul section                |
| `heading-md` |           16 / 22 px | Judul card                   |
| `body-lg`    |           16 / 24 px | Isi penting                  |
| `body-md`    |           14 / 21 px | Default UI                   |
| `body-sm`    |           12 / 18 px | Metadata                     |
| `label`      |           12 / 16 px | Label field dan badge        |
| `numeric-lg` |           28 / 34 px | Nominal utama, IBM Plex Mono |
| `numeric-md` |           16 / 22 px | Nominal tabel                |
| `numeric-sm` |           13 / 18 px | ID dan timestamp             |

Weight: `400`, `500`, `600`, `700`.

### Spacing, radius, dan shadow

- **Spacing:** `4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px`.
- **Radius:** `6 px` untuk input/badge, `10 px` untuk button/card, `16 px` untuk panel/modal, `24 px` untuk hero, `999 px` untuk pill.
- **Shadow:** card `0 1px 3px rgba(23,33,31,.06)`, raised `0 8px 24px rgba(23,33,31,.10)`, modal `0 20px 48px rgba(23,33,31,.18)`.
- Gunakan border lebih sering daripada shadow agar tabel tetap ringan.

## 4. Screen Inventory

### Authentication

- **Login Admin:** masuk ke aplikasi.
- **Reset Password:** memulihkan akses.
- **Session Expired:** meminta login ulang.

### Operational

- **Dashboard Overview:** ringkasan kas, invoice, piutang, overdue, dan status sistem.
- **Today’s Billing Queue:** pelanggan yang ditagih hari ini.
- **Notification Center:** status WhatsApp, retry, dan kegagalan.

### Customer dan package

- **Customer List:** mencari dan memfilter pelanggan.
- **Customer Detail:** data, paket, invoice, pembayaran, dan riwayat.
- **Add/Edit Customer:** mengelola pelanggan.
- **Customer Status Change:** activate, suspend, atau deactivate.
- **Package List:** paket aktif dan nonaktif.
- **Add/Edit Package:** mengelola harga, kecepatan, dan status.
- **Package Price History:** histori harga tanpa mengubah invoice lama.

### Billing

- **Invoice List:** seluruh invoice berdasarkan status dan periode.
- **Invoice Detail:** rincian, payment link, webhook, dan WhatsApp log.
- **Mark as Cash Paid:** menerima pembayaran tunai.
- **Renew Expired Invoice:** membuat payment link baru.
- **Check Payment Status:** pengecekan manual ke gateway.

### Finance dan settings

- **Finance Overview:** gross revenue, fee, pengeluaran, dan net cash flow.
- **Cash Movements:** uang masuk dan keluar.
- **Add Expense:** mencatat biaya operasional.
- **Reconciliation:** mencocokkan pembayaran dengan settlement gateway.
- **Refund / Duplicate Payment:** mengelola pembayaran ganda/refund.
- **Reports dan Export Center:** laporan dan CSV/Excel.
- **Integration Settings:** Mayar, Fonnte, scheduler, dan webhook.
- **Notification Templates:** template pesan.
- **Audit Log:** perubahan data sensitif.
- **System Health:** queue, backup, scheduler, dan koneksi.

## 5. User Flows

### Menambahkan pelanggan

1. Buka `Pelanggan` > `Tambah Pelanggan`.
2. Isi identitas, kontak, alamat, paket, dan siklus billing.
3. Sistem menormalisasi nomor WhatsApp ke `628...`.
4. Pilih tanggal siklus `1–28`.
5. Tinjau preview invoice pertama, fee, dan total.
6. Simpan, tampilkan detail pelanggan `ACTIVE`, dan catat audit log.

### Billing otomatis

1. Scheduler berjalan pukul 08:00 `Asia/Jakarta`.
2. Ambil pelanggan aktif dengan cycle day hari ini.
3. Cek invoice periode untuk mencegah duplikasi.
4. Buat invoice dan payment request secara idempoten.
5. Simpan payment URL dan gateway reference.
6. Kirim WhatsApp dan simpan log.
7. Tampilkan hasil berhasil/gagal beserta aksi retry.

### Pembayaran digital

1. Pelanggan membuka payment link dan membayar.
2. Gateway mengirim webhook.
3. Sistem memverifikasi signature, reference, dan nominal.
4. Webhook diproses idempoten dalam transaksi database.
5. Invoice menjadi `PAID`; simpan waktu, metode, dan external ID.
6. Perbarui finance tracker dan kirim notifikasi sukses bila diaktifkan.

### Pembayaran tunai

1. Buka invoice `UNPAID` atau `OVERDUE`.
2. Pilih `Terima Tunai`.
3. Tinjau nama, invoice, nominal, dan dampak.
4. Konfirmasi; invoice menjadi `PAID`, method `CASH`.
5. Catat cash movement dan audit log.
6. Jika webhook digital berikutnya masuk, tampilkan `DUPLICATE PAYMENT`.

### Overdue dan perpanjangan

1. Scheduler pukul 00:05 mencari invoice `UNPAID` melewati due date.
2. Ubah status menjadi `OVERDUE`.
3. Admin membuka daftar overdue.
4. Pilih salin link, kirim ulang WhatsApp, perpanjang link, atau terima tunai.
5. Catat seluruh tindakan.

### Rekonsiliasi

1. Buka `Keuangan` > `Rekonsiliasi`.
2. Tinjau matched, pending, dan mismatch.
3. Filter periode/gateway.
4. Buka detail nominal invoice, gross, fee, dan net settlement.
5. Jalankan `Cek Status Manual` atau tandai `NEEDS_REVIEW`.

## 6. Layout Per Screen

### Dashboard Overview

Header berisi sapaan, tanggal, dan system health. Hero menampilkan uang masuk bulan ini, piutang, dan net cash flow. Di bawahnya tampil billing queue hari ini, attention panel untuk overdue/duplicate/webhook/Fonnte, recent payments, dan quick actions.

**Primary action:** `Lihat Invoice Overdue` atau `Tinjau Masalah`, berdasarkan kondisi paling kritis.

### Customer List

Header + `Tambah Pelanggan`, search, filter status/paket/cycle day, summary count, dan list. Desktop memakai table; mobile memakai card berisi nama, code, status, paket, WhatsApp, dan next billing.

**Primary action:** `Tambah Pelanggan`.

### Customer Detail

Header identitas dan status, contact/install information, current package, billing summary, invoice history, payment history, dan activity timeline.

**Primary action:** `Edit Pelanggan`.

### Invoice List

Header periode, tabs `Semua/Unpaid/Paid/Overdue`, search/filter, dan table/list invoice. Jangan menempatkan pembuatan invoice sebagai aksi utama karena invoice dibuat otomatis.

**Primary action:** `Buka Detail`.

### Invoice Detail

Status hero, customer summary, breakdown harga paket/fee/total, payment information, activity timeline, dan action area.

Primary action mengikuti status: `Kirim Ulang Link`, `Perpanjang & Kirim Ulang Link`, `Lihat Pembayaran`, `Coba Lagi`, atau `Tinjau Pembayaran Ganda`.

### Finance Overview

Period selector, gross revenue, gateway fee, operating expense, net cash flow, cash-flow chart, income/expense breakdown, unreconciled transactions, dan recent cash movements.

**Primary action:** `Catat Pengeluaran`.

### Reconciliation

Summary matched/pending/mismatch, filter, table, detail drawer, dan aksi check status, needs review, serta catatan.

### Integration Settings

Panel Mayar, Fonnte, scheduler, dan webhook. Tampilkan connected state, last check, last message, last webhook, kuota, dan next run. Token tidak pernah ditampilkan utuh.

**Primary action:** `Tes Koneksi`.

## 7. Component Library

| Komponen             | Variants                                                                              | State penting                                     |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Button               | primary, secondary, ghost, danger, link, icon                                         | hover, focus, pressed, disabled, loading, success |
| Status Badge         | paid, unpaid, overdue, pending, failed, cancelled, connected, disconnected, duplicate | default, compact                                  |
| Metric Card          | default, positive, warning, negative                                                  | loading, no data                                  |
| Data Table           | standard, dense, responsive                                                           | loading, empty, error, partial                    |
| Currency Field       | Rupiah input                                                                          | valid, invalid, disabled                          |
| Date/Cycle Picker    | date, cycle day, range                                                                | invalid, disabled, loading                        |
| Alert Banner         | info, success, warning, error, outage                                                 | dismissible, action-required                      |
| Confirmation Modal   | cash, deactivate, renew, refund, retry                                                | loading, error, success                           |
| Timeline             | invoice, webhook, WhatsApp, audit                                                     | pending, failed, completed                        |
| Toast                | success, error, warning, info                                                         | auto-dismiss, persistent                          |
| Connection Indicator | connected, degraded, disconnected, checking, unknown                                  | live, stale                                       |
| Empty State          | customer, invoice, expense, reconciliation                                            | with CTA, read-only                               |

Label aksi menggunakan kata kerja konkret seperti `Terima Tunai`, `Kirim Ulang`, dan `Perpanjang Link`.

## 8. State Screen Kunci

### Dashboard

- **Empty:** onboarding checklist dan `Tambah Pelanggan Pertama`.
- **Loading:** skeleton metric dan invoice list.
- **Error:** error lokal per panel dengan `Coba Lagi`.
- **Success:** jumlah invoice dibuat dan pesan terkirim.
- **Offline:** tampilkan data terakhir; aksi perubahan dinonaktifkan.

### Customer List

- **Empty:** `Belum ada pelanggan` + CTA.
- **Loading:** skeleton row/card.
- **Error:** struktur list tetap ada + retry.
- **Success:** total dan filter aktif terlihat.
- **Offline:** cache read-only dengan waktu update terakhir.

### Invoice List dan Detail

- **Empty:** pesan mengikuti filter, misalnya `Tidak ada invoice overdue`.
- **Loading:** skeleton status, nominal, due date, dan timeline.
- **Error:** invoice not found atau error gateway ditampilkan pada area terkait.
- **Success:** status, nominal, dan action konsisten.
- **Offline:** detail dapat dibaca; check status, retry, dan update dinonaktifkan.

### Finance Overview

- **Empty:** jelaskan bahwa data muncul setelah pembayaran/pengeluaran pertama.
- **Loading:** skeleton angka dan chart.
- **Error:** hanya panel sumber yang gagal yang ditandai.
- **Success:** semua metrik menyebutkan periodenya.
- **Offline:** tampilkan laporan terakhir dan waktu sinkronisasi.

### Integration Settings

- **Empty:** `Belum terhubung` + checklist prasyarat.
- **Loading:** `Memeriksa koneksi...`.
- **Error:** jelaskan token invalid, endpoint unavailable, atau webhook belum masuk; jangan tampilkan secret.
- **Success:** connected, last check, dan last webhook/message.
- **Offline:** tampilkan status terakhir dan nonaktifkan test connection.

## 9. Responsive Behaviour

### Mobile — 320–767 px

- Bottom navigation: Beranda, Invoice, Pelanggan, Keuangan, Menu.
- Satu kolom, sticky primary action pada form.
- Table menjadi card list.
- Filter memakai bottom sheet.
- Metric card ditumpuk atau horizontal scroll terbatas.
- Aksi penting selalu memiliki label teks.

### Tablet — 768–1199 px

- Sidebar dapat di-collapse.
- Dashboard dua kolom.
- Form memakai dua kolom untuk field yang tidak berkaitan.
- Detail invoice dapat memakai split panel.

### Desktop — 1200 px ke atas

- Sidebar tetap terlihat.
- Content max-width sekitar `1440 px`.
- Table penuh dan detail invoice dua kolom.
- Shortcut keyboard untuk search dan navigasi dapat tersedia.

Breakpoint: `sm 640`, `md 768`, `lg 1024`, `xl 1280 px`.

## 10. Accessibility

### Kontras

Target WCAG AA: teks normal minimal `4.5:1`, teks besar `3:1`, dan komponen/focus indicator minimal `3:1`. Status selalu memakai teks atau ikon selain warna.

### Focus dan keyboard

Urutan focus: skip link, navigation, page title, primary action, filter/search, main content, secondary actions. Focus ring minimal `2 px` dan tidak boleh dihapus tanpa pengganti.

Dukung `Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`, dan arrow keys pada tablist/menu/date picker. Modal memindahkan focus ke elemen awal, menahan focus, lalu mengembalikannya ke trigger.

### Semantic HTML dan ARIA

Gunakan semantic HTML sebelum ARIA. Gunakan:

- `aria-label` untuk icon-only button.
- `aria-current="page"` untuk menu aktif.
- `aria-expanded` dan `aria-controls` untuk dropdown/accordion.
- `role="dialog"` dan `aria-modal="true"` untuk modal.
- `role="status"` untuk status non-kritis.
- `role="alert"` untuk error penting.
- `aria-live="polite"` untuk perubahan status invoice.
- `aria-describedby` untuk helper dan error field.

Setiap field harus memiliki visible label, helper/error text, required indicator yang tidak hanya mengandalkan warna, dan pesan validasi spesifik.

### Motion

Hormati `prefers-reduced-motion`. Hindari animasi berkedip untuk overdue atau pembayaran ganda. Alert penting harus tetap terlihat tanpa animasi.

## Acceptance Checklist Sebelum Coding

- [ ] Prototype Dashboard, Invoice Detail, dan Finance Overview selesai.
- [ ] Journey billing otomatis, pembayaran digital, dan pembayaran tunai dapat diselesaikan tanpa kebingungan.
- [ ] Prototype diuji pada lebar 375 px dan 1440 px.
- [ ] Semua state empty, loading, error, success, dan offline telah dirancang.
- [ ] Kontras dan keyboard flow telah diverifikasi.
- [ ] Design tokens dan komponen dasar disetujui sebelum implementasi frontend.

## Keputusan Akhir

Aplikasi ini harus terasa sebagai **operational finance dashboard**, bukan CRM generik. Fokus desain adalah uang, waktu, dan kepastian: nominal dan arus kas, deadline dan overdue, serta status webhook/WhatsApp/audit trail yang dapat dipercaya.
