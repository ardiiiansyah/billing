# 🔄 DATABASE RECOVERY GUIDE
## Complete Database Rebuild untuk Beatnet Billing System

**Date:** November 1, 2026  
**Status:** Database Terhapus - Perlu Rebuild  
**File SQL:** `supabase/COMPLETE-DATABASE-REBUILD.sql`

---

## 🚨 SITUASI SAAT INI

Database Supabase Anda telah terhapus. Tidak masalah! Saya telah membuatkan script lengkap untuk rebuild dari awal.

---

## ✅ YANG SUDAH DISIAPKAN

File `COMPLETE-DATABASE-REBUILD.sql` berisi:

1. ✅ **9 Tables lengkap:**
   - paket (packages)
   - wilayah (regions)
   - pelanggan (customers)
   - tagihan (invoices)
   - pembayaran (payments - legacy)
   - payment_attempts (Mayar integration)
   - payment_events (webhook deduplication)
   - pengeluaran (expenses)
   - log_notifikasi (WhatsApp logs)

2. ✅ **15+ Indexes** untuk performance

3. ✅ **3 Stored Procedures (RPC):**
   - `generate_tagihan_harian_skema_b()` - Daily billing
   - `process_gateway_payment()` - Webhook handler
   - `mark_overdue_tagihan()` - Overdue checker

4. ✅ **10 RLS Policies** - Row Level Security

5. ✅ **1 Trigger** - Auto-update payment status

6. ✅ **3 Initial packages** - Seed data

7. ✅ **Verification queries** - Auto-check setelah execute

---

## 📋 LANGKAH-LANGKAH REBUILD

### STEP 1: Buka Supabase SQL Editor

1. Login ke Supabase: https://app.supabase.com
2. Pilih project: `efazqkjunikuqshrdufd`
3. Klik menu **"SQL Editor"** di sidebar kiri
4. Klik **"New query"**

---

### STEP 2: Copy SQL Script

1. Buka file: `C:\Users\ASUS\billing\supabase\COMPLETE-DATABASE-REBUILD.sql`
2. **Select All** (Ctrl+A)
3. **Copy** (Ctrl+C)

Atau copy dari command line:

```bash
# Windows Command Prompt
type supabase\COMPLETE-DATABASE-REBUILD.sql | clip

# Git Bash
cat supabase/COMPLETE-DATABASE-REBUILD.sql | clip
```

---

### STEP 3: Paste & Execute

1. Di Supabase SQL Editor, **Paste** script (Ctrl+V)
2. Scroll ke bawah untuk memastikan semua ter-copy (650+ lines)
3. Klik tombol **"Run"** (atau tekan F5)
4. Tunggu hingga selesai (~5-10 detik)

---

### STEP 4: Verify Success

Anda akan melihat output verification di bawah editor:

```
========================================
DATABASE REBUILD COMPLETED SUCCESSFULLY!
========================================
Tables created: 9
RLS policies: 10
Stored procedures: 3
Initial packages: 3

Next steps:
1. Verify tables and RLS using queries above
2. Create your first admin user in Supabase Auth
3. Start adding customers via dashboard
========================================
```

Dan beberapa hasil query verification:

**Tables Check:**
```
schemaname | tablename          | rls_enabled
-----------|--------------------|------------
public     | paket              | t (true)
public     | pelanggan          | t (true)
public     | tagihan            | t (true)
...
```

**RLS Policies Check:**
```
tablename  | policyname                  | roles
-----------|-----------------------------|--------------
paket      | Admin full access to paket  | authenticated
pelanggan  | Admin full access...        | authenticated
...
```

**Stored Procedures Check:**
```
routine_name                      | routine_type
----------------------------------|-------------
generate_tagihan_harian_skema_b   | FUNCTION
process_gateway_payment           | FUNCTION
mark_overdue_tagihan              | FUNCTION
```

**Initial Data Check:**
```
check_name       | result
-----------------|-------
Paket count:     | 3
Tables with RLS: | 9
```

---

### STEP 5: Create Admin User

Sekarang buat user admin untuk login:

1. Di Supabase Dashboard, klik **"Authentication"** → **"Users"**
2. Klik **"Add user"** → **"Create new user"**
3. Isi:
   - **Email:** admin@beatnet.com (atau email Anda)
   - **Password:** (buat password kuat, minimal 8 karakter)
4. Klik **"Create user"**

**PENTING:** Simpan email dan password ini untuk login ke dashboard!

---

### STEP 6: Test Connection dari Aplikasi

Kembali ke aplikasi dan test koneksi:

```bash
cd /c/Users/ASUS/billing

# Test koneksi Supabase
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

supabase.from('paket').select('*').then(({ data, error }) => {
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Connection successful!');
    console.log('Packages found:', data.length);
    console.log('Packages:', JSON.stringify(data, null, 2));
  }
});
"
```

**Expected Output:**
```
✅ Connection successful!
Packages found: 3
Packages: [
  {
    "id": "uuid...",
    "nama_paket": "Hemat 10M",
    "kecepatan": "10 Mbps",
    "harga": 100000,
    ...
  },
  ...
]
```

---

### STEP 7: Login ke Dashboard

1. Start development server (jika belum jalan):
   ```bash
   npm run dev
   ```

2. Buka browser: http://localhost:3000/login

3. Login dengan:
   - **Email:** admin@beatnet.com (atau yang Anda buat di Step 5)
   - **Password:** (password yang Anda buat)

4. Jika berhasil, Anda akan masuk ke dashboard ✅

---

## 🔧 TROUBLESHOOTING

### Issue 1: Error "relation does not exist"

**Cause:** Script belum selesai dijalankan atau ada error di tengah

**Solution:**
1. Scroll ke output di SQL Editor
2. Cari error message (berwarna merah)
3. Jika ada, copy error dan jalankan ulang script dari awal
4. Pastikan ALL lines ter-copy (650+ lines)

---

### Issue 2: RLS Error - "permission denied"

**Cause:** User belum authenticated atau RLS policy tidak apply

**Solution:**
1. Logout dari dashboard
2. Login ulang
3. Refresh browser (Ctrl+F5)
4. Jika masih error, check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

---

### Issue 3: Stored Procedure Not Found

**Cause:** Function tidak ter-create atau permission issue

**Solution:**
1. Check apakah function ada:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public';
   ```

2. Jika tidak ada, re-run bagian PART 4 dari script

3. Grant permission lagi:
   ```sql
   GRANT EXECUTE ON FUNCTION process_gateway_payment TO service_role;
   GRANT EXECUTE ON FUNCTION generate_tagihan_harian_skema_b TO service_role;
   GRANT EXECUTE ON FUNCTION mark_overdue_tagihan TO service_role;
   ```

---

### Issue 4: Connection Test Failed

**Cause:** Environment variables salah atau Supabase credentials expired

**Solution:**
1. Check .env.local file masih ada dan benar
2. Get fresh credentials dari Supabase Dashboard:
   - Go to **Settings** → **API**
   - Copy **Project URL** → paste ke `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** → paste ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** → paste ke `SUPABASE_SERVICE_ROLE_KEY`

---

## 📊 POST-REBUILD VERIFICATION CHECKLIST

Jalankan checklist ini untuk memastikan semua OK:

### Database Structure ✅

```sql
-- Should return 9 tables
SELECT COUNT(*) as table_count 
FROM pg_tables 
WHERE schemaname = 'public';

-- Should return 9 (all enabled)
SELECT COUNT(*) as rls_enabled_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;

-- Should return 3
SELECT COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';

-- Should return 3
SELECT COUNT(*) as package_count
FROM public.paket;
```

---

### Expected Results:

| Check | Expected | Query |
|-------|----------|-------|
| Tables | 9 | ✅ |
| RLS Enabled | 9/9 | ✅ |
| Functions | 3 | ✅ |
| Initial Packages | 3 | ✅ |
| Indexes | 15+ | ✅ |
| Triggers | 1 | ✅ |

---

## 🎯 NEXT STEPS SETELAH DATABASE READY

### 1. Populate Data (Optional - untuk testing)

Tambah data dummy customers:

```sql
-- Insert wilayah
INSERT INTO public.wilayah (rt, rw, nama) VALUES
('001', '001', 'RT 001 RW 001 - Zona A'),
('002', '001', 'RT 002 RW 001 - Zona B');

-- Get paket ID (misal: Reguler 20M)
-- Replace 'uuid-here' dengan hasil query ini
SELECT id FROM public.paket WHERE nama_paket = 'Reguler 20M';

-- Insert sample customers
INSERT INTO public.pelanggan (
    kode_pelanggan, nama, no_wa, alamat, 
    paket_id, tanggal_jatuh_tempo, status
) VALUES
('CUST-001', 'Budi Santoso', '628123456789', 'Jl. Merdeka No. 1', 
 'uuid-here', 10, 'aktif'),
('CUST-002', 'Siti Aminah', '628987654321', 'Jl. Sudirman No. 2', 
 'uuid-here', 15, 'aktif');
```

---

### 2. Test Billing Function

Test generate tagihan untuk hari ini:

```sql
-- Get current date in WIB
SELECT 
    EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))::INT as tanggal,
    EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))::INT as bulan,
    EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))::INT as tahun;

-- Generate tagihan (ganti dengan tanggal/bulan/tahun dari query di atas)
SELECT generate_tagihan_harian_skema_b(1, 11, 2026);
-- Returns: jumlah tagihan yang digenerate
```

---

### 3. Test Webhook Function

Test process payment (simulate webhook):

```sql
-- First, create a test invoice and payment attempt
-- (skip if you already have real data)

-- Then test the function
SELECT process_gateway_payment(
    'tagihan-uuid-here'::UUID,
    'test-event-123',
    'test-order-456',
    150240, -- amount
    'qris',
    NOW()
);
-- Returns: {"already_processed": false, "tagihan_id": "..."}
```

---

### 4. Setup Cron Jobs di Vercel

Setelah database ready, setup cron jobs untuk automation:

**File:** `vercel.json` (should already exist in your project)

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

Jangan lupa set Authorization header di Vercel dashboard!

---

## 📚 ADDITIONAL RESOURCES

### Schema Reference

- **Tables:** 9 core tables untuk billing, customers, payments
- **RLS:** All tables protected dengan Row Level Security
- **Functions:** 3 stored procedures untuk business logic
- **Triggers:** 1 trigger untuk auto-update payment status

### File Locations

```
billing/
├── supabase/
│   ├── COMPLETE-DATABASE-REBUILD.sql  ← USE THIS FILE!
│   ├── schema.sql                      (old, don't use)
│   └── migrations/                     (included in complete rebuild)
└── DATABASE-RECOVERY-GUIDE.md          ← This file
```

### Important URLs

- **Supabase Dashboard:** https://app.supabase.com
- **SQL Editor:** https://app.supabase.com/project/efazqkjunikuqshrdufd/sql
- **Auth Users:** https://app.supabase.com/project/efazqkjunikuqshrdufd/auth/users
- **Database Tables:** https://app.supabase.com/project/efazqkjunikuqshrdufd/editor

---

## ✅ SUCCESS CHECKLIST

Centang setiap step yang sudah selesai:

- [ ] **Step 1:** Buka Supabase SQL Editor
- [ ] **Step 2:** Copy COMPLETE-DATABASE-REBUILD.sql
- [ ] **Step 3:** Paste & Execute script
- [ ] **Step 4:** Verify success (lihat output messages)
- [ ] **Step 5:** Create admin user di Auth
- [ ] **Step 6:** Test connection dari aplikasi (node test)
- [ ] **Step 7:** Login ke dashboard (http://localhost:3000/login)
- [ ] **Bonus:** Add sample data (optional)
- [ ] **Bonus:** Test billing function (optional)

---

## 🆘 BUTUH BANTUAN?

Jika ada error atau stuck di step manapun:

1. **Screenshot error message**
2. **Note which step** you're on
3. **Check troubleshooting section** above
4. **Tanya saya** dengan detail error yang muncul

---

**Good luck dengan database rebuild! 🚀**

Setelah database rebuild selesai, Anda bisa lanjut ke deployment production.

---

**Last Updated:** November 1, 2026  
**Status:** Ready to Execute  
**SQL File:** `supabase/COMPLETE-DATABASE-REBUILD.sql` (650+ lines)
