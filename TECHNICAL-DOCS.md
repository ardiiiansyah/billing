# 📚 BEATNET BILLING SYSTEM - TECHNICAL DOCUMENTATION

## Complete Developer & Operations Guide

**Version:** 1.0.0 - Security Hardened  
**Last Updated:** November 1, 2026  
**Status:** Production Ready (with monitoring)

---

## 📑 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Security Implementation](#security-implementation)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Deployment Guide](#deployment-guide)
7. [Operations & Monitoring](#operations--monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Development Guide](#development-guide)

---

## 🏗️ SYSTEM OVERVIEW

### What is Beatnet?

Beatnet is an automated billing and CRM system designed for RT/RW (neighborhood) WiFi internet providers in Indonesia. It manages ~140 customers with:

- **Automated daily billing** (Anniversary-based - Skema B)
- **Payment gateway integration** (Mayar.id)
- **WhatsApp notifications** (Fonnte)
- **Real-time payment reconciliation** via webhooks
- **Admin dashboard** for operations management

### Key Features

✅ **Automated Billing Cycle**
- Daily billing based on customer activation date
- 3-day grace period before overdue status
- Automatic payment link generation

✅ **Multi-Payment Methods**
- QRIS (instant)
- E-Wallets (DANA, OVO, ShopeePay, GoPay)
- Virtual Account (Bank Transfer)
- Manual cash payments

✅ **Smart Fee Splitting**
- 70% gateway fees absorbed by admin
- 30% charged to customer (Rp 240)
- Transparent pricing

✅ **Security-First Design**
- Authentication on all admin endpoints
- CSRF protection for state changes
- Rate limiting per endpoint
- Webhook signature verification
- Row-Level Security (RLS) in database

---

## 🏛️ ARCHITECTURE

### Technology Stack

```
┌─────────────────────────────────────────────┐
│           Frontend (Next.js 16)             │
│  React 19 + TailwindCSS 4 + Lucide Icons   │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│         Backend (Next.js API Routes)        │
│  Serverless Functions + Server Actions      │
└─────────────────────┬───────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐      ┌─────▼─────┐    ┌─────▼─────┐
│Supabase│      │   Mayar   │    │  Fonnte   │
│Postgres│      │  Payment  │    │ WhatsApp  │
│  + RLS │      │  Gateway  │    │    API    │
└────────┘      └───────────┘    └───────────┘
```

### System Components

#### 1. **Frontend Dashboard** (`app/dashboard/*`)
- React 19 with App Router
- Client-side data fetching via Supabase client
- Real-time updates using Supabase subscriptions
- Responsive design (mobile-first)

#### 2. **API Layer** (`app/api/*`)
- RESTful API routes
- Server-side authentication
- Rate limiting & input validation
- Webhook handlers

#### 3. **Database** (Supabase PostgreSQL)
- Row-Level Security (RLS) enabled
- Stored procedures for complex operations
- Audit trail for financial transactions
- Backup & point-in-time recovery

#### 4. **Background Jobs** (Vercel Cron)
- Daily billing generation (08:00 WIB)
- Payment link creation (09:00 WIB)
- WhatsApp notifications (09:30 WIB)
- Overdue status updates (00:05 WIB)
- Reminder notifications (00:10 WIB)

#### 5. **External Services**
- **Mayar**: Payment processing & checkout
- **Fonnte**: WhatsApp message delivery
- **Vercel**: Hosting & serverless functions
- **Supabase**: Database & authentication

---

## 🔒 SECURITY IMPLEMENTATION

### Critical Security Fixes Applied

| ID | Vulnerability | Severity | Status | Fix Applied |
|----|---------------|----------|--------|-------------|
| CRITICAL-1 | Cron authentication bypass | Critical | ✅ Fixed | Strict token validation |
| CRITICAL-2 | Open WhatsApp relay | High | ✅ Fixed | Required admin auth |
| CRITICAL-3 | Price tampering | Critical | ✅ Fixed | Server-side amount fetch |
| CRITICAL-4 | Bulk operations unprotected | Critical | ✅ Fixed | Admin auth + soft delete |
| CRITICAL-5 | Middleware inactive | High | ✅ Fixed | Renamed proxy.js → middleware.js |
| CRITICAL-6 | Secrets in repository | Critical | ✅ Fixed | .env.local in .gitignore |
| CRITICAL-7 | No webhook replay protection | High | ✅ Fixed | 5-minute timestamp window |
| CRITICAL-8 | Missing RLS policies | High | ✅ Fixed | All tables protected |

### Security Layers

#### Layer 1: Network Security
- HTTPS enforced (HSTS)
- Security headers (CSP, X-Frame-Options)
- CORS restrictions
- Rate limiting per IP

#### Layer 2: Authentication & Authorization
```javascript
// Every protected route
const { user } = await requireAdmin(request)
if (!user) return 401

// Role-based access control
if (user.role !== 'admin') return 403
```

#### Layer 3: Input Validation
```javascript
// Using Zod schemas
const { success, data, errors } = validateBody(body, createCustomerSchema)
if (!success) return validationErrorResponse(errors)
```

#### Layer 4: Database Security
- Row-Level Security (RLS) on all tables
- Parameterized queries (no SQL injection)
- Service role key only on server
- Audit logging for financial operations

#### Layer 5: Application Security
- CSRF tokens for state-changing operations
- Webhook signature verification (HMAC-SHA256)
- Replay attack prevention (timestamp window)
- No secrets in logs or error messages

### Rate Limiting Configuration

```javascript
// Applied per endpoint
const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },        // 5/15min
  ADMIN_MUTATION: { limit: 30, windowMs: 60 * 1000 },   // 30/min
  ADMIN_READ: { limit: 120, windowMs: 60 * 1000 },      // 120/min
  PAYMENT_CREATE: { limit: 10, windowMs: 60 * 1000 },   // 10/min
  WHATSAPP_SEND: { limit: 30, windowMs: 60 * 1000 },    // 30/min
  WEBHOOK: { limit: 120, windowMs: 60 * 1000 },         // 120/min
  EXPORT: { limit: 3, windowMs: 60 * 60 * 1000 },       // 3/hour
}
```

---

## 📡 API REFERENCE

### Authentication

All admin endpoints require authentication via Supabase session cookie.

```javascript
// Client-side (browser)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'password123'
})
```

### Cron Endpoints (Server-to-Server)

All cron endpoints require `Authorization: Bearer <CRON_SECRET>` header.

#### `GET /api/cron/generate-tagihan`
Generates daily invoices for customers whose billing cycle date is today.

**Authentication:** Required (Bearer token)  
**Schedule:** Daily at 08:00 WIB  
**Parameters:** None (uses current WIB date)

**Response:**
```json
{
  "success": true,
  "tanggal": 15,
  "bulan": 11,
  "tahun": 2026,
  "jumlah_generated": 4
}
```

---

#### `GET /api/cron/generate-payment-links`
Creates Mayar payment links for invoices without payment URLs.

**Authentication:** Required (Bearer token)  
**Schedule:** Daily at 09:00 WIB  
**Limit:** 20 invoices per run

**Response:**
```json
{
  "success": true,
  "scanned": 12,
  "created": 12,
  "failed": 0
}
```

---

#### `GET /api/cron/kirim-tagihan`
Sends WhatsApp notifications for new invoices with payment links.

**Authentication:** Required (Bearer token)  
**Schedule:** Daily at 09:30 WIB  
**Batching:** 10 messages per batch with 750ms delay

**Response:**
```json
{
  "success": true,
  "bulan": 11,
  "tahun": 2026,
  "total_tagihan": 15,
  "antrean_diproses": 12,
  "wa_terkirim": 11,
  "wa_gagal": 1
}
```

---

#### `GET /api/cron/overdue`
Marks unpaid invoices past due date as overdue.

**Authentication:** Required (Bearer token)  
**Schedule:** Daily at 00:05 WIB

**Response:**
```json
{
  "success": true,
  "business_date": "2026-11-01",
  "updated": 3
}
```

---

#### `GET /api/cron/notif-tagihan`
Sends reminder notifications for invoices due today or 3 days overdue.

**Authentication:** Required (Bearer token)  
**Schedule:** Daily at 00:10 WIB

**Response:**
```json
{
  "sukses": true,
  "total_antrean": 8,
  "berhasil": 7,
  "gagal": 1
}
```

---

### Payment Endpoints

#### `POST /api/payment/create`
Creates a new payment link for an unpaid invoice.

**Authentication:** Required (Admin session)  
**Rate Limit:** 10 requests/minute

**Request:**
```json
{
  "tagihan_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "sukses": true,
  "payment_url": "https://checkout.mayar.io/abc123",
  "order_id": "mayar-order-123",
  "reused": false
}
```

**Errors:**
- `400` - Invalid tagihan_id format
- `401` - Unauthorized (not logged in)
- `404` - Invoice not found
- `409` - Invoice already paid or active link exists

---

#### `POST /api/payment/webhook`
Receives payment notifications from Mayar.

**Authentication:** Public (signature verified)  
**Rate Limit:** 120 requests/minute per IP

**Request Headers:**
```
Content-Type: application/json
x-mayar-signature: abc123def456...
x-timestamp: 2026-11-01T04:27:55.792Z (optional)
```

**Request Body:**
```json
{
  "event": "payment.paid",
  "event_id": "evt_unique_123",
  "reference": "mayar-order-123",
  "amount": 150240,
  "payment_method": "qris",
  "paid_at": "2026-11-01T04:27:55.792Z"
}
```

**Response:**
```json
{
  "sukses": true,
  "already_processed": false
}
```

**Security:**
- HMAC-SHA256 signature verification
- Replay protection (5-minute window)
- Idempotency via event_id
- Amount & reference validation

---

### WhatsApp Endpoints

#### `POST /api/wa/kirim`
Sends a WhatsApp message to a single number.

**Authentication:** Required (Admin session)  
**Rate Limit:** 30 requests/minute

**Request:**
```json
{
  "nomor": "628123456789",
  "pesan": "Test message",
  "mediaUrl": "https://example.com/image.jpg" // optional
}
```

**Response:**
```json
{
  "sukses": true,
  "data": {
    "id": "fonnte-msg-id",
    "status": "sent"
  }
}
```

---

#### `POST /api/wa/blast-wilayah`
Sends a broadcast message to all active customers in a region.

**Authentication:** Required (Admin session)  
**Rate Limit:** 30 requests/minute

**Request:**
```json
{
  "wilayah_id": "550e8400-e29b-41d4-a716-446655440000",
  "pesan": "Informasi gangguan jaringan..."
}
```

---

### Bulk Operations

#### `POST /api/bulk/pelanggan`
Performs bulk actions on customers.

**Authentication:** Required (Admin session)  
**Rate Limit:** 30 requests/minute

**Actions:**
- `update_status` - Change customer status
- `generate_tagihan` - Create invoices for selected customers

**Request (update_status):**
```json
{
  "action": "update_status",
  "ids": ["uuid1", "uuid2", "uuid3"],
  "payload": {
    "status": "isolir"
  }
}
```

**Request (generate_tagihan):**
```json
{
  "action": "generate_tagihan",
  "ids": ["uuid1", "uuid2"],
  "payload": {
    "bulan": 11,
    "tahun": 2026
  }
}
```

---

#### `POST /api/bulk/tagihan`
Performs bulk actions on invoices.

**Authentication:** Required (Admin session)  
**Rate Limit:** 30 requests/minute

**Actions:**
- `pay_cash` - Mark invoices as paid (cash)
- `cancel` - Cancel unpaid invoices (soft delete)

**Request (pay_cash):**
```json
{
  "action": "pay_cash",
  "ids": ["uuid1", "uuid2"]
}
```

**Request (cancel):**
```json
{
  "action": "cancel",
  "ids": ["uuid1", "uuid2"],
  "reason": "Customer requested cancellation"
}
```

**Security:** `cancel` requires reason (min 5 chars) for audit trail.

---

## 🗄️ DATABASE SCHEMA

### Core Tables

#### `pelanggan` (Customers)
```sql
id              UUID PRIMARY KEY
kode_pelanggan  VARCHAR(20) UNIQUE
nama            VARCHAR(150) NOT NULL
no_wa           VARCHAR(20) NOT NULL
alamat          TEXT NOT NULL
rt              VARCHAR(10)
rw              VARCHAR(10)
latitude        DECIMAL (for mapping)
longitude       DECIMAL (for mapping)
paket_id        UUID → paket(id)
wilayah_id      UUID → wilayah(id)
tanggal_jatuh_tempo  INT (1-28)
status          VARCHAR(20) DEFAULT 'aktif'
created_at      TIMESTAMPTZ
```

**Indexes:**
- Primary: `id`
- Unique: `kode_pelanggan`
- Index: `status`, `paket_id`, `wilayah_id`

**RLS:** Enabled (authenticated users only)

---

#### `tagihan` (Invoices)
```sql
id                   UUID PRIMARY KEY
pelanggan_id         UUID → pelanggan(id)
bulan                INT (1-12)
tahun                INT (2024+)
jumlah_tagihan       NUMERIC(12,2)
tanggal_jatuh_tempo  DATE
status_pembayaran    VARCHAR(20) DEFAULT 'belum_bayar'
payment_url          TEXT
gateway_order_id     TEXT
gateway_provider     VARCHAR(50)
customer_fee         NUMERIC(12,2)
catatan              TEXT
created_at           TIMESTAMPTZ

UNIQUE(pelanggan_id, bulan, tahun)
```

**Status Values:**
- `belum_bayar` / `UNPAID` - Not paid
- `lunas` / `PAID` - Paid
- `OVERDUE` - Past due date
- `dibatalkan` - Cancelled

**RLS:** Enabled (authenticated users only)

---

#### `payment_attempts` (Payment Tracking)
```sql
id                  UUID PRIMARY KEY
tagihan_id          UUID → tagihan(id)
provider            VARCHAR(50) DEFAULT 'mayar'
gateway_order_id    TEXT NOT NULL
payment_url         TEXT
amount              NUMERIC(12,2)
customer_fee        NUMERIC(12,2)
status              VARCHAR(50) DEFAULT 'PENDING'
settlement_time     TIMESTAMPTZ
payment_metadata    JSONB
created_at          TIMESTAMPTZ
```

**Status Values:**
- `PENDING` - Awaiting payment
- `PAID` - Successfully paid
- `EXPIRED` - Payment link expired
- `FAILED` - Payment failed

**RLS:** Enabled

---

#### `payment_events` (Webhook Deduplication)
```sql
event_id            TEXT PRIMARY KEY
tagihan_id          UUID → tagihan(id)
gateway_order_id    TEXT
provider            TEXT DEFAULT 'mayar'
payload             JSONB
status              TEXT DEFAULT 'RECEIVED'
rejection_reason    TEXT
received_at         TIMESTAMPTZ

UNIQUE(provider, event_id)
```

**Purpose:** Prevents duplicate webhook processing

**RLS:** Enabled

---

### Stored Procedures

#### `generate_tagihan_harian_skema_b(p_tanggal, p_bulan, p_tahun)`
Creates invoices for customers whose billing cycle day matches the provided date.

**Returns:** Number of invoices generated

**Logic:**
1. Select active customers where `tanggal_jatuh_tempo = p_tanggal`
2. Calculate due date = current date + 3 days
3. Insert invoice with `status_pembayaran = 'belum_bayar'`
4. Skip if invoice already exists (unique constraint)

---

#### `process_gateway_payment(...)`
Atomically processes a verified payment webhook.

**Parameters:**
- `p_tagihan_id` - Invoice UUID
- `p_event_id` - Webhook event ID (for idempotency)
- `p_reference` - Gateway order reference
- `p_amount` - Payment amount
- `p_method` - Payment method (qris, va_bca, etc)
- `p_paid_at` - Payment timestamp

**Returns:** `{already_processed: boolean, tagihan_id: uuid}`

**Transaction:**
1. Insert into `payment_events` (ON CONFLICT DO NOTHING)
2. If duplicate event_id, return `already_processed: true`
3. Lock invoice row (FOR UPDATE)
4. Verify amount matches invoice
5. Update payment_attempts status = 'PAID'
6. Update tagihan status_pembayaran = 'lunas'
7. Commit

**Security:** `SECURITY DEFINER` with execute permission for service_role only

---

#### `mark_overdue_tagihan(p_business_date)`
Updates unpaid invoices past due date to overdue status.

**Parameters:**
- `p_business_date` - Current date in YYYY-MM-DD format

**Returns:** Number of invoices updated

**Logic:**
```sql
UPDATE tagihan
SET status_pembayaran = 'OVERDUE'
WHERE status_pembayaran IN ('belum_bayar', 'UNPAID')
  AND tanggal_jatuh_tempo < p_business_date
```

---

## 🚀 DEPLOYMENT GUIDE

See `DEPLOYMENT-GUIDE.md` for complete deployment instructions.

**Quick Start:**
1. Set environment variables in Vercel
2. Run RLS migration in Supabase
3. Deploy via `git push` or Vercel CLI
4. Configure cron jobs with auth headers
5. Update webhook URL in Mayar dashboard
6. Run security tests

---

## 📊 OPERATIONS & MONITORING

### Health Checks

#### System Health Endpoints
```bash
# Check API is responding
curl https://your-domain.com/api/payment/webhook

# Check Supabase connection (requires auth)
curl https://your-domain.com/api/payment/status \
  -H "Cookie: supabase-auth-token=..."
```

#### Database Health
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Monitoring Dashboards

#### 1. Vercel Dashboard
- Function invocations
- Error rate
- Response times
- Bandwidth usage

#### 2. Supabase Dashboard
- Database CPU & memory
- Connection pool usage
- API requests
- Storage size

#### 3. Custom Metrics (via logs)
```javascript
// Log important events
console.log('[PAYMENT] Invoice paid', {
  tagihan_id,
  amount,
  method,
  timestamp: new Date().toISOString(),
})
```

### Alerts Setup

**Critical Alerts:**
- Cron job failures (no invoices generated)
- Webhook signature mismatches (spike)
- Payment reconciliation failures
- Database connection errors
- Fonnte disconnection

**Recommended Tools:**
- **Sentry** - Error tracking
- **LogDNA** / **Datadog** - Log aggregation
- **Uptime Robot** - Uptime monitoring
- **PagerDuty** - On-call alerts

---

## 🔧 TROUBLESHOOTING

### Common Issues

#### Issue 1: Cron Jobs Not Running

**Symptoms:**
- No new invoices generated
- WhatsApp notifications not sent

**Diagnosis:**
```bash
# Check Vercel cron logs
vercel logs --function /api/cron/generate-tagihan

# Check if cron is scheduled
cat vercel.json | grep -A 10 "crons"
```

**Solutions:**
1. Verify `vercel.json` exists and has cron config
2. Check Authorization header is set in Vercel dashboard
3. Verify CRON_SECRET matches in both places
4. Check function timeout limits (maxDuration)

---

#### Issue 2: Webhook Not Received

**Symptoms:**
- Customer paid but invoice still showing unpaid
- No payment_events record

**Diagnosis:**
```bash
# Check webhook endpoint is accessible
curl -X POST https://your-domain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":true}'

# Check Supabase logs for webhook errors
```

**Solutions:**
1. Verify webhook URL in Mayar dashboard matches deployment
2. Check MAYAR_WEBHOOK_SECRET is correct
3. Ensure /api/payment/webhook is NOT in middleware matcher (must be public)
4. Check Vercel function logs for errors
5. Test signature verification locally

---

#### Issue 3: WhatsApp Not Sending

**Symptoms:**
- Messages not delivered
- log_notifikasi shows 'failed' status

**Diagnosis:**
```sql
-- Check failed messages
SELECT * FROM log_notifikasi 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Solutions:**
1. Check Fonnte device status (connected?)
2. Verify FONNTE_TOKEN in environment variables
3. Check quota hasn't exceeded (Free tier limits)
4. Verify phone numbers are in correct format (628xxx)
5. Test direct API call to Fonnte

---

#### Issue 4: RLS Blocking Queries

**Symptoms:**
- Dashboard shows empty data
- "permission denied for table" errors

**Diagnosis:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check if user is authenticated
SELECT auth.uid();
```

**Solutions:**
1. Ensure user is logged in
2. Verify RLS policies allow authenticated users
3. Check if using correct Supabase client (server vs browser)
4. Use service_role key for admin operations (server-side only)

---

## 👩‍💻 DEVELOPMENT GUIDE

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/billing.git
cd billing

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Fill in environment variables
# Edit .env.local with your Supabase/Mayar/Fonnte credentials

# 5. Run development server
npm run dev

# 6. Open browser
open http://localhost:3000
```

### Project Structure

```
billing/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── bulk/         # Bulk operations
│   │   ├── cron/         # Scheduled jobs
│   │   ├── payment/      # Payment endpoints
│   │   ├── push/         # Push notifications
│   │   └── wa/           # WhatsApp messaging
│   ├── bayar/[id]/       # Public payment page
│   ├── dashboard/        # Admin dashboard
│   ├── login/            # Login page
│   ├── layout.js         # Root layout
│   └── globals.css       # Global styles
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...
│
├── lib/                   # Utility libraries
│   ├── csrf-protection.js    # CSRF utilities
│   ├── mayar.js              # Mayar API adapter
│   ├── payments.js           # Payment business logic
│   ├── rate-limiter.js       # Rate limiting
│   ├── security-headers.js   # Security headers
│   ├── server-auth.js        # Authentication helpers
│   ├── supabaseAdmin.js      # Supabase admin client
│   ├── supabaseClient.js     # Supabase browser client
│   ├── validation-schemas.js # Zod schemas
│   ├── whatsapp.js           # WhatsApp utilities
│   └── utils.js              # General utilities
│
├── supabase/              # Database files
│   ├── migrations/       # SQL migrations
│   └── schema.sql        # Initial schema
│
├── tests/                 # Test scripts
│   ├── api-tests.js      # Node.js API tests
│   ├── security-test.sh  # Bash security tests
│   └── README.md         # Test documentation
│
├── public/                # Static assets
│   ├── icon-512.png
│   ├── manifest.json
│   └── sw.js             # Service worker
│
├── .env.example           # Environment template
├── .env.local            # Local environment (gitignored)
├── .gitignore
├── middleware.js          # Next.js middleware
├── next.config.js         # Next.js configuration
├── package.json
├── tailwind.config.js
├── jsconfig.json
├── vercel.json            # Vercel configuration
│
└── Documentation/
    ├── DEPLOYMENT-GUIDE.md
    ├── SECURITY-STANDARD.md
    ├── CODING-STANDARDS.md
    ├── PRD.md
    └── TECHNICAL-DOCS.md (this file)
```

### Adding New Features

#### 1. Add New API Endpoint

```javascript
// app/api/new-feature/route.js
import { requireAdmin } from '@/lib/server-auth'
import { applyRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limiter'
import { validateBody, yourSchema, validationErrorResponse } from '@/lib/validation-schemas'

export async function POST(request) {
  // 1. Authentication
  const { user, response: authResponse } = await requireAdmin(request)
  if (authResponse) return authResponse
  
  // 2. Rate limiting
  const rateLimitResult = await applyRateLimit(request, 'new-feature', RATE_LIMITS.ADMIN_MUTATION.limit, RATE_LIMITS.ADMIN_MUTATION.windowMs)
  if (!rateLimitResult.success) return rateLimitResponse(rateLimitResult)
  
  // 3. Input validation
  const body = await request.json()
  const validation = validateBody(body, yourSchema)
  if (!validation.success) return validationErrorResponse(validation.errors)
  
  // 4. Business logic
  // ...
  
  // 5. Response
  return Response.json({ success: true, data: result })
}
```

#### 2. Add New Database Table

```sql
-- supabase/migrations/YYYYMMDD_description.sql

CREATE TABLE IF NOT EXISTS public.new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Admin full access to new_table" 
ON public.new_table
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create indexes if needed
CREATE INDEX idx_new_table_name ON public.new_table(name);
```

#### 3. Add New Validation Schema

```javascript
// lib/validation-schemas.js

export const newFeatureSchema = z.object({
  field1: z.string().min(3, 'Field1 minimal 3 karakter'),
  field2: z.number().int().positive(),
  field3: z.enum(['option1', 'option2']).optional(),
})
```

### Testing Locally

```bash
# Run security tests
./tests/security-test.sh

# Run API tests
node tests/api-tests.js

# Run with custom base URL
BASE_URL=http://localhost:3000 node tests/api-tests.js
```

### Code Style Guide

See `CODING-STANDARDS.md` for complete style guide.

**Quick Rules:**
- Use `camelCase` for variables and functions
- Use `PascalCase` for components
- Use `kebab-case` for file names
- Always use `async/await`, never `.then()`
- Add JSDoc comments for complex functions
- Validate all inputs
- Handle errors gracefully
- No `console.log` in production code (use proper logging)

---

## 📞 SUPPORT & RESOURCES

### External Documentation

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Mayar API Docs](https://docs.mayar.id)
- [Fonnte API Docs](https://docs.fonnte.com)
- [Vercel Docs](https://vercel.com/docs)

### Community

- **GitHub Issues:** Report bugs and feature requests
- **Discussions:** Ask questions and share ideas
- **Slack/Discord:** Real-time chat (if available)

### Contact

- **Technical Lead:** [Your Name]
- **Operations:** [Ops Contact]
- **Security:** [Security Contact]

---

## 📄 LICENSE

[Your License Here]

---

## 🔄 CHANGELOG

### v1.0.0 - November 1, 2026 (Security Hardened)

**Security Fixes:**
- ✅ Fixed 8 critical vulnerabilities
- ✅ Added rate limiting
- ✅ Implemented CSRF protection
- ✅ Added input validation (Zod)
- ✅ Enabled security headers
- ✅ Added webhook replay protection
- ✅ Enabled RLS on all tables

**Features:**
- ✅ Automated daily billing (Skema B)
- ✅ Mayar payment integration
- ✅ WhatsApp notifications
- ✅ Admin dashboard
- ✅ Bulk operations
- ✅ Manual cash payments
- ✅ Overdue tracking

**Infrastructure:**
- ✅ Vercel cron jobs
- ✅ Next.js 16 App Router
- ✅ Supabase PostgreSQL
- ✅ Security-first architecture

---

**Document Version:** 1.0.0  
**Last Updated:** November 1, 2026  
**Maintained By:** Development Team

