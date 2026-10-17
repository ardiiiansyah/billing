# Coding Standards & Conventions

**Produk:** Beatnet — CRM & Billing Otomatis RT/RW Net  
**Status:** Wajib diikuti sebelum implementasi MVP  
**Versi:** 1.0  
**Bahasa kerja:** Bahasa Indonesia untuk dokumentasi produk; English untuk identifier, kode, commit, dan error code.

Dokumen ini adalah standar implementasi yang mengikat. Ia dibaca bersama `PRD.md`, `DATABASE-DESIGN.md`, `SECURITY-STANDARD.md`, dan migration SQL. Bila ada konflik, urutan prioritasnya adalah: security/data integrity, database constraints, PRD, lalu preferensi implementasi.

## 0. Technology Baseline

Keputusan teknis MVP:

- Backend dan frontend menggunakan **TypeScript strict mode**. Hindari `any`; gunakan `unknown` di boundary lalu validasi.
- Backend mengikuti **modular monolith**: satu deployable application dengan worker terpisah dari proses web, bukan microservices.
- PostgreSQL 16+ adalah **system of record**. Redis hanya untuk queue, lock singkat, dan cache.
- Gunakan **Supabase CLI migrations** dengan SQL versioned sebagai sumber schema; jalankan migration pada project Supabase tanpa Prisma.
- Gunakan schema validation di boundary, direkomendasikan **Zod** atau library setara.
- Gunakan **Pino** atau logger JSON setara. Gunakan **Vitest/Jest** untuk unit/integration dan **Playwright** untuk E2E.
- Semua waktu internal adalah UTC; business timezone adalah `Asia/Jakarta`. Nominal adalah integer Rupiah (`BIGINT`/TypeScript `bigint`), bukan floating point.
- Adapter vendor wajib dipisahkan dari domain: Mayar dan Fonnte tidak boleh tersebar sebagai HTTP call langsung di feature service.

> Jika framework web dipilih kemudian, framework tersebut harus mengikuti aturan folder, boundary, security, dan layering di bawah; framework tidak boleh menentukan domain model.

## 1. Architecture & Patterns

### 1.1 Pola wajib

Gunakan kombinasi berikut:

1. **Feature-first modular monolith** untuk organisasi kode.
2. **Clean/Layered Architecture** untuk arah dependensi.
3. **DDD-lite** untuk aggregate dan aturan bisnis finansial.
4. **Ports and Adapters (Hexagonal)** untuk Mayar, Fonnte, clock, queue, dan persistence.
5. **Functional core, imperative shell**: formula fee, due date, state transition, dan message rendering harus pure dan mudah diuji.

Arah dependensi yang diizinkan:

```text
HTTP/UI -> Application -> Domain
Worker  -> Application -> Domain
Infrastructure -> implements Domain/Application ports
Domain -> tidak boleh import framework, Supabase, Redis, Mayar, Fonnte, atau HTTP
```

Aturan penting:

- Controller hanya parsing request, authorization, memanggil use case, dan memetakan response.
- Use case mengorkestrasi transaksi dan port; jangan menaruh aturan bisnis di controller atau ORM hook.
- Domain menentukan invariant: invoice `UNPAID -> PAID`, `UNPAID -> OVERDUE`, `OVERDUE -> PAID`; tidak ada `PAID -> UNPAID`.
- Repository menggunakan `supabase-js` atau SQL/RPC terkontrol dan mengembalikan model domain/DTO yang diperlukan, bukan row mentah.
- Integrasi eksternal selalu memiliki timeout, retry policy, circuit breaker bila sesuai, redaction, dan idempotency key.
- Setelah transaksi database berhasil commit, baru enqueue job/invalidate cache. Jangan mengirim WhatsApp atau memanggil gateway di tengah transaksi database.
- Satu workflow harus memiliki `requestId`/`jobId` untuk tracing.

### 1.2 Aggregate dan use case minimum

Aggregate utama:

- `Customer`: identitas, nomor WA ternormalisasi, paket, billing cycle, status.
- `Package`: katalog dan histori harga.
- `Invoice`: snapshot harga, fee, total, due date, dan state machine.
- `PaymentAttempt` dan `PaymentEvent`: attempt/link dan event gateway immutable.
- `CashMovement`: ledger pembayaran tunai, refund, expense, adjustment.
- `WhatsAppMessage`: delivery attempt dan retry.

Use case minimum:

- `CreateCustomer`, `UpdateCustomer`, `DeactivateCustomer`.
- `CreatePackage`, `ChangePackagePrice`, `DeactivatePackage`.
- `GenerateDailyInvoices` untuk 08:00 WIB.
- `MarkOverdueInvoices` untuk 00:05 WIB.
- `ProcessPaymentWebhook` dan `CheckPaymentStatus`.
- `MarkInvoiceCashPaid`, `RenewPaymentLink`, `RetryWhatsAppMessage`.
- `ReconcileSettlement` dan `ExportReport` secara asynchronous.

### 1.3 Struktur repository baku

```text
beatnet/
├─ apps/
│  ├─ web/                         # HTTP/API dan dashboard admin
│  │  └─ src/
│  │     ├─ modules/               # feature-first modules
│  │     │  ├─ customers/
│  │     │  │  ├─ domain/          # entity, value object, invariant
│  │     │  │  ├─ application/     # use case, DTO, port
│  │     │  │  ├─ infrastructure/ # repository/adapter konkret
│  │     │  │  └─ interface/       # route/controller/schema
│  │     │  ├─ billing/
│  │     │  ├─ payments/
│  │     │  ├─ notifications/
│  │     │  ├─ finance/
│  │     │  ├─ auth/
│  │     │  └─ audit/
│  │     ├─ shared/                # logger, error mapper, config, auth policy
│  │     └─ main.ts                # composition root
│  └─ worker/                      # consumer queue dan scheduled jobs
│     └─ src/jobs/                 # billing, overdue, webhook, WhatsApp, export
├─ packages/
│  ├─ domain/                      # shared domain primitives bila benar-benar lintas app
│  ├─ contracts/                   # API schemas dan public DTO
│  └─ config/                      # typed environment/config loader
├─ supabase/
│  ├─ migrations/                  # migration SQL yang dijalankan Supabase CLI
│  ├─ functions/                   # Edge Functions untuk webhook/worker bila dipilih
│  └─ seed.sql                     # data development non-produksi
├─ migrations/                     # SQL migration immutable, termasuk migration awal
├─ tests/
│  ├─ integration/                 # PostgreSQL/Redis/provider sandbox
│  ├─ e2e/                         # browser flow kritis
│  └─ fixtures/                    # data uji non-produksi
├─ docs/                           # ADR, runbook, API contract, threat evidence
├─ scripts/                        # script maintenance non-domain
└─ .github/workflows/              # CI/CD checks
```

Jangan membuat folder `utils` besar yang menjadi tempat kode acak. Utility harus dekat dengan feature atau diberi nama spesifik (`phone-normalizer.ts`, `idr-money.ts`).

## 2. Naming & Code Style

### 2.1 Konvensi identifier

| Objek                        | Konvensi                    | Contoh                                      |
| ---------------------------- | --------------------------- | ------------------------------------------- |
| Folder                       | `kebab-case`                | `payment-webhooks/`                         |
| File TypeScript              | `kebab-case`                | `process-payment-webhook.ts`                |
| Variable/function            | `camelCase`                 | `billingCycleDay`, `calculateCustomerFee()` |
| Class/type/interface         | `PascalCase`                | `Invoice`, `PaymentGatewayPort`             |
| Enum value/domain status     | `UPPER_SNAKE_CASE`          | `UNPAID`, `PAID`                            |
| Constant                     | `UPPER_SNAKE_CASE`          | `MAX_WEBHOOK_BODY_BYTES`                    |
| Database schema/table/column | `snake_case`                | `app.payment_attempts`, `due_date`          |
| API JSON field               | `camelCase`                 | `invoiceNumber`, `dueDate`                  |
| URL path                     | lowercase kebab/plural noun | `/api/invoices`, `/api/webhooks/payment`    |
| Error code                   | `UPPER_SNAKE_CASE`          | `INVOICE_ALREADY_PAID`                      |
| Test file                    | `*.test.ts` / `*.spec.ts`   | `invoice-state.test.ts`                     |
| Migration                    | sequential descriptive SQL  | `002_add_mfa_columns.sql`                   |

- API memakai `camelCase`; mapper wajib mengubahnya ke database `snake_case`.
- Jangan memakai singkatan ambigu (`cust`, `inv`, `dt`). Singkatan teknis yang mapan seperti `id`, `url`, `api`, `mfa` boleh.
- `id` adalah UUID; gunakan nama eksplisit untuk identifier eksternal: `gatewayOrderId`, `externalEventId`.
- Gunakan `Date`/`Temporal` wrapper yang jelas dan selalu tuliskan timezone pada boundary. Jangan menulis `new Date('2026-01-01')` untuk business calculation tanpa timezone policy.
- Nominal gunakan `bigint` di domain. Serialize ke API sebagai number hanya bila aman; standar Beatnet adalah string decimal untuk nominal (`"150000"`) agar tidak kehilangan presisi.

### 2.2 Formatter, linter, dan quality gates

- **Prettier**: formatter tunggal, dijalankan melalui `format:check` di CI.
- **ESLint**: rules strict TypeScript, no-floating-promises, explicit boundary return type, import order, no-explicit-any, dan no-console.
- **TypeScript**: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **Knip/dependency-cruiser** atau setara untuk dead code dan pelanggaran arah import.
- **Pre-commit**: lint-staged untuk format/lint file berubah; CI tetap menjadi sumber keputusan.
- SQL diformat konsisten (SQLFluff atau formatter setara). Migration yang sudah applied tidak diedit; buat migration baru.
- Tidak ada `console.log` pada production code. Logger harus menerima object terstruktur.

Contoh:

```ts
// Good: tipe dan unit nominal jelas.
const totalAmountIdr = baseAmountIdr + customerFeeIdr;

// Bad: float dapat menghasilkan pembulatan finansial yang salah.
const totalAmount = packagePrice * 1.003;
```

## 3. Error Handling & Logging

### 3.1 Error model

Buat hierarchy terkontrol:

- `AppError`: `code`, `httpStatus`, `safeMessage`, `details`, `cause`, `retryable`.
- `ValidationError` -> 400.
- `AuthenticationError` -> 401.
- `AuthorizationError` -> 403.
- `NotFoundError` -> 404.
- `ConflictError` -> 409.
- `RateLimitError` -> 429.
- `ProviderUnavailableError` -> 503.
- `InternalError` -> 500.

Aturan:

- Boundary menangkap unknown error, memberi `requestId`, dan mengembalikan pesan aman. Stack/cause hanya ke log internal.
- Jangan gunakan exception untuk alur normal seperti `invoice already exists`; gunakan result/conflict yang dipetakan jelas.
- Error provider disimpan dengan kode provider yang disanitasi dan dipotong; jangan simpan token, raw header, atau payload penuh di log.
- Semua mutation yang mengubah keuangan wajib transaction + audit event atau rollback seluruhnya.

Format error standar:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "fields": [{ "field": "billingCycleDay", "message": "Harus 1 sampai 28." }]
  },
  "meta": { "requestId": "uuid" }
}
```

### 3.2 Structured logging

Semua log satu baris JSON dengan minimal `timestamp`, `level`, `service`, `environment`, `requestId`, `event`, dan `durationMs` bila relevan.

- `DEBUG`: detail lokal saat development; disabled atau sampling ketat di production.
- `INFO`: lifecycle normal (`invoice.created`, `webhook.processed`, `scheduler.completed`).
- `WARN`: retry, rate limit, duplicate payment, degraded provider, overdue job partial failure.
- `ERROR`: kegagalan yang membutuhkan tindakan, exception, DLQ, migration/backup failure.

Wajib redact: password, cookie, Authorization, API key, MFA secret, full phone number, full address, payment URL lengkap, raw webhook, dan payload PII. Audit log finansial berbeda dari operational log dan bersifat append-only.

```ts
logger.info({ invoiceId, billingDate, requestId }, 'invoice.created');
// Jangan: logger.info(`Invoice ${invoiceId} untuk ${fullName} ${phone}`);
```

## 4. API & Integration Guidelines

### 4.1 REST conventions

- Prefix `/api`, resource plural: `GET /api/invoices`, `GET /api/invoices/:invoiceId`.
- Mutations memakai `POST` untuk command (`/cash-payment`, `/renew-link`, `/retry`), bukan update bebas ke status.
- `PUT/PATCH` hanya untuk resource yang memang editable. `DELETE` tidak untuk histori finansial; gunakan deactivate/soft delete.
- `POST /api/webhooks/payment` public terbatas: raw-body HMAC-SHA256, replay window, event ID unique, reference dan nominal diverifikasi sebelum proses.
- Auth dashboard menggunakan server-side session, CSRF, secure/httpOnly cookie, dan explicit authorization setiap object. UUID bukan pengganti authorization.
- Query filter/sort allowlist. Default page size 25, maksimum 100.

Success response:

```json
{
  "success": true,
  "data": { "id": "uuid", "invoiceNumber": "INV/202610/0001", "totalAmountIdr": "150450" },
  "meta": { "requestId": "uuid" }
}
```

Validation error adalah `400`; malformed/unknown field ditolak. Server/provider error tidak membocorkan detail internal dan memakai `requestId`.

### 4.2 Pagination, filtering, sorting

- List selalu paginated; gunakan **cursor pagination** untuk feed/audit/event dan offset hanya untuk list kecil admin.
- Response list: `data`, `pagination: { nextCursor, hasMore, pageSize }`.
- Filter tanggal memakai ISO date (`YYYY-MM-DD`) dan timezone dijelaskan. Filter status hanya enum allowlist.
- Sorting hanya field yang didefinisikan, default stabil `createdAt DESC, id DESC`; jangan menerima nama kolom mentah dari user.
- Export besar wajib asynchronous job dengan status dan link object storage yang expire; jangan membangun seluruh CSV di memory web process.

### 4.3 External integration

- `MayarClient` hanya di adapter payment gateway; `FonnteClient` hanya di notification adapter.
- Set timeout outbound 5–10 detik, retry hanya operasi aman/idempoten, exponential backoff + jitter, dan DLQ setelah batas percobaan.
- Simpan `payment_attempts`, `payment_events`, dan `whatsapp_messages`; jangan overwrite histori.
- Webhook: durable ingress -> validasi -> queue -> transaction lock invoice -> state transition -> commit -> side effects.
- Status timeout provider tidak pernah dianggap `PAID`.

## 5. Testing & QA

### 5.1 Piramida dan target

- **Unit**: domain formula, date calculation, normalizer, state machine, policy, template; cepat dan tanpa network.
- **Integration**: PostgreSQL migration nyata, transaction, unique/idempotency, Redis queue, adapter contract dengan mock server/sandbox.
- **E2E**: login/MFA, create customer, generate invoice, dashboard overdue, cash payment, webhook digital, duplicate payment, retry WhatsApp.
- Target minimum: **80% line dan branch coverage untuk business logic**, 90% untuk billing/payment state transition dan security-critical code. Coverage bukan pengganti test scenario.
- CI wajib menjalankan lint, typecheck, unit, integration, migration test, E2E smoke, dependency/SAST/secret scan.

### 5.2 Konvensi test

File test diletakkan dekat source untuk unit (`invoice-state.test.ts`) dan di `tests/integration`/`tests/e2e` untuk test lintas proses. Nama test menjelaskan behavior, bukan implementasi.

Gunakan Arrange-Act-Assert:

```ts
it('menandai duplicate payment ketika invoice sudah PAID via CASH', async () => {
  // Arrange
  const invoice = await givenCashPaidInvoice();

  // Act
  await processPaymentWebhook(givenValidPaidWebhook(invoice));

  // Assert
  expect(await getInvoice(invoice.id)).toMatchObject({
    status: 'PAID',
    duplicatePaymentFlag: true,
  });
});
```

Test wajib mencakup: scheduler concurrent/idempotent, due date lintas bulan/tahun, fee rounding `ceil(F*0.30)`, invalid signature, replay, nominal mismatch, unknown order, duplicate/out-of-order webhook, PAID cash lalu digital, provider timeout, package price snapshot, rollback cash movement, authorization/IDOR, CSRF, rate limit, dan secret/PII redaction.

## 6. Git Workflow & Code Review

### 6.1 Branching

Gunakan **trunk-based development** dengan branch pendek dari `main`:

- `feature/BT-123-invoice-scheduler`
- `fix/BT-124-webhook-replay`
- `docs/BT-125-coding-standards`
- `refactor/BT-126-payment-adapter`
- `hotfix/BT-127-invalid-signature`

`main` selalu deployable. Tidak ada push langsung; branch protection mewajibkan PR, CI, dan review. Hotfix tetap dibuat PR dan harus memiliki post-release test.

### 6.2 Commit

Gunakan Conventional Commits:

```text
feat(billing): add idempotent daily invoice generation
fix(payments): reject webhook amount mismatch
test(webhooks): cover duplicate event processing
docs(security): document payment replay protection
refactor(notifications): isolate Fonnte adapter
chore(ci): add secret scanning
```

Satu commit sebaiknya satu tujuan. Jangan commit secret, `.env` production, dump database, raw customer data, generated credential, atau hasil build.

### 6.3 PR approval checklist

PR hanya disetujui bila:

- [ ] Requirement/ADR dan perubahan schema dijelaskan.
- [ ] Unit/integration/E2E test relevan ditambahkan atau alasan terdokumentasi.
- [ ] `format:check`, lint, typecheck, test, migration test, SAST/SCA, dan secret scan lulus.
- [ ] Tidak ada hardcoded secret, raw PII, unsafe log, `any`, SQL concatenation, atau mass assignment.
- [ ] Authorization, CSRF, validation, rate limit, audit, dan error mapping ditinjau untuk mutation baru.
- [ ] Perubahan finansial menjaga integer IDR, snapshot invoice, state machine, idempotency, dan atomic transaction.
- [ ] Migration backward-compatible (expand -> deploy -> backfill -> contract) dan rollback/runbook tersedia.
- [ ] Minimal satu peer review; perubahan payment/security perlu reviewer kedua.
- [ ] Screenshot/recording UI tersedia untuk perubahan dashboard mobile-first.

## 7. Performance & Memory Rules

### 7.1 Anti-pattern terlarang

- N+1 query; gunakan join/include terukur atau batch query dan cek query plan.
- Query tanpa pagination, `SELECT *`, atau sort/filter dari input mentah.
- Menyimpan status pembayaran hanya di Redis/cache.
- Memuat seluruh customer/invoice/export ke memory.
- Blocking I/O atau synchronous filesystem call di request/worker async.
- Retry tanpa batas, retry non-idempoten, atau retry storm tanpa jitter.
- Memanggil Mayar/Fonnte satu per satu dalam transaksi DB panjang.
- `Promise.all` tanpa concurrency limit untuk provider calls.
- Menambah partition/sharding sebelum metrik menunjukkan kebutuhan; target 140 pelanggan belum memerlukannya.

### 7.2 Data besar dan background jobs

- Endpoint synchronous harus bounded; export, retry massal, reconciliation, dan webhook processing berjalan di durable Redis queue.
- Worker mengambil job dengan lock/visibility timeout, idempotency key, retry exponential backoff, max attempt, dan DLQ.
- Proses database batch kecil (`100`–`500` row) dengan `FOR UPDATE SKIP LOCKED` bila worker paralel.
- Scheduler 08:00 dan 00:05 WIB memakai advisory lock, `scheduler_runs` unique key, dan unique `(customer_id, billing_date)`.
- Queue concurrency provider dibatasi untuk menjaga kuota Fonnte dan rate limit Mayar.
- Gunakan cursor/stream untuk export; temporary file/object storage untuk hasil. Link export harus signed, scoped, dan expire.
- Cache dashboard TTL 30–120 detik; invalidate setelah commit invoice/payment. Jangan cache keputusan `PAID` sebagai source of truth.
- Ukur p95 latency API, query duration, queue lag, retry count, webhook age, scheduler missed run, memory RSS, dan provider error rate.

Contoh anti-N+1:

```ts
// Good: satu query terukur untuk queue billing.
const customers = await customerRepo.findActiveByBillingDay(todayDay, { limit: 500 });

// Bad: query package di dalam loop setiap customer.
for (const customer of customers) {
  customer.package = await packageRepo.findById(customer.packageId);
}
```

## 8. Financial, Security, dan Operational Invariants

Implementasi dianggap gagal bila salah satu invariant berikut dilanggar:

- `totalAmountIdr = baseAmountIdr + customerFeeIdr` dan `customerFeeIdr = ceil(gatewayFee * 0.30)`.
- Semua timestamp tersimpan UTC; display/scheduler menggunakan `Asia/Jakarta`.
- Invoice lama menyimpan snapshot paket/harga dan tidak berubah saat harga paket berubah.
- Webhook signature invalid, replay, reference mismatch, atau amount mismatch tidak mengubah invoice.
- Event webhook duplicate tidak mengeksekusi business transition kedua kali.
- Pembayaran digital setelah `PAID(CASH)` dicatat sebagai payment event dan menyalakan `duplicatePaymentFlag`; tidak menghapus histori.
- Audit finansial append-only; refund adalah movement/event baru, bukan membalik `PAID` menjadi `UNPAID`.
- Secret dan PII tidak masuk source, log, response error, screenshot, atau export tanpa kontrol.
- Runtime database role tidak memiliki DDL; migration dijalankan oleh role terpisah.

## 9. Definition of Done

Fitur siap merge bila kode, test, observability, audit, migration, security review, dokumentasi, dan rollback/runbook telah tersedia. Fitur billing/payment tidak boleh dirilis hanya karena happy-path E2E lulus; seluruh failure state pada PRD dan security standard harus memiliki test atau risk acceptance tertulis.
