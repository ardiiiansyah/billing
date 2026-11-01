# 📋 QUICK START GUIDE - DATABASE RECOVERY

## 🚨 SITUASI: Database Supabase Terhapus

## ⚡ SOLUSI CEPAT (5 Menit)

### 1️⃣ Buka Supabase SQL Editor
```
URL: https://app.supabase.com/project/efazqkjunikuqshrdufd/sql
```

### 2️⃣ Copy Script
```bash
# Lokasi file
C:\Users\ASUS\billing\supabase\COMPLETE-DATABASE-REBUILD.sql
```

### 3️⃣ Execute di SQL Editor
- Select All (Ctrl+A) dari file
- Copy (Ctrl+C)
- Paste di SQL Editor (Ctrl+V)
- Click "Run" atau tekan F5
- Tunggu ~10 detik

### 4️⃣ Lihat Success Message
```
========================================
DATABASE REBUILD COMPLETED SUCCESSFULLY!
========================================
Tables created: 9
RLS policies: 10
Stored procedures: 3
Initial packages: 3
```

### 5️⃣ Create Admin User
```
Supabase → Authentication → Users → Add user
Email: admin@beatnet.com
Password: [buat password kuat]
```

### 6️⃣ Test Login
```
http://localhost:3000/login
Login dengan email & password step 5
```

## ✅ DONE!

Database rebuilt dengan:
- ✅ 9 Tables
- ✅ 10 RLS Policies
- ✅ 3 Stored Procedures
- ✅ 15+ Indexes
- ✅ 1 Trigger
- ✅ 3 Initial Packages

## 📚 Detail Lengkap
Lihat: `DATABASE-RECOVERY-GUIDE.md`

## 🆘 Error?
1. Check error message di SQL Editor
2. Re-run script dari awal
3. Baca troubleshooting section di guide lengkap

---

**File SQL:** `supabase/COMPLETE-DATABASE-REBUILD.sql`  
**Guide:** `DATABASE-RECOVERY-GUIDE.md`  
**Time:** ~5 menit total
