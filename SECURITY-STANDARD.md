# Standard Security & Threat Model

**Produk:** CRM & Billing Otomatis RT/RW Net (Beatnet)  
**Versi:** 1.0 — baseline sebelum coding  
**Status:** Wajib dipenuhi sebelum MVP dirilis  
**Konteks:** 1 operator, sekitar 140 pelanggan, PostgreSQL 16+, Redis queue/cache, Mayar Payment Gateway, Fonnte WhatsApp, deployment pada server publik.

---

## 0. Keputusan Keamanan yang Mengikat

1. **Aplikasi adalah admin-only.** Tidak ada portal pelanggan atau akun pelanggan pada MVP. Pelanggan hanya menerima WhatsApp dan membuka checkout Mayar.
2. **PostgreSQL adalah system of record.** Redis tidak boleh menjadi sumber kebenaran status pembayaran.
3. **Server-side session digunakan untuk dashboard admin.** Jangan menyimpan access token atau refresh token di `localStorage`.
4. **Password memakai Argon2id**, MFA TOTP wajib untuk akun `ADMIN`, dan recovery MFA harus memakai single-use recovery codes.
5. **Webhook tidak dipercaya sebelum diverifikasi.** Verifikasi raw body, signature, timestamp/replay window, reference, nominal, dan status transaksi.
6. **Semua perubahan finansial bersifat auditable dan transactional.** Invoice `PAID` tidak boleh dikembalikan ke `UNPAID`; refund menjadi event/movement baru.
7. **Secret tidak disimpan di source code, `.env` production, database plaintext, log, atau screenshot dashboard.** Gunakan secret manager/KMS.
8. **Default-deny berlaku untuk authorization, CORS, egress network, database privilege, dan endpoint administratif.**
9. **PII pelanggan diperlakukan sebagai data terbatas.** Akses, export, backup, dan retention harus dikontrol.
10. **MVP tidak memproses kartu atau menyimpan credential pembayaran pelanggan.** Pembayaran dialihkan ke halaman Mayar.

### Aset yang harus dilindungi

| Aset                                       | Dampak kompromi                      | Klasifikasi        |
| ------------------------------------------ | ------------------------------------ | ------------------ |
| Password, session cookie, MFA secret       | Pengambilalihan admin                | Sangat sensitif    |
| Nama, nomor WhatsApp, alamat, koordinat    | Phishing, stalking, privasi          | PII terbatas       |
| Invoice, payment URL, gateway reference    | Manipulasi tagihan, fraud            | Finansial          |
| Webhook raw payload dan signature evidence | Pemalsuan status pembayaran          | Finansial/evidence |
| Mayar API key dan Fonnte token             | Pembuatan transaksi/pesan tanpa izin | Secret kritis      |
| Audit log dan cash movement                | Sengketa dan non-repudiation         | Evidence           |
| Backup dan export                          | Kebocoran massal                     | Sangat sensitif    |

### Trust boundaries

- Browser admin ↔ HTTPS application.
- Application ↔ PostgreSQL, Redis, secret manager.
- Application ↔ Mayar API dan Fonnte API.
- Mayar ↔ public webhook endpoint.
- Operator manusia ↔ tindakan finansial berisiko.
- Backup/object storage ↔ production account.

---

## 1. Metodologi PASTA dan STRIDE

### 1.1 PASTA ringkas

1. **Business objective:** penagihan otomatis, rekonsiliasi akurat, dan pengurangan kerja manual tanpa isolir jaringan.
2. **Technical scope:** dashboard admin, scheduler, queue worker, payment API, webhook, WhatsApp dispatcher, PostgreSQL, Redis, backup.
3. **Application decomposition:** identity/session, CRM, billing, payment, notification, finance/audit, infrastructure.
4. **Threat analysis:** fraud invoice, takeover admin, forged webhook, PII disclosure, provider abuse, data loss.
5. **Weakness analysis:** token leakage, broken access control, replay, SSRF, injection, race condition, misconfigured CORS.
6. **Attack modeling:** prioritaskan jalur yang mengubah status `PAID`, mengirim pesan, membaca PII, atau mengubah integration credentials.
7. **Risk treatment:** kontrol di bawah wajib diuji dengan automated test dan security review.

### 1.2 STRIDE threat register

| ID / kategori               | Target dan skenario                                                                    | Dampak                          | Mitigasi implementasi                                                                                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 Spoofing               | Password spray, credential stuffing, atau session cookie dicuri                        | Admin takeover                  | Argon2id; MFA TOTP; login throttling; generic error; secure cookie; session rotation setelah login/MFA; revoke semua session saat password/MFA berubah.                                |
| S-02 Spoofing               | Penyerang memanggil webhook seolah-olah Mayar                                          | Invoice palsu menjadi lunas     | HMAC-SHA256 atas raw bytes; constant-time compare; provider IP allowlist hanya bila stabil; timestamp window ±5 menit; external event ID; verifikasi order ID dan nominal ke database. |
| S-03 Spoofing               | Fake Fonnte/Mayar response atau DNS/TLS interception                                   | Link/pesan salah                | TLS certificate validation; outbound hostname allowlist; jangan menerima URL redirect dari input; simpan provider reference yang tervalidasi.                                          |
| T-01 Tampering              | Admin/operator memodifikasi harga, customer, invoice, atau cash movement tanpa kontrol | Kerugian dan sengketa           | RBAC; server-side validation; transaction + row lock; immutable invoice snapshot; audit before/after terfilter; DB constraints; approval/re-auth untuk cash/refund/credential.         |
| T-02 Tampering              | Replay atau webhook out-of-order                                                       | Status/nominal salah            | Unique `(provider,event_id)`; idempotent consumer; state machine; lock invoice `FOR UPDATE`; nominal harus sama dengan payment attempt; event immutable.                               |
| T-03 Tampering              | SQLi/NoSQLi/command injection melalui search, export, template, atau provider fields   | Database/server compromise      | Parameterized query/ORM; allowlist sort/filter; no shell concatenation; template variables escaped; dependency scanning.                                                               |
| T-04 Tampering              | Scheduler dijalankan dua instance                                                      | Invoice/pesan ganda             | Advisory lock + unique `(customer_id,billing_date)` + scheduler run unique key; queue idempotency key.                                                                                 |
| R-01 Repudiation            | Admin menyangkal `Terima Tunai`, ubah status, refund, export, atau credential change   | Tidak ada bukti sengketa        | Audit append-only dengan actor, request ID, timestamp UTC, IP, user-agent, reason, before/after; re-auth dan confirmation untuk tindakan berisiko.                                     |
| R-02 Repudiation            | Provider mengirim event duplicate/invalid                                              | Sulit investigasi               | Simpan minimal evidence signature-invalid; simpan provider event ID, headers terpilih, hash payload, status pemrosesan, error terstruktur.                                             |
| I-01 Information disclosure | IDOR pada customer/invoice/detail/export                                               | PII dan data finansial bocor    | UUID bukan kontrol akses; authorization pada setiap object; export scoped; response minim; masking nomor/alamat; deny direct object storage public.                                    |
| I-02 Information disclosure | Log, error, backup, atau raw webhook memuat token/PII                                  | Kebocoran massal                | Redaction middleware; structured logging; raw payload encrypted/restricted; secret scanning; backup encryption; log access RBAC.                                                       |
| I-03 Information disclosure | SSRF melalui `redirectUrl`, payment URL, callback, atau health-check URL               | Akses metadata/internal service | URL provider fixed/allowlist; hanya `https`; resolve DNS dan blok private/link-local/loopback/metadata IP; no arbitrary URL fetch dari user.                                           |
| I-04 Information disclosure | WhatsApp ke nomor salah akibat normalisasi/ubah nomor                                  | PII dan tagihan ke orang lain   | E.164 validation; uniqueness active; masked preview; confirmation saat nomor berubah; audit; retry tidak mengubah recipient tanpa explicit action.                                     |
| D-01 Denial of service      | Login, webhook, search, export, atau retry dibanjiri                                   | Dashboard/penagihan berhenti    | WAF/CDN untuk HTTP; per-IP dan per-account rate limit; bounded request body; queue backpressure; circuit breaker provider; pagination; export async.                                   |
| D-02 Denial of service      | Malicious webhook payload besar/invalid                                                | Worker/DB penuh                 | Max body 256 KB; content type exact; timeout; reject before persistence; bounded retries + DLQ; retention policy.                                                                      |
| D-03 Denial of service      | Fonnte/Mayar unavailable                                                               | Pesan/rekonsiliasi tertunda     | Durable queue; exponential backoff with jitter; provider timeout 5–10s; status degraded; manual retry/check status; no payment state inferred from provider timeout.                   |
| E-01 Elevation of privilege | `OPERATOR` memakai endpoint admin/settings/audit                                       | Secret/finance takeover         | Explicit endpoint policy; role matrix; deny by default; integration credentials only `ADMIN`; test every route for role bypass.                                                        |
| E-02 Elevation of privilege | Mass assignment (`role`, `status`, `paid_at`) dari request                             | Privilege or payment fraud      | DTO allowlist; never bind request directly to model; server-owned fields ignored/rejected; state transition service only.                                                              |
| E-03 Elevation of privilege | Queue worker memakai DB owner credentials                                              | SQL/data destruction            | Separate runtime DB role; migration role separate; worker least privilege; no DDL/DROP; network policy.                                                                                |

**Prioritas sebelum production:** S-01/S-02, T-01/T-02, I-01/I-02, D-01, E-01. Semua harus memiliki test negatif dan evidence review.

---

## 2. Authentication & Authorization Standard

### 2.1 Authentication

- Gunakan **server-side session-based authentication** untuk dashboard. Cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, host-only, tidak ada session ID di URL.
- Session ID minimal 256 bit random dari CSPRNG. TTL idle **8 jam**, absolute TTL **24 jam**. Rotasi ID setelah login, MFA, reset password, dan privilege change.
- Password minimum 12 karakter, disarankan passphrase; tolak password umum melalui breached-password check lokal/terkontrol. Hash **Argon2id** dengan memory 64 MiB, time cost 3, parallelism 1 sebagai baseline; rehash saat parameter naik. Tidak ada plaintext atau reversible password encryption.
- `ADMIN` wajib **MFA TOTP** (RFC 6238, secret encrypted with KMS). Recovery codes single-use, hashed, dan hanya ditampilkan sekali. SMS OTP bukan faktor utama.
- Login: rate limit 5 gagal/15 menit per account dan bucket per IP; setelah ambang lebih tinggi gunakan progressive delay. Pesan selalu generik.
- Password reset memakai token random single-use, TTL 30 menit, disimpan sebagai hash, dan mencabut seluruh session setelah berhasil.
- Untuk integrasi server-to-server, gunakan API key/provider HMAC sesuai vendor. Jangan memakai JWT sebagai pengganti session browser pada MVP.

### 2.2 Token dan revocation

- Tidak ada refresh token di browser MVP. Jika mobile/API publik diperlukan nanti, gunakan OAuth2 Authorization Code + PKCE, access token 5–10 menit, refresh token rotation setiap penggunaan, reuse detection, dan revocation server-side.
- Session revocation disimpan di server; logout mencabut session saat ini. Password/MFA change mencabut semua session.
- CSRF token synchronizer wajib untuk semua request state-changing. `SameSite` adalah lapisan tambahan, bukan pengganti CSRF.

### 2.3 RBAC/ABAC

| Aksi                                          |        `ADMIN` |                  `OPERATOR` |               `REPORTING` |
| --------------------------------------------- | -------------: | --------------------------: | ------------------------: |
| Login/dashboard operasional                   |             Ya |                          Ya |             Ya, read-only |
| CRUD customer dan package                     |             Ya | Ya, tanpa hapus/price final |                     Tidak |
| Generate/retry WhatsApp                       |             Ya |                          Ya |                     Tidak |
| Terima tunai / ubah invoice paid              |             Ya |  Ya, wajib reason dan audit |                     Tidak |
| Refund, duplicate-payment resolution, expense |   Ya + re-auth |                       Tidak |                     Tidak |
| Mayar/Fonnte credentials, webhook settings    |   Ya + re-auth |                       Tidak |                     Tidak |
| User, role, MFA, security settings            |             Ya |                       Tidak |                     Tidak |
| Audit log dan raw payment evidence            | Ya, restricted |           Metadata terpilih | Ringkasan tanpa PII penuh |
| Export PII/finance                            |    Ya + reason |                       Tidak |    Finance aggregate saja |

ABAC tambahan: user aktif, tenant/account context, resource scope, dan action risk. Walaupun saat ini satu tenant dan satu admin, implementasikan policy layer agar object ID tidak menjadi otorisasi.

---

## 3. Data Protection & Privacy

### 3.1 Data at rest

- Disk PostgreSQL, Redis persistence, object storage, dan backup memakai encryption-at-rest provider dengan **AES-256**. Kunci dikelola KMS/secret manager terpisah dan rotasi minimal tahunan atau saat incident.
- Untuk PII bernilai tinggi (`phone_whatsapp`, address, koordinat) gunakan **AES-256-GCM application-level encryption** bila threat assessment deployment menuntutnya. Simpan nonce dan authentication tag; key version ikut disimpan, bukan key.
- Karena pencarian nomor membutuhkan lookup, simpan HMAC-SHA-256 keyed lookup (`phone_lookup_hmac`) terpisah dari ciphertext. Jangan gunakan unsalted SHA-256 untuk nomor telepon.
- Password: Argon2id, bukan AES/encryption. API key: secret manager reference; database hanya `masked_value`.
- Raw webhook: encrypted column/object storage dengan ACL ketat; simpan hanya field yang diperlukan untuk normal processing bila raw evidence tidak diperlukan.
- Database roles: application runtime DML terbatas; migration role terpisah; reporting read-only; audit append-only. TLS database wajib (`sslmode=verify-full`).

### 3.2 Data in transit

- Semua endpoint publik dan internal memakai **TLS 1.3**; TLS 1.2 hanya jika provider tidak mendukung dan cipher modern diizinkan. Redirect HTTP ke HTTPS.
- HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains` setelah seluruh subdomain aman; preload hanya setelah verifikasi operasional.
- Outbound Mayar/Fonnte: HTTPS, certificate validation aktif, timeout dan hostname allowlist. Redis TLS dan PostgreSQL TLS wajib bila melewati host/process boundary.
- Jangan menaruh PII atau token pada query string. Payment URL provider boleh ditampilkan ke customer karena memang fungsi produk, tetapi tidak dicatat lengkap di log.

### 3.3 Minimization, masking, retention

- UI default: `62812*****90`; alamat/koordinat hanya pada customer detail dengan authorization. Export selalu explicit, scoped, logged, dan encrypted.
- Log tidak boleh berisi password, cookie, Authorization header, API key, MFA secret, full payment URL, raw payload, nomor WhatsApp penuh, atau alamat lengkap.
- Retention baseline: audit/payment evidence **5 tahun** atau periode legal/bisnis yang lebih panjang; operational logs 90 hari; webhook raw payload 90–180 hari bila tidak diwajibkan lebih lama. Setelah kewajiban berakhir, hapus/anonymize dan audit tindakan tersebut.
- Jangan mengirim data pelanggan selain yang dibutuhkan ke Mayar/Fonnte. Template WhatsApp tidak boleh memuat koordinat atau alamat lengkap.

---

## 4. API & Input Security

### 4.1 Validasi umum

- Terapkan schema validation di boundary (misalnya Zod/Joi/Pydantic equivalent), tipe ketat, ukuran maksimum, dan reject unknown fields.
- Whitelist enum/status/action; nominal adalah integer Rupiah `BIGINT`, bukan float; validasi batas maksimum bisnis. Billing day hanya 1–28. Nomor harus dinormalisasi dan divalidasi ke `628...`; latitude/longitude range checked.
- Parameterized queries/ORM only. Sort field, filter, column selection, dan export format dari allowlist.
- Output encode sesuai context: HTML escaping untuk template, JSON serializer untuk API, URL encoding untuk URLs. CSP mencegah inline script; jangan mengandalkan sanitasi sebagai satu-satunya XSS control.
- Error response generic untuk client, detail hanya di internal log dengan request ID.

### 4.2 CSRF, CORS, SSRF

- CSRF synchronizer token untuk POST/PUT/PATCH/DELETE dashboard; validasi `Origin`/`Referer` sebagai defense-in-depth.
- CORS **deny by default**. Izinkan hanya origin dashboard production exact; `credentials=true` tidak boleh dipakai dengan wildcard origin.
- Tidak ada arbitrary server-side URL fetch. Payment redirect hanya URL hard-coded/allowlisted. Block RFC1918, loopback, link-local, IPv6 local, cloud metadata (`169.254.169.254`), redirects ke alamat terlarang, dan DNS rebinding.

### 4.3 Endpoint controls

- Body limit umum 1 MB; webhook 256 KB; timeout request 10 detik; pagination wajib (maksimal 100 row).
- `POST /api/webhooks/payment`: public tetapi hanya menerima provider content type, signature valid, replay window, event ID unique, reference+amount match. Return cepat setelah durable ingress; processing async. Signature invalid: `401`; malformed/unsupported: `400`; valid duplicate: idempotent `200`.
- Cash paid, refund, credential change, manual status override: re-auth MFA/step-up, confirmation, reason wajib, audit sebelum/bersamaan transaksi.
- Payment status manual hanya boleh query gateway reference yang tersimpan, tidak menerima reference arbitrary dari client.
- Tidak ada endpoint yang menerima `role`, `paid_at`, `paid_method`, `duplicate_payment_flag`, `created_by`, atau audit actor dari client.

### 4.4 Rate limiting dan DDoS

| Area                 | Limit baseline                                                       |
| -------------------- | -------------------------------------------------------------------- |
| Login                | 5 failures/account/15 menit + per-IP bucket                          |
| Admin API read       | 120 request/menit/user                                               |
| Admin mutation       | 30 request/menit/user                                                |
| Webhook              | 120 request/menit/IP, burst 30; provider allowlist bila memungkinkan |
| Manual payment check | 10/invoice/jam dan 60/user/jam                                       |
| WhatsApp retry       | queue-controlled, maksimal 5 per message, backoff                    |
| Export               | 3/user/jam, asynchronous                                             |

Gunakan WAF/CDN atau reverse proxy untuk volumetric protection, connection limits, body limits, queue backpressure, dan circuit breaker. Rate limit tidak boleh menjadi alasan membuang webhook valid; queue harus durable.

---

## 5. Secure Logging, Monitoring & Audit

### 5.1 Audit events wajib

Catat minimal: login berhasil/gagal, logout, password/MFA/reset, session revoke, user/role change, customer create/update/status/phone change, package/price change, invoice create/status transition, cash payment, refund/adjustment, duplicate payment, payment status check, webhook accept/reject/process failure, WhatsApp send/retry/failure, credential enable/rotate/test, export, report download, scheduler start/end, migration, backup/restore, dan security alert.

Setiap event: `event_id`, `occurred_at` UTC, actor/service, action, entity type/ID, request ID, outcome, reason, source IP, user-agent, authentication/MFA context, and before/after allowlisted fields. Jangan menyimpan secret atau PII penuh.

### 5.2 Log security

- Structured JSON; newline/control characters di user input di-escape atau dihapus untuk mencegah log injection.
- PII/token redaction dilakukan sebelum logger menerima event. Error dari provider di-truncate dan disanitasi.
- Audit log append-only: DB trigger menolak UPDATE/DELETE; akses write hanya service audit. Forward ke storage terpisah/immutable bila tersedia.
- Sinkronisasi waktu via NTP; timestamp server-side, bukan dari client. Alert jika clock drift.
- Monitoring/alert: brute force, MFA failure burst, privilege changes, invalid webhook spike, signature mismatch, amount mismatch, duplicate payments, queue backlog, provider outage, scheduler missed run, Fonnte disconnected, DB auth failure, export spike, backup failure.
- Incident severity tinggi wajib membuat ticket/notification ke operator dan menyimpan evidence tanpa menyebarkan PII ke channel chat.

---

## 6. Infrastructure & Deployment Baseline

### 6.1 Secrets dan environment

- Secret manager/KMS wajib untuk Mayar API key, Fonnte token, webhook signing secret, session encryption key, DB password, backup key, dan MFA encryption key.
- Pisahkan secret `development`, `staging`, `production`; production tidak boleh diakses developer secara default. Rotation tanpa downtime melalui dual-key overlap.
- CI/CD: secret scanning, SAST, dependency/SCA scan, migration review, image scan, SBOM, signed artifacts, protected production deployment, dan least-privilege deploy identity.
- Production container/process non-root, filesystem read-only bila memungkinkan, drop Linux capabilities, resource limits, dependency pinning, automatic security updates, dan minimal base image.

### 6.2 Network dan service

- Internet hanya ke reverse proxy/WAF dan webhook path. PostgreSQL, Redis, worker, dan secret manager berada di private network.
- Egress allowlist: Mayar, Fonnte, DNS/NTP, observability endpoint. Block arbitrary outbound traffic.
- PostgreSQL `sslmode=verify-full`; Redis ACL per service, TLS, password/ACL, tidak bind ke public interface. Worker dan web memakai service identities terpisah.
- DB runtime user tidak memiliki `CREATE`, `ALTER`, `DROP`, superuser, atau ownership. Migration role hanya dijalankan dari controlled deployment.

### 6.3 Headers dan browser

Wajib pada dashboard:

- `Content-Security-Policy`: mulai dengan `default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';` lalu allowlist script/style/font eksplisit; hindari `unsafe-eval` dan minimalkan `unsafe-inline`.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` deny camera/microphone/geolocation kecuali benar-benar diperlukan.
- `frame-ancestors 'none'` dan `X-Frame-Options: DENY` untuk legacy.
- `Cache-Control: no-store` pada response yang mengandung PII/finance.

### 6.4 Backup dan recovery

- PITR WAL + backup harian terenkripsi AES-256, object lock/immutability bila tersedia, akun storage terpisah.
- Target awal: `RPO <= 15 menit`, `RTO <= 2 jam`.
- Restore test bulanan, failover drill kuartalan. Setelah restore, replay webhook ingress yang belum diproses dan jalankan rekonsiliasi gateway.
- Backup/restore, export, dan perubahan retention harus diaudit.

---

## 7. Payment dan Webhook Security Runbook

1. Terima raw request dengan max body dan timeout.
2. Simpan request ID dan hash payload; jangan log raw body.
3. Verifikasi HMAC-SHA256 memakai raw bytes dan constant-time compare.
4. Validasi timestamp/replay window dan event ID.
5. Parse schema setelah signature valid; reject unknown/invalid fields.
6. Cari `payment_attempt` berdasarkan provider + gateway order ID; jangan percaya invoice ID dari payload saja.
7. Verifikasi amount = expected invoice/attempt amount dan currency yang disepakati.
8. Insert durable event dengan unique `(provider,event_id)`; duplicate tidak diproses ulang.
9. Dalam transaction: lock invoice, terapkan state machine, set `paid_at/method/amount`, flag duplicate bila sebelumnya `CASH`, dan tulis audit.
10. Commit dahulu, lalu enqueue notification/cache invalidation.
11. Return status sesuai provider; processing error masuk retry/DLQ, bukan menandai paid secara optimistis.

**Catatan vendor:** format signature, header, status, expiry, dan API Mayar harus diverifikasi dari dokumentasi resmi/akun sandbox sebelum adapter dikunci. Jangan mengasumsikan bahwa nama field/signature pada PRD selalu identik dengan implementasi vendor.

---

## 8. Compliance & Regulatory Checklist

### 8.1 UU PDP Indonesia

- Tetapkan peran: operator sebagai **Pengendali Data Pribadi**; Mayar/Fonnte sebagai pihak pemroses/penyedia sesuai kontrak dan pembagian peran aktual.
- Dokumentasikan tujuan pemrosesan: penyediaan layanan, billing, notifikasi, rekonsiliasi, fraud/security, dan kewajiban hukum. Kumpulkan data minimum.
- Berikan privacy notice Bahasa Indonesia yang menjelaskan data, tujuan, dasar pemrosesan, vendor, retention, hak subjek, dan kontak.
- Sediakan proses hak akses, koreksi, penghapusan/anonymization bila tidak ada kewajiban menyimpan, pembatasan, dan keberatan; pengecualian harus didokumentasikan.
- Buat register processing activity, data flow/vendor register, risk assessment/DPIA sederhana untuk koordinat dan PII, serta prosedur breach notification sesuai tenggat yang berlaku.
- Kontrak vendor harus mencakup confidentiality, security controls, subprocessor, lokasi/transfer data, incident notice, deletion/return, dan audit rights.
- Tetapkan retention schedule dan hapus data sesuai tujuan/kewajiban pembukuan. Jangan menyimpan data kartu; gunakan hosted checkout.

### 8.2 GDPR applicability

GDPR hanya berlaku bila terdapat target, pelanggan, atau monitoring individu di EEA atau kondisi ekstrateritorial lain. Jika berlaku: tentukan lawful basis, Art. 13/14 notice, DPA, transfer mechanism, records of processing, data subject request SLA, breach process, DPIA bila high risk, dan DPO/representative bila diwajibkan. Jangan menyatakan “GDPR compliant” tanpa scope assessment.

### 8.3 ISO 27001 alignment

ISO 27001 bukan kewajiban otomatis untuk MVP, tetapi kontrol berikut harus dipetakan bila sertifikasi/enterprise due diligence dibutuhkan: asset inventory, risk register, access control, supplier security, secure development lifecycle, logging/monitoring, incident response, backup/DR, vulnerability management, change management, business continuity, dan evidence review berkala.

### 8.4 Bukti kepatuhan minimum sebelum go-live

- Privacy notice dan retention schedule disetujui.
- Data flow diagram dan vendor/DPA review selesai.
- Access matrix dan daftar production users disetujui.
- SAST/SCA/secret scan tanpa critical/high unresolved.
- Threat-model review dan penetration test endpoint auth/webhook selesai.
- Backup restore dan incident tabletop diuji.
- Evidence audit log, deletion/anonymization, consent/notice delivery, dan webhook verification tersimpan.

---

## 9. Secure Development & Acceptance Gate

### Wajib sebelum coding selesai

- Unit/integration test: auth, MFA, CSRF, RBAC/IDOR, validation, SQLi/XSS payload, SSRF block, rate limit.
- Payment test: invalid signature, replay, duplicate, amount mismatch, unknown order, out-of-order, `PAID(CASH)` lalu digital, timeout, provider retry, and transaction rollback.
- Billing test: concurrent scheduler, due date lintas bulan/tahun, duplicate invoice, retry WhatsApp, and queue DLQ.
- Security test otomatis memastikan response tidak membocorkan secret/PII dan setiap mutation memiliki audit event.
- Dependency, container, IaC, dan secret scans dijalankan pada setiap pull request dan release.
- Manual review untuk route authorization, state transition, export, integration settings, dan CSP.

### Go-live blocker

Jangan rilis bila salah satu kondisi berikut ada: webhook signature belum diverifikasi; MFA admin belum aktif; secret berada di repository/log; object authorization belum diuji; database publik; backup belum pernah direstore; invoice dapat diubah menjadi `PAID` lewat mass assignment; audit finansial dapat dihapus; atau critical/high vulnerability belum memiliki risk acceptance tertulis.

---

## 10. Referensi Implementasi Internal

Dokumen ini harus dibaca bersama `PRD.md`, `DATABASE-DESIGN.md`, dan `migrations/001_initial_schema.sql`. Schema yang sudah ada mendukung banyak kontrol penting: integer Rupiah, immutable payment events, unique idempotency key, invoice state trigger, append-only audit log, credential reference, dan role baseline. Sebelum implementasi, developer wajib menambahkan enforcement di application layer karena constraint database saja tidak cukup untuk authentication, authorization, CSRF, rate limiting, redaction, dan secret management.
