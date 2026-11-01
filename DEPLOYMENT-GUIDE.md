# 🚀 DEPLOYMENT & TESTING GUIDE

## Beatnet Billing System - Production Deployment Checklist

**Last Updated:** November 1, 2026  
**Version:** 1.0.0 - Security Hardened

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Environment Variables Setup

#### Required Environment Variables (Production)

Copy these to your Vercel/hosting dashboard:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cron Job Security
CRON_SECRET=GENERATE_32_CHAR_RANDOM_SECRET_HERE

# WhatsApp (Fonnte)
FONNTE_TOKEN=YOUR_FONNTE_API_TOKEN

# Application URL
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY

# Mayar Payment Gateway
MAYAR_WEBHOOK_SECRET=YOUR_MAYAR_WEBHOOK_SECRET
MAYAR_API_KEY=YOUR_MAYAR_API_KEY
MAYAR_BASE_URL=https://api.mayar.io/hl/v2

# Bank Account Info
BANK_ACCOUNT_NUMBER=60010685562
BANK_ACCOUNT_NAME=Sultan Pasha
DANA_ACCOUNT=08986172767

# Node Environment
NODE_ENV=production
```

#### Generate Secure Secrets

```bash
# Generate CRON_SECRET (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generator (be careful with security):
# https://www.random.org/strings/
```

---

### 2. Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- 1. Enable RLS on missing tables
\i supabase/migrations/20261101_enable_missing_rls.sql

-- 2. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('paket', 'pengeluaran', 'wilayah', 'log_notifikasi');

-- Expected: All should show rowsecurity = true

-- 3. Verify existing RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public';

-- 4. Check stored procedures exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'generate_tagihan_harian_skema_b',
    'process_gateway_payment',
    'mark_overdue_tagihan'
);
```

---

### 3. Git Commit & Push

```bash
# Check status
git status

# Stage all security fixes
git add .

# Commit with descriptive message
git commit -m "Security hardening: Fix 8 critical vulnerabilities

- Fix cron authentication bypass (CRITICAL-1)
- Secure WhatsApp relay endpoints (CRITICAL-2)
- Prevent price tampering (CRITICAL-3)
- Secure bulk operations (CRITICAL-4)
- Activate middleware (CRITICAL-5)
- Add webhook replay protection (CRITICAL-7)
- Enable missing RLS policies (CRITICAL-8)
- Add rate limiting, CSRF protection, input validation
- Implement security headers
- Add next.config.js with security headers"

# Push to main branch
git push origin main
```

---

### 4. Deploy to Vercel

#### Option A: Via Git Integration (Recommended)
1. Push to GitHub/GitLab
2. Vercel auto-deploys from main branch
3. Monitor deployment logs

#### Option B: Manual Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

---

### 5. Configure Vercel Settings

#### A. Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from `.env.example`
3. Select "Production" environment
4. Save changes

#### B. Cron Jobs Setup
1. Create `vercel.json` in project root (if not exists):

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-tagihan",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/generate-payment-links",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/kirim-tagihan",
      "schedule": "30 9 * * *"
    },
    {
      "path": "/api/cron/overdue",
      "schedule": "5 0 * * *"
    },
    {
      "path": "/api/cron/notif-tagihan",
      "schedule": "10 0 * * *"
    }
  ]
}
```

2. Add `Authorization` header to cron requests:
   - Go to Vercel Dashboard → Settings → Cron Jobs
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 🧪 TESTING GUIDE

### 1. Security Tests (Critical)

#### Test 1: Cron Authentication
```bash
# Should return 401 Unauthorized
curl -X GET https://your-domain.com/api/cron/generate-tagihan

# Should return 401 (invalid token)
curl -X GET https://your-domain.com/api/cron/generate-tagihan \
  -H "Authorization: Bearer wrong-token"

# Should work (with correct token)
curl -X GET https://your-domain.com/api/cron/generate-tagihan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected Results:**
- ✅ First two should return 401
- ✅ Third should return 200 with invoice data

---

#### Test 2: WhatsApp Relay Protection
```bash
# Should return 401/403 (no auth)
curl -X POST https://your-domain.com/api/wa/kirim \
  -H "Content-Type: application/json" \
  -d '{"nomor":"628123456789","pesan":"test spam"}'
```

**Expected Result:**
- ✅ Returns 401 or 403 "Forbidden: Admin access required"

---

#### Test 3: Middleware Protection
```bash
# Should redirect to /login
curl -I https://your-domain.com/dashboard

# Should return HTML with redirect or 401 JSON
```

**Expected Result:**
- ✅ Status 302 (redirect) or 401 (API format)

---

#### Test 4: Payment Creation (Price Tampering)

Manual test via browser DevTools:

1. Login to dashboard
2. Open DevTools → Network tab
3. Create a payment for an invoice
4. Find the POST request to `/api/payment/create`
5. Copy as cURL
6. Modify the request body to add `"jumlah": 1`
7. Resend request

**Expected Result:**
- ✅ Payment link uses amount from database, not from request
- ✅ Amount = (invoice.jumlah_tagihan + 240)

---

#### Test 5: Webhook Replay Protection
```bash
# Send webhook with old timestamp (should fail)
curl -X POST https://your-domain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-timestamp: 2026-10-01T00:00:00Z" \
  -d '{"event":"payment.paid","id":"test123"}'
```

**Expected Result:**
- ✅ Returns 401 "Event timestamp outside allowed window"

---

### 2. Functional Tests

#### Test 6: Complete Payment Flow
```bash
# 1. Generate tagihan for today's billing cycle customers
curl -X GET https://your-domain.com/api/cron/generate-tagihan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 2. Generate payment links
curl -X GET https://your-domain.com/api/cron/generate-payment-links \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 3. Send WhatsApp notifications
curl -X GET https://your-domain.com/api/cron/kirim-tagihan \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 4. Check results in Supabase
# SELECT * FROM tagihan WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

#### Test 7: Manual Cash Payment
1. Login to dashboard
2. Go to Tagihan page
3. Find an UNPAID invoice
4. Click "Terima Tunai"
5. Confirm payment
6. Verify status changes to "lunas"
7. Check `pembayaran` table in Supabase

**Expected Result:**
- ✅ Status updates to "lunas"
- ✅ Record created in `pembayaran` table
- ✅ `metode_pembayaran = 'cash'`

---

#### Test 8: Bulk Cancel Invoices
1. Login to dashboard
2. Go to Tagihan page
3. Select multiple UNPAID invoices
4. Choose "Batalkan" action
5. Enter reason (required)
6. Confirm

**Expected Result:**
- ✅ Requires reason (min 5 chars)
- ✅ Status updates to "dibatalkan"
- ✅ Catatan field updated with reason
- ✅ Original records preserved (no hard delete)

---

#### Test 9: Customer Coordinate Input
1. Login to dashboard
2. Go to Pelanggan page
3. Add/Edit customer
4. Find Latitude & Longitude fields
5. Click "Gunakan Lokasi Saat Ini" (if available)
6. Or manually enter coordinates
7. Save

**Expected Result:**
- ✅ Coordinates save to database
- ✅ Can view on map (if map feature implemented)

---

### 3. Performance Tests

#### Test 10: Rate Limiting
```bash
# Send 10 rapid requests to payment create
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/payment/create \
    -H "Content-Type: application/json" \
    -H "Cookie: your-session-cookie" \
    -d '{"tagihan_id":"uuid-here"}' &
done
wait
```

**Expected Result:**
- ✅ First 10 requests succeed
- ✅ 11th+ returns 429 "Too many requests"
- ✅ Retry-After header present

---

### 4. Browser Tests

#### Test 11: Security Headers
```bash
# Check security headers
curl -I https://your-domain.com

# Should include:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Strict-Transport-Security: max-age=...
# - Referrer-Policy: strict-origin-when-cross-origin
# - Permissions-Policy: camera=(), microphone=()...
```

---

#### Test 12: Dashboard Functionality
1. **Login Page**
   - [ ] Login form displays
   - [ ] Error messages for wrong credentials
   - [ ] Redirects to dashboard on success

2. **Dashboard Home**
   - [ ] All stat cards load
   - [ ] Charts render without errors
   - [ ] Recent invoices table displays
   - [ ] Recent customers table displays

3. **Pelanggan Management**
   - [ ] Can create new customer
   - [ ] Can edit existing customer
   - [ ] Can view customer details
   - [ ] Can change status (aktif/isolir/nonaktif)
   - [ ] Phone number normalizes to 628xxx format

4. **Tagihan Management**
   - [ ] Can view all invoices
   - [ ] Can filter by status/month
   - [ ] Can create manual invoice
   - [ ] Can mark as paid (cash)
   - [ ] Payment link visible for UNPAID invoices

5. **Laporan Page**
   - [ ] Monthly revenue chart displays
   - [ ] Can export to Excel
   - [ ] Date filters work

---

## 📊 MONITORING SETUP

### 1. Vercel Analytics
1. Go to Vercel Dashboard → Your Project → Analytics
2. Enable Web Analytics
3. Monitor page views, errors, performance

### 2. Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Monitor:
   - API requests
   - Database queries
   - Auth events
   - Edge functions

### 3. Error Tracking (Optional but Recommended)

#### Setup Sentry
```bash
npm install @sentry/nextjs

# Follow wizard
npx @sentry/wizard@latest -i nextjs
```

---

## 🚨 POST-DEPLOYMENT VERIFICATION

### Critical Checks (Must Pass)

- [ ] **Environment Variables:** All secrets configured in Vercel
- [ ] **Database RLS:** All tables have RLS enabled
- [ ] **Cron Jobs:** Scheduled and running with auth headers
- [ ] **Webhook URL:** Updated in Mayar dashboard
- [ ] **Fonnte Connection:** WhatsApp device connected
- [ ] **HTTPS:** Site accessible via HTTPS only
- [ ] **Security Headers:** Present in response headers
- [ ] **Login Works:** Can login to dashboard
- [ ] **Payment Flow:** Can create payment link
- [ ] **WhatsApp Send:** Can send test message (auth required)

### Performance Checks

- [ ] **Page Load Time:** < 3 seconds for dashboard
- [ ] **API Response Time:** < 500ms for most endpoints
- [ ] **Database Queries:** No N+1 issues (check Supabase logs)
- [ ] **CDN:** Static assets served from CDN

---

## 🆘 TROUBLESHOOTING

### Issue: Cron Jobs Not Running

**Solution:**
1. Check Vercel Dashboard → Deployments → Functions
2. Verify cron schedule syntax
3. Check Authorization header is set
4. View cron execution logs

### Issue: Webhook Not Received

**Solution:**
1. Verify webhook URL in Mayar dashboard
2. Check Vercel function logs for errors
3. Test webhook signature with dummy payload
4. Ensure /api/payment/webhook is public (not in middleware matcher)

### Issue: WhatsApp Not Sending

**Solution:**
1. Check Fonnte device status (connected?)
2. Verify FONNTE_TOKEN in environment variables
3. Check log_notifikasi table for error messages
4. Test direct API call to Fonnte

### Issue: RLS Blocking Queries

**Solution:**
1. Check if user is authenticated
2. Verify RLS policies in Supabase
3. Use service role key for admin operations
4. Check Supabase logs for policy violations

---

## 📞 SUPPORT CONTACTS

- **Supabase Support:** support@supabase.io
- **Vercel Support:** support@vercel.com
- **Mayar Support:** support@mayar.id
- **Fonnte Support:** cs@fonnte.com

---

## 📝 ROLLBACK PROCEDURE

If critical issues found after deployment:

```bash
# 1. Revert to previous deployment in Vercel
# Go to Vercel Dashboard → Deployments → Select previous → Promote to Production

# 2. Or rollback via CLI
vercel rollback

# 3. Or git revert
git revert HEAD
git push origin main
```

---

**Deployment completed? Run through this checklist and mark items as done!**

✅ **Ready for Production:** All critical checks passed  
⚠️ **Needs Attention:** Some non-critical items pending  
❌ **Not Ready:** Critical issues found

---

Last Updated: November 1, 2026
