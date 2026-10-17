# Beatnet — Implementation Plan & Roadmap

**Produk:** CRM & Billing Otomatis RT/RW Net  
**Target MVP:** 1 admin, sekitar 140 pelanggan aktif  
**Timezone bisnis:** `Asia/Jakarta`  
**Status:** Ready for implementation planning

## 1. Dokumen Sumber

Agent wajib membaca dokumen berikut sebelum mengubah kode:

1. `PRD.md` — kebutuhan produk dan acceptance criteria.
2. `DATABASE-DESIGN.md` — model data, constraint, index, dan state machine.
3. `DESIGN-BRIEF.md` — prinsip UI, screen inventory, dan user flow.
4. `SECURITY-STANDARD.md` — authentication, authorization, webhook, PII, logging, dan deployment security.
5. `CODING-STANDARDS.md` — arsitektur, naming, testing, dan quality gate.

Jika terjadi konflik, gunakan urutan prioritas:

```text
Security dan data integrity > Database constraints > PRD > Coding standards > Preferensi implementasi
```

## 2. Instruksi Agent

- Jangan menghapus atau mengubah requirement yang sudah disetujui tanpa alasan dan catatan ADR.
- Jangan membuat integrasi Mayar atau Fonnte berdasarkan asumsi. Verifikasi dokumentasi resmi terlebih dahulu.
- Jangan menyimpan secret, token, password, raw webhook, atau PII penuh di source code maupun log.
- Jangan menggunakan `any` pada TypeScript.
- Gunakan nominal sebagai integer Rupiah (`BIGINT` di database dan `bigint` di domain).
- Gunakan UTC untuk penyimpanan waktu; gunakan `Asia/Jakarta` hanya pada business boundary dan tampilan.
- Semua mutation finansial harus transactional dan auditable.
- Invoice `PAID` tidak boleh kembali ke `UNPAID`.
- Jangan mengirim WhatsApp atau memanggil payment gateway di tengah transaksi database.
- Setelah setiap pekerjaan, jalankan typecheck, lint, unit test, dan build yang relevan.
- Buat migration baru untuk perubahan database. Jangan mengedit migration yang sudah diterapkan.
- Sebelum fitur dianggap selesai, tambahkan test untuk happy path, duplicate request, invalid input, authorization failure, dan provider failure.

## 3. Arsitektur Target

Gunakan modular monolith dengan clean/layered architecture dan ports/adapters.

```text
HTTP/UI -> Application -> Domain
Worker  -> Application -> Domain
Infrastructure -> implements ports
Domain -> tidak boleh import framework, Supabase, Redis, Mayar, Fonnte, atau HTTP
```

Struktur target:

```text
apps/
  web/
    src/
      modules/
        auth/
        customers/
        packages/
        billing/
        payments/
        notifications/
        finance/
        audit/
      shared/
      main.ts
  worker/
    src/jobs/
packages/
  contracts/
  config/
supabase/
  migrations/
  seed.sql
tests/
  integration/
  e2e/
  fixtures/
docs/
scripts/
.github/workflows/
```

Setiap module feature menggunakan pola:

```text
feature/
  domain/
  application/
  infrastructure/
  interface/
```

## 4. Roadmap Utama

### Phase 0 — Discovery dan Vendor Contract

**Estimasi:** 2–3 hari

- [x] Review dokumentasi resmi Mayar API V2 dan sandbox.
- [ ] Verifikasi dengan sandbox Mayar: signature, event ID, status, reference, expiry, fee, dan retry.
- [x] Review dokumentasi resmi Fonnte: send message, device status, response, quota, dan retry behavior.
- [ ] Verifikasi dengan akun testing Fonnte: token, device status webhook, message status webhook, quota, dan retry.
- [ ] Tentukan hosting, domain, dan public webhook URL.
- [ ] Tentukan penggunaan Redis/queue.
- [x] Buat ADR untuk keputusan teknis yang belum ditentukan.
- [ ] Pecah requirement P0 menjadi issue/task kecil.

**Gate:** jangan mengunci adapter provider sebelum kontrak API resmi tersedia.

### Phase 1 — Project Foundation

**Estimasi:** 2–4 hari

- [ ] Buat aplikasi web TypeScript strict.
- [ ] Buat worker terpisah untuk scheduler dan queue.
- [ ] Konfigurasi Prettier, ESLint, dan import rules.
- [ ] Konfigurasi Zod untuk environment dan request validation.
- [ ] Tambahkan structured JSON logger.
- [ ] Tambahkan error hierarchy dan error mapper.
- [ ] Tambahkan Vitest/Jest dan Playwright.
- [ ] Buat CI untuk format, lint, typecheck, test, dan build.
- [ ] Pisahkan environment development, staging, dan production.

### Phase 2 — Database, Auth, dan Security Baseline

**Estimasi:** 4–7 hari

- [ ] Buat schema `app`, `integration`, dan `audit`.
- [ ] Buat enum status customer, invoice, payment, delivery, dan reconciliation.
- [ ] Implementasikan tabel users, packages, package prices, customers, invoices, payment attempts, payment events, WhatsApp messages, cash movements, reconciliation, webhook ingress, audit logs, scheduler runs, dan integration credential metadata.
- [ ] Tambahkan semua primary key, foreign key, unique constraint, check constraint, dan index dari `DATABASE-DESIGN.md`.
- [ ] Tambahkan trigger `updated_at`.
- [ ] Tambahkan constraint invoice state.
- [ ] Tambahkan audit append-only.
- [ ] Implementasikan server-side session.
- [ ] Implementasikan role `ADMIN`, `OPERATOR`, dan `REPORTING`.
- [ ] Implementasikan MFA TOTP untuk `ADMIN`.
- [ ] Tambahkan authorization per endpoint dan per object.
- [ ] Tambahkan CSRF, secure cookie, security headers, rate limit, dan request body limit.

**Acceptance:** database dapat dibuat ulang dari migration dan admin dapat login dengan authorization yang benar.

### Phase 3 — CRM Pelanggan dan Paket

**Estimasi:** 5–7 hari

#### Customer

- [ ] `CreateCustomer`.
- [ ] `UpdateCustomer`.
- [ ] `DeactivateCustomer`.
- [ ] Daftar, pencarian, dan filter pelanggan.
- [ ] Detail pelanggan.
- [ ] Normalisasi nomor ke format `628...`.
- [ ] Validasi nama 2–100 karakter.
- [ ] Validasi nomor unik.
- [ ] Validasi alamat wajib.
- [ ] Validasi latitude dan longitude berpasangan.
- [ ] Validasi billing day hanya `1–28`.
- [ ] Simpan `activated_on`.
- [ ] Simpan riwayat perubahan status dan nomor bila diperlukan.

#### Package

- [ ] `CreatePackage`.
- [ ] `ChangePackagePrice`.
- [ ] `DeactivatePackage`.
- [ ] Daftar paket aktif/nonaktif.
- [ ] Histori harga.
- [ ] Cegah penghapusan paket yang masih dipakai pelanggan aktif.

#### Tests

- [ ] Test normalisasi nomor.
- [ ] Test invalid billing day.
- [ ] Test invalid coordinate.
- [ ] Test duplicate phone.
- [ ] Test package deactivation.
- [ ] Test role access.

### Phase 4 — Invoice dan Billing Engine

**Estimasi:** 7–10 hari

- [ ] Implementasikan domain `Invoice` dan state machine.
- [ ] Implementasikan fee calculation dengan integer arithmetic.
- [ ] Simpan snapshot nama paket, kecepatan, harga, fee, dan total.
- [ ] Implementasikan due date `billingDate + 3 hari`.
- [ ] Implementasikan `GenerateDailyInvoices` pukul 08:00 `Asia/Jakarta`.
- [ ] Implementasikan `MarkOverdueInvoices` pukul 00:05 `Asia/Jakarta`.
- [ ] Filter hanya customer `ACTIVE` dengan cycle day yang sesuai.
- [ ] Cegah invoice ganda dengan unique `(customer_id, billing_date)`.
- [ ] Tambahkan advisory lock dan unique scheduler run.
- [ ] Implementasikan `MarkInvoiceCashPaid`.
- [ ] Buat cash movement dan audit dalam transaksi yang sama.
- [ ] Implementasikan duplicate payment flag.

Formula wajib:

```text
customerFeeIdr = ceil(gatewayFeeEstimateIdr * 0.30)
adminFeeIdr = gatewayFeeEstimateIdr - customerFeeIdr
totalAmountIdr = baseAmountIdr + customerFeeIdr
dueDate = billingDate + 3 calendar days
```

**Acceptance:** menjalankan scheduler berulang kali tidak membuat invoice atau payment job ganda.

### Phase 5 — Adapter Payment Gateway Mayar

**Estimasi:** 5–8 hari

- [ ] Definisikan `PaymentGatewayPort`.
- [ ] Implementasikan `MayarAdapter` di infrastructure.
- [ ] Implementasikan create payment request.
- [ ] Implementasikan check payment status.
- [ ] Implementasikan renew payment link.
- [ ] Simpan `payment_attempt` dengan gateway reference, URL, nominal, expiry, dan status.
- [ ] Gunakan idempotency key.
- [ ] Tambahkan timeout, retry terbatas, dan circuit breaker bila diperlukan.
- [ ] Validasi seluruh response provider dengan schema.
- [ ] Redact URL dan reference sensitif dari log.
- [ ] Gunakan sandbox sebelum production.

**Acceptance:** invoice `UNPAID` dapat memiliki payment link yang tervalidasi tanpa membocorkan API key.

### Phase 6 — Webhook Payment dan Rekonsiliasi

**Estimasi:** 5–8 hari

Endpoint:

```text
POST /api/webhooks/payment
```

Alur wajib:

1. Terima raw body dengan batas maksimal 256 KB.
2. Simpan request ID dan hash payload, bukan raw body di log.
3. Verifikasi HMAC-SHA256 memakai raw bytes dan constant-time compare.
4. Validasi timestamp dan replay window.
5. Validasi event ID dan duplicate event.
6. Parse payload setelah signature valid.
7. Cari payment attempt berdasarkan gateway dan order ID.
8. Verifikasi nominal dan reference.
9. Simpan durable ingress event.
10. Lock invoice dengan `FOR UPDATE`.
11. Terapkan state transition.
12. Simpan payment event dan audit.
13. Commit transaksi.
14. Enqueue notification atau cache invalidation.

Test minimum:

- [ ] Signature invalid menghasilkan `401`.
- [ ] Payload malformed menghasilkan `400`.
- [ ] Webhook duplicate idempotent.
- [ ] Nominal mismatch ditolak.
- [ ] Reference tidak dikenal ditolak.
- [ ] Invoice cash-paid menandai duplicate payment.
- [ ] Event out-of-order tidak merusak state.
- [ ] Provider timeout tidak menandai invoice `PAID`.

### Phase 7 — WhatsApp Dispatcher Fonnte

**Estimasi:** 4–6 hari

- [ ] Definisikan `WhatsAppProviderPort`.
- [ ] Implementasikan `FonnteAdapter`.
- [ ] Buat template message renderer.
- [ ] Queue pesan setelah payment link tersimpan.
- [ ] Simpan setiap delivery attempt.
- [ ] Implementasikan retry maksimal 5 kali.
- [ ] Gunakan exponential backoff dengan jitter.
- [ ] Implementasikan dead-letter queue.
- [ ] Implementasikan status device Fonnte.
- [ ] Implementasikan retry manual dan salin payment link.
- [ ] Pastikan template tidak memuat koordinat atau alamat lengkap.

### Phase 8 — Dashboard Operasional dan Finance

**Estimasi:** 7–10 hari

- [ ] Dashboard cash position.
- [ ] Billing queue hari ini.
- [ ] Invoice list dan filter status.
- [ ] Invoice detail dan timeline.
- [ ] Pembayaran tunai.
- [ ] Renew payment link.
- [ ] Check payment status.
- [ ] Duplicate payment warning.
- [ ] WhatsApp failed/retry center.
- [ ] Scheduler health.
- [ ] Mayar/Fonnte connection health.
- [ ] Cash movements.
- [ ] Finance overview.
- [ ] Reconciliation list.
- [ ] Async report/export.
- [ ] UI mobile-first sesuai `DESIGN-BRIEF.md`.

### Phase 9 — Testing dan Hardening

**Estimasi:** 5–8 hari

- [ ] Unit test domain formula dan state machine.
- [ ] Integration test migration dan database constraint.
- [ ] Integration test authorization dan RLS.
- [ ] Integration test webhook transaction.
- [ ] Integration test scheduler idempotency.
- [ ] Integration test queue retry.
- [ ] E2E login.
- [ ] E2E create package.
- [ ] E2E create customer.
- [ ] E2E generate invoice.
- [ ] E2E payment webhook.
- [ ] E2E cash payment.
- [ ] E2E overdue transition.
- [ ] Test IDOR, CSRF, XSS, SSRF, SQL injection, mass assignment, dan rate limiting.
- [ ] Jalankan secret scanning dan dependency scanning.
- [ ] Review semua log untuk PII/secret leakage.

### Phase 10 — Staging, Pilot, dan Production

**Estimasi:** 3–5 hari

- [ ] Deploy staging dengan database dan secrets terpisah.
- [ ] Konfigurasi public webhook staging.
- [ ] Jalankan sandbox Mayar.
- [ ] Jalankan Fonnte pada nomor testing.
- [ ] Uji backup dan restore.
- [ ] Uji scheduler missed-run recovery.
- [ ] Uji queue backlog dan provider outage.
- [ ] Pilot dengan 5–10 pelanggan.
- [ ] Monitor satu siklus billing.
- [ ] Evaluasi invoice ganda, webhook, WA failure, dan cash reconciliation.
- [ ] Perbaiki blocker sebelum rollout 140 pelanggan.
- [ ] Deploy production dengan rollback plan.

## 5. Prioritas Fitur

### P0 — MVP

- [ ] Admin authentication dan authorization.
- [ ] Customer CRUD.
- [ ] Package CRUD dan price history.
- [ ] Billing day 1–28.
- [ ] Daily invoice scheduler.
- [ ] Fee split 70/30.
- [ ] Mayar payment link.
- [ ] HMAC webhook.
- [ ] Idempotent payment processing.
- [ ] Cash payment.
- [ ] Overdue scheduler.
- [ ] Fonnte notification.
- [ ] WhatsApp retry.
- [ ] Audit log.
- [ ] Dashboard operasional.
- [ ] Backup dan monitoring dasar.

### P1 — Setelah MVP Stabil

- [ ] Reminder H-1 dan H+1.
- [ ] Kuitansi PDF.
- [ ] Laporan arus kas.
- [ ] Export Excel.
- [ ] Settlement reconciliation otomatis.
- [ ] Editable notification templates.
- [ ] Refund workflow.

### P2 — Pengembangan Lanjutan

- [ ] Integrasi MikroTik.
- [ ] Isolir otomatis.
- [ ] Peta pelanggan dan ODP.
- [ ] Portal pelanggan.
- [ ] Multi-tenant.
- [ ] Mobile application.

## 6. Definition of Done MVP

MVP hanya boleh dinyatakan selesai jika:

- [ ] Setiap customer aktif menerima maksimal satu invoice per billing date.
- [ ] Scheduler aman dijalankan lebih dari satu kali.
- [ ] Webhook invalid tidak pernah menandai invoice lunas.
- [ ] Webhook duplicate tidak menggandakan pembayaran.
- [ ] Cash payment membuat invoice, cash movement, dan audit log.
- [ ] Invoice otomatis menjadi `OVERDUE` setelah due date.
- [ ] Payment reference dan nominal diverifikasi.
- [ ] WhatsApp failure tidak menggagalkan invoice.
- [ ] Admin dapat retry pengiriman.
- [ ] Role tidak berwenang ditolak.
- [ ] Secret dan PII tidak masuk log.
- [ ] Backup dapat direstore.
- [ ] Test alur pembayaran kritis lulus.
- [ ] Pilot 5–10 pelanggan selesai tanpa blocker kritis.

## 7. Urutan Tugas Agent Saat Memulai Coding

Agent harus mengerjakan tugas dalam urutan berikut:

1. Baca kelima dokumen sumber.
2. Audit workspace dan cek perubahan yang sudah ada.
3. Buat project foundation dan CI.
4. Buat migration database final.
5. Implementasikan auth dan authorization.
6. Implementasikan domain customer, package, dan invoice.
7. Tambahkan unit test domain.
8. Implementasikan UI CRM.
9. Implementasikan billing scheduler.
10. Implementasikan adapter Mayar sandbox.
11. Implementasikan webhook payment.
12. Implementasikan adapter Fonnte.
13. Implementasikan dashboard finance dan operational health.
14. Jalankan security hardening dan E2E test.
15. Deploy staging dan jalankan pilot.

## 8. Laporan Wajib Setelah Setiap Task

Setiap task agent harus melaporkan secara ringkas:

- File yang dibuat atau diubah.
- Behavior yang ditambahkan.
- Test yang dijalankan dan hasilnya.
- Risiko atau blocker yang ditemukan.
- Task roadmap berikutnya.

Jangan menandai task selesai jika test relevan belum dijalankan atau jika ada blocker keamanan yang belum dijelaskan.
