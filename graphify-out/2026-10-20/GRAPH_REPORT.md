# Graph Report - billing  (2026-10-20)

## Corpus Check
- 82 files · ~54,846 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .css 1)

## Summary
- 500 nodes · 646 edges · 38 communities (27 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b7f26ef1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- whatsapp.js
- Standard Security & Threat Model
- 3. PostgreSQL Schema Definition
- cn
- Coding Standards & Conventions
- 4. Roadmap Utama
- package.json
- Usage Reference
- PRODUCT REQUIREMENT DOCUMENT (PRD)
- requireAdmin
- dependencies
- Laporan Perkembangan Proyek Beatnet
- 2. Checklist Rencana Aksi (Action Plan Checklist)
- 6. Layout Per Screen
- manifest.json
- 5. User Flows
- mayar-webhook.test.mjs
- Design Brief — CRM & Billing RT/RW Net
- 4. Screen Inventory
- overdue/route.js
- 8. State Screen Kunci
- 10. Accessibility
- compilerOptions
- [id]/layout.js
- resolve
- app/layout.js
- 2. Visual Direction
- 1. Design Principles
- 3. Design Tokens
- AGENTS.md
- vercel.json
- 9. Responsive Behaviour

## God Nodes (most connected - your core abstractions)
1. `react` - 25 edges
2. `supabase` - 19 edges
3. `requireAdmin()` - 17 edges
4. `cn()` - 17 edges
5. `Design Brief — CRM & Billing RT/RW Net` - 14 edges
6. `3. PostgreSQL Schema Definition` - 13 edges
7. `Usage Reference` - 12 edges
8. `4. Roadmap Utama` - 12 edges
9. `Standard Security & Threat Model` - 12 edges
10. `Mayar CLI — Agent Skill` - 11 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/bulk/pelanggan/route.js → lib/server-auth.js
- `POST()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/bulk/tagihan/route.js → lib/server-auth.js
- `POST()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/bulk/wa/route.js → lib/server-auth.js
- `GET()` --calls--> `formatBulan()`  [EXTRACTED]
  app/api/cron/generate-payment-links/route.js → lib/whatsapp.js
- `POST()` --calls--> `requireAdmin()`  [EXTRACTED]
  app/api/wa/blast-wilayah/route.js → lib/server-auth.js

## Import Cycles
- None detected.

## Communities (38 total, 6 thin omitted)

### Community 0 - "react"
Cohesion: 0.06
Nodes (19): dynamic, LaporanKeuanganPage(), BULAN, COLORS, DashboardPage(), PaketPage(), DetailPelangganPage(), PelangganPage() (+11 more)

### Community 1 - "whatsapp.js"
Cohesion: 0.12
Nodes (23): delay(), POST(), supabase, dynamic, maxDuration, dynamic, GET(), maxDuration (+15 more)

### Community 2 - "Standard Security & Threat Model"
Cohesion: 0.05
Nodes (38): 0. Keputusan Keamanan yang Mengikat, 10. Referensi Implementasi Internal, 1.1 PASTA ringkas, 1.2 STRIDE threat register, 1. Metodologi PASTA dan STRIDE, 2.1 Authentication, 2.2 Token dan revocation, 2.3 RBAC/ABAC (+30 more)

### Community 3 - "3. PostgreSQL Schema Definition"
Cohesion: 0.06
Nodes (30): 10. Acceptance Checklist Sebelum Coding, 1. Keputusan Arsitektur, 2. Entity Relationship & Data Model, 3. PostgreSQL Schema Definition, 4. Indexing Strategy, 5. Integrity, State Machine, dan Trigger, 6. Scalability & Performance, 7. Security & Compliance (+22 more)

### Community 4 - "cn"
Cohesion: 0.11
Nodes (22): BottomNav(), mainNav, moreNav, InstallPWAButton(), navItems, Sidebar(), Badge(), Button (+14 more)

### Community 5 - "Coding Standards & Conventions"
Cohesion: 0.07
Nodes (28): 0. Technology Baseline, 1.1 Pola wajib, 1.2 Aggregate dan use case minimum, 1.3 Struktur repository baku, 1. Architecture & Patterns, 2.1 Konvensi identifier, 2.2 Formatter, linter, dan quality gates, 2. Naming & Code Style (+20 more)

### Community 6 - "4. Roadmap Utama"
Cohesion: 0.07
Nodes (26): 1. Dokumen Sumber, 2. Instruksi Agent, 3. Arsitektur Target, 4. Roadmap Utama, 5. Prioritas Fitur, 6. Definition of Done MVP, 7. Urutan Tugas Agent Saat Memulai Coding, 8. Laporan Wajib Setelah Setiap Task (+18 more)

### Community 7 - "package.json"
Cohesion: 0.08
Nodes (23): devDependencies, autoprefixer, postcss, tailwindcss, name, private, scripts, build (+15 more)

### Community 8 - "Usage Reference"
Cohesion: 0.09
Nodes (22): Account, Agent Decision Tree, Agent Skills Installation, AI Agent Usage Guidelines & Decision Matrix, Customers, Documentation Search (`docs`), Error Handling, Global Flags (+14 more)

### Community 9 - "PRODUCT REQUIREMENT DOCUMENT (PRD)"
Cohesion: 0.09
Nodes (22): 10. Open Questions & Prasyarat Teknis (Sebelum Coding Dimulai), 1. Problem Statement, 2. Target User & Persona, 3. Goals & Non-Goals, 4. User Stories, 5. Roadmap Fitur (MVP / v2 / Nanti), 6. Functional Requirements (Detail per Fitur MVP), 7. Sketsa Data Model (+14 more)

### Community 10 - "requireAdmin"
Cohesion: 0.11
Nodes (24): POST(), supabase, POST(), supabase, dynamic, GET(), maxDuration, POST() (+16 more)

### Community 11 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, class-variance-authority, clsx, lucide-react, midtrans-client, next, react, react-dom (+8 more)

### Community 12 - "Laporan Perkembangan Proyek Beatnet"
Cohesion: 0.17
Nodes (11): 1. Ringkasan Eksekutif, 2. Status Modul dan Fitur, 3. Status Deployment, 4. Langkah Berikutnya, 5. Kesimpulan, A. Keamanan dan Akses, Aktivasi Gateway Mayar, B. Sistem Otomatisasi (+3 more)

### Community 13 - "2. Checklist Rencana Aksi (Action Plan Checklist)"
Cohesion: 0.18
Nodes (10): 1. Executive Summary, 2. Checklist Rencana Aksi (Action Plan Checklist), 3. Matriks Referensi File & Status Perbaikan, 4. Panduan Eksekusi (Next Step), BEATNET — AUDIT REMEDIATION & ACTION PLAN, FASE 1: Patch Keamanan Mendesak (Urgent Security Patches), FASE 2: Sinkronisasi Billing Engine & Cron (Skema B), FASE 3: Rombak Integrasi Payment Gateway (Midtrans $\rightarrow$ Mayar) (+2 more)

### Community 14 - "6. Layout Per Screen"
Cohesion: 0.22
Nodes (9): 6. Layout Per Screen, Customer Detail, Customer List, Dashboard Overview, Finance Overview, Integration Settings, Invoice Detail, Invoice List (+1 more)

### Community 15 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 16 - "5. User Flows"
Cohesion: 0.29
Nodes (7): 5. User Flows, Billing otomatis, Menambahkan pelanggan, Overdue dan perpanjangan, Pembayaran digital, Pembayaran tunai, Rekonsiliasi

### Community 18 - "Design Brief — CRM & Billing RT/RW Net"
Cohesion: 0.33
Nodes (5): 7. Component Library, Acceptance Checklist Sebelum Coding, Arah Produk, Design Brief — CRM & Billing RT/RW Net, Keputusan Akhir

### Community 19 - "4. Screen Inventory"
Cohesion: 0.33
Nodes (6): 4. Screen Inventory, Authentication, Billing, Customer dan package, Finance dan settings, Operational

### Community 20 - "overdue/route.js"
Cohesion: 0.50
Nodes (4): dynamic, GET(), getBusinessDateWib(), maxDuration

### Community 21 - "8. State Screen Kunci"
Cohesion: 0.33
Nodes (6): 8. State Screen Kunci, Customer List, Dashboard, Finance Overview, Integration Settings, Invoice List dan Detail

### Community 22 - "10. Accessibility"
Cohesion: 0.40
Nodes (5): 10. Accessibility, Focus dan keyboard, Kontras, Motion, Semantic HTML dan ARIA

### Community 23 - "compilerOptions"
Cohesion: 0.40
Nodes (4): compilerOptions, baseUrl, lib, paths

### Community 27 - "2. Visual Direction"
Cohesion: 0.40
Nodes (5): 2. Visual Direction, Mood, Referensi, Tipografi, Yang dihindari

### Community 28 - "1. Design Principles"
Cohesion: 0.50
Nodes (4): 1.1 Cash position first, 1.2 One-person operation, 1.3 Operational confidence, 1. Design Principles

### Community 29 - "3. Design Tokens"
Cohesion: 0.50
Nodes (4): 3. Design Tokens, Spacing, radius, dan shadow, Tipografi, Warna

### Community 37 - "9. Responsive Behaviour"
Cohesion: 0.50
Nodes (4): 9. Responsive Behaviour, Desktop — 1200 px ke atas, Mobile — 320–767 px, Tablet — 768–1199 px

## Knowledge Gaps
- **269 isolated node(s):** `supabase`, `supabase`, `supabase`, `dynamic`, `maxDuration` (+264 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 321 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `whatsapp.js`, `cn`, `package.json`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `@supabase/supabase-js` connect `whatsapp.js` to `requireAdmin`, `overdue/route.js`, `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `supabase`, `supabase`, `supabase` to the rest of the system?**
  _269 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.05649717514124294 - nodes in this community are weakly interconnected._
- **Should `whatsapp.js` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Standard Security & Threat Model` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._