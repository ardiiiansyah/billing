# Pre-Deployment Report - Sultan WiFi Billing System
**Tanggal Audit:** 1 November 2026  
**Status:** Belum siap deployment production

---

## ✅ Yang Sudah Lengkap

### 1. Integrasi Mayar Payment Gateway
- ✅ Library payment sudah dimigrasi dari Midtrans → Mayar
- ✅ Webhook handler dengan signature verification (constant-time comparison)
- ✅ Replay protection dengan timestamp validation (5 menit window)
- ✅ Payment attempt tracking di database
- ✅ Idempotency handling untuk mencegah double-processing
- ✅ Customer fee calculation (Rp 240 untuk QRIS/e-wallet)
- ✅ RPC function `process_gateway_payment` untuk atomicity
- ✅ Payment link generation di cron job `generate-payment-links`
- ✅ Public payment page di `/bayar/[id]` dengan UI polish
- ✅ Security: amount NEVER dari client, selalu dari database
- ✅ Unit tests untuk Mayar integration (webhook & payment creation)

**File terkait:**
- `lib/mayar.js` - Core integration
- `lib/payments.js` - Business logic
- `app/api/payment/webhook/route.js` - Webhook handler
- `app/api/payment/create/route.js` - Payment link creation
- `app/bayar/[id]/page.js` - Public payment page

### 2. WhatsApp Integration (Fonnte)
- ✅ Library WhatsApp sudah ada di `lib/whatsapp.js`
- ✅ Fungsi `kirimWA()` untuk single message
- ✅ Fungsi `kirimWABatch()` dengan rate limiting (12 pesan/batch, 2.5s delay)
- ✅ Support text + media URL
- ✅ Phone number normalization (08xxx → 628xxx)
- ✅ PII masking untuk logs (`maskPhoneNumber`, `maskEmail`)
- ✅ Cron job `kirim-tagihan` untuk blast tagihan bulanan
- ✅ API endpoint `/api/wa/kirim` dan `/api/wa/blast-wilayah`
- ✅ Token sudah dikonfigurasi di `.env.local`

**File terkait:**
- `lib/whatsapp.js` - Core WhatsApp functions
- `app/api/cron/kirim-tagihan/route.js` - Auto-send invoices
- `app/api/wa/kirim/route.js` - Manual send endpoint
- `app/api/wa/blast-wilayah/route.js` - Regional broadcast

### 3. Database & Migrations
- ✅ Schema lengkap (pelanggan, tagihan, pembayaran, payment_attempts)
- ✅ RLS policies sudah di-enable untuk semua tabel
- ✅ Migration files terorganisir di `supabase/migrations/`
- ✅ Full rebuild script tersedia di `COMPLETE-DATABASE-REBUILD.sql`

### 4. Cron Jobs (Vercel)
- ✅ 5 cron jobs terkonfigurasi di `vercel.json`:
  - `generate-tagihan` - Generate tagihan bulanan (17:00 WIB)
  - `generate-payment-links` - Generate Mayar links (17:05 WIB)
  - `kirim-tagihan` - Kirim notif WA tagihan (17:15 WIB)
  - `overdue` - Mark tagihan overdue (17:05 WIB)
  - `notif-tagihan` - Reminder notifikasi (17:10 WIB)
- ✅ CRON_SECRET protection

### 5. Security Implementation
- ✅ CSRF protection middleware
- ✅ Rate limiting
- ✅ Security headers
- ✅ Server-side auth (`requireAdmin`)
- ✅ Input validation dengan Zod schemas
- ✅ SQL injection prevention (parameterized queries via Supabase)
- ✅ XSS protection (React auto-escaping)

### 6. PWA Features
- ✅ Service Worker (`public/sw.js`)
- ✅ Manifest (`public/manifest.json`)
- ✅ Offline fallback page
- ✅ Web Push Notifications dengan VAPID keys
- ✅ Install PWA button component

---

## ⚠️ Yang Masih Kurang / Harus Diperbaiki

### 1. **CRITICAL: Cleanup Legacy Code**
**Issue:** Package `midtrans-client` masih terdaftar di `package.json` meski sudah tidak digunakan.

```json
"midtrans-client": "^1.4.3",  // ← HAPUS INI
```

**Impact:** Bundle size bloat, dependency security risk.

**Fix:**
```bash
npm uninstall midtrans-client
```

**File affected:**
- `package.json`
- UI filter di `app/dashboard/pembayaran/page.js` (option "Midtrans" bisa diganti "Mayar")

---

### 2. **CRITICAL: Environment Variables Validation**
**Issue:** Tidak ada startup check untuk memastikan semua env vars ada.

**Recommended:** Buat validation di `lib/env.js`:
```javascript
// ponytail: add when deploying to prevent runtime crashes
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MAYAR_API_KEY',
  'MAYAR_WEBHOOK_SECRET',
  'FONNTE_TOKEN',
  'CRON_SECRET',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY'
]
const missing = required.filter(k => !process.env[k])
if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`)
```

---

### 3. **MEDIUM: Error Monitoring & Logging**
**Issue:** Saat ini hanya ada `console.log/error`. Production perlu:
- Structured logging
- Error tracking (Sentry / Axiom / LogDrain)
- Webhook failure alerts

**Recommended:**
- Integrate Sentry atau Axiom untuk error tracking
- Add webhook retry mechanism dengan exponential backoff
- Log semua payment failures ke dedicated log stream

---

### 4. **MEDIUM: Database Backup Strategy**
**Issue:** Tidak ada automated backup policy.

**Recommended:**
- Supabase sudah auto-backup harian (Free tier: 7 hari, Pro: 30 hari)
- Setup point-in-time recovery (PITR) untuk Pro plan
- Export CSV backup mingguan untuk data kritis (pelanggan, pembayaran)

---

### 5. **MEDIUM: Rate Limiting for WhatsApp**
**Issue:** Fonnte API punya limit, tapi tidak ada queue system untuk handle bulk blast.

**Current implementation:**
- Batch size: 12 pesan
- Delay: 2.5 detik
- Max per cron: 20 pelanggan

**Risk:** Jika pelanggan >20, cron timeout (maxDuration: 60s).

**Recommended:**
- Implement queue system (Vercel Queue / Upstash Queue)
- Atau split cron runs by region
- Add retry mechanism untuk failed messages

---

### 6. **LOW: Documentation**
**Issue:** Tidak ada README.md atau deployment guide.

**Recommended:** Buat dokumentasi:
- Setup instructions
- Environment variables list
- Database migration commands
- Cron job schedule explanation
- API endpoints documentation

---

### 7. **LOW: Testing Coverage**
**Current state:**
- ✅ Unit tests untuk Mayar integration (`tests/mayar-*.test.mjs`)
- ❌ Integration tests untuk cron jobs
- ❌ E2E tests untuk payment flow
- ❌ Load testing untuk webhook handler

**Recommended:**
- Add integration tests untuk critical flows
- Load test webhook endpoint (100 req/s)

---

### 8. **LOW: Monitoring Dashboard**
**Issue:** Tidak ada visibility untuk:
- Payment success rate
- Webhook delivery status
- WhatsApp delivery rate
- Cron job execution logs

**Recommended:**
- Setup Vercel Analytics
- Add custom metrics dashboard (Grafana / Metabase)
- Webhook failure alerts via email/Telegram

---

## 📋 Pre-Deployment Checklist

### Critical (Must-Fix Before Deploy)
- [ ] Remove `midtrans-client` dari package.json
- [ ] Setup environment validation
- [ ] Test Mayar webhook dengan test payload
- [ ] Test WhatsApp blast dengan real phone numbers (sample kecil)
- [ ] Verify cron jobs jalan di Vercel (test deploy)
- [ ] Setup error monitoring (minimal Vercel Logs)

### Important (Recommended Before Deploy)
- [ ] Add README.md dengan deployment guide
- [ ] Setup Sentry/Axiom error tracking
- [ ] Configure database backup schedule
- [ ] Test payment flow end-to-end (development → production)
- [ ] Add health check endpoint (`/api/health`)

### Nice-to-Have (Post-Deploy)
- [ ] Add monitoring dashboard
- [ ] Implement retry queue untuk WhatsApp
- [ ] Add admin notification for failed payments
- [ ] Setup staging environment

---

## 🚀 Deployment Steps (Recommended Order)

### 1. Pre-Deploy
```bash
# 1. Cleanup dependencies
npm uninstall midtrans-client

# 2. Run tests
npm test

# 3. Build check
npm run build

# 4. Verify env vars
# Check all required env vars di Vercel dashboard
```

### 2. Supabase Setup
```bash
# 1. Run migrations di production database
# Via Supabase dashboard → SQL Editor:
# - Upload semua file dari supabase/migrations/
# - Execute in order by filename

# 2. Verify RLS policies aktif
# Check tabel pelanggan, tagihan, pembayaran, payment_attempts
```

### 3. Vercel Deploy
```bash
# 1. Connect repo ke Vercel
# 2. Set environment variables di Vercel dashboard
# 3. Deploy
vercel --prod

# 4. Test cron jobs
# Via Vercel dashboard → Cron → Manual trigger
```

### 4. Post-Deploy Validation
```bash
# 1. Test payment flow
curl https://your-domain.vercel.app/api/payment/create \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"tagihan_id": "test-uuid"}'

# 2. Test webhook
# Trigger test payment di Mayar dashboard
# Verify webhook hits your endpoint

# 3. Test WhatsApp
# Manual send via /api/wa/kirim

# 4. Monitor logs
# Vercel dashboard → Logs
```

---

## 💡 Kesimpulan

**Status: HAMPIR SIAP** (85% ready)

### ✅ Kekuatan:
1. Integrasi Mayar sudah production-ready dengan security best practices
2. WhatsApp integration lengkap dengan batching & rate limiting
3. Database schema solid dengan RLS policies
4. Cron jobs terkonfigurasi lengkap
5. Security implementation komprehensif

### ⚠️ Yang Harus Diperbaiki:
1. **Cleanup:** Hapus dependency `midtrans-client`
2. **Validation:** Environment variables check di startup
3. **Monitoring:** Error tracking & alerting system

### 🎯 Estimasi Waktu:
- **Critical fixes:** 2-4 jam
- **Important items:** 1-2 hari
- **Nice-to-have:** 1 minggu post-deploy

**Rekomendasi:** Selesaikan critical fixes dulu, lalu soft-launch dengan monitoring ketat selama 1-2 minggu sebelum full production rollout.
