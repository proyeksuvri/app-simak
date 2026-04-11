# SIMAK BKU — Konteks Proyek untuk Claude

Sistem Manajemen Keuangan UIN Palopo (BKU = Buku Kas Umum).

---

## Stack & Infrastruktur

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (Material 3 design tokens)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Supabase Project ID**: `bqlrbdzmexmjcumechmt`
- **Tenant ID tunggal**: `11111111-1111-1111-1111-111111111111` (hardcoded di semua hooks)
- **Deploy**: Vercel (SPA rewrite via `vercel.json`)
- **Env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Struktur Direktori Utama

```
src/
  context/      AppContext.tsx          — global state (user, tahunAnggaran, session)
  hooks/         useTransactions.ts     — fetch transaksi dari Supabase
                 useMutateTransaction.ts — insert/update/delete transaksi
                 useApproval.ts         — workflow submit/approve/reject
                 useBankAccounts.ts     — CRUD rekening bank (tabel: accounts)
                 useAuth.ts             — Supabase auth + profile
                 useWorkUnits.ts        — unit kerja
                 usePeriods.ts          — periode anggaran
                 useUserManagement.ts   — kelola user (admin)
  types/         transaction.ts         — Transaction, TransactionStatus, Kategori*
                 user.ts                — UserRole, User interface
                 database.ts            — DbTransaction, DbBankAccount, dll (shapes Supabase)
  components/
    domain/      TransactionTable.tsx   — tabel BPN/BPK dengan aksi
                 TransactionFormModal.tsx — form input/edit transaksi
  pages/
    auth/        LoginPage.tsx
    penerimaan/  BPNPage.tsx
    pengeluaran/ BPKPage.tsx, UPTUPPage.tsx
    bku/         BKUPenerimaanPage, BKUIndukPage, BKUPembantuPage, PenutupanHarianPage
    approval/    ApprovalPage.tsx
    rekonsiliasi/RekonsiliasiPage.tsx
    laporan/     LaporanPage.tsx
    pengaturan/  PengaturanPage.tsx     — tab: profil, users, units, rekening
```

---

## Role & Otorisasi UI

| Role | Label | Akses Utama |
|------|-------|------------|
| `admin` | Admin Sistem | Semua fitur + Pengaturan penuh |
| `pimpinan` | Pimpinan (Rektor) | Approval transaksi |
| `bendahara_induk` | Bendahara Induk Pengeluaran | Input BPK, BKU Induk |
| `bendahara_pembantu` | Bendahara Pengeluaran Pembantu | Input BPK, BKU Pembantu |
| `bendahara_penerimaan` | Bendahara Penerimaan | Input BPN, BKU Penerimaan |

```ts
const BENDAHARA_ROLES = ['bendahara_penerimaan', 'bendahara_induk', 'bendahara_pembantu']
const canApprove = role === 'pimpinan' || role === 'admin'
```

---

## Workflow Status Transaksi

```
DRAFT (pending) → SUBMITTED (diajukan) → APPROVED (terverifikasi) / REJECTED (ditolak) → POSTED
```

- Bendahara: input (DRAFT) → submit (SUBMITTED)
- Pimpinan/Admin: approve (APPROVED) atau reject (REJECTED)
- Edit & Delete hanya boleh saat status `pending` (DRAFT) dan oleh `isBendahara`

---

## Tabel Supabase Utama

| Tabel | Keterangan |
|-------|-----------|
| `transactions` | Transaksi BPN/BPK. Soft delete: `deleted_at`. FK: `source_account_id → accounts.id` |
| `accounts` | Rekening bank penerimaan. Kolom: `bank_name`, `account_number`, `account_name`, `is_active`, `deleted_at` |
| `periods` | Periode anggaran. Kolom: `year`, `month`, `semester`, `code`, `is_closed` |
| `work_units` | Unit kerja. Soft delete: `deleted_at` |
| `treasurers` | Data bendahara. Relasi ke `treasurer_categories` |
| `user_tenants` | Mapping user → tenant + role |

**PENTING**: Rekening bank ada di tabel `accounts` (bukan `bank_accounts`).
`transactions.source_account_id` FK mereferensi `accounts.id`.

---

## Tahun Anggaran

- Dipilih user di **halaman Login** sebelum masuk
- Disimpan di `localStorage` key: `simak_bku_tahun_anggaran`
- Default: `2026`
- Dihapus dari localStorage saat `signOut`
- Tidak bisa diubah tanpa logout (hanya label statis di Header)
- Diakses via `useAppContext().tahunAnggaran`
- Data aktif hanya tahun 2026 di Supabase saat ini

---

## Konvensi Kode

- **Semua hooks** gunakan `TENANT_ID = '11111111-1111-1111-1111-111111111111'` hardcoded
- **Soft delete**: set `deleted_at = now()`, query selalu `.is('deleted_at', null)`
- **DB status** (UPPERCASE) → **Frontend status** (lowercase Indonesia): lihat `mapStatus()` di `useTransactions.ts`
- **DB type** `IN`/`OUT` → **Frontend type** `penerimaan`/`pengeluaran`
- **Rupiah format**: `formatRupiah()` di `src/lib/formatters.ts`; input form pakai `parseRupiah()` lokal di `TransactionFormModal`
- TypeScript strict mode dinonaktifkan di build (skip tsc strict check)

---

## Kategori Transaksi

**BPN (Penerimaan / type=IN)**: `UKT`, `PNBP Lainnya`, `Dana Penelitian`, `Transfer BLU`

**BPK (Pengeluaran / type=OUT)**: `Honorarium`, `Belanja ATK`, `Perjalanan Dinas`, `Langganan Jurnal`, `Pemeliharaan`, `Pencairan UP`, `Pencairan TUP`

---

## Fitur yang Sudah Diimplementasi

- [x] Autentikasi Supabase + role-based UI
- [x] Input BPN (Bukti Penerimaan) dengan dropdown rekening bank (wajib, BPN only)
- [x] Input BPK (Bukti Pengeluaran Kas)
- [x] Edit & Delete transaksi (status pending, role bendahara)
- [x] Workflow approval: submit → approve/reject
- [x] BKU Penerimaan, BKU Induk, BKU Pembantu
- [x] Penutupan Harian
- [x] Rekonsiliasi Bank
- [x] Laporan (export PDF & Excel)
- [x] Pengaturan: tab Profil, Users, Unit Kerja, Rekening Bank
- [x] Tahun Anggaran dipilih saat Login, disimpan per-device (localStorage)

---

## Pola yang Harus Diikuti

1. **Jangan buat tabel baru** sebelum periksa apakah kolom/tabel sudah ada di schema (`src/types/database.ts` dan Supabase MCP)
2. **Form modal** reuse `TransactionFormModal` dengan prop `editTx?: Transaction` untuk mode edit
3. **Error dari Supabase** ditampilkan via state `error` dari hook, bukan throw
4. **Komponen UI** ada di `src/components/ui/` — gunakan yang sudah ada (`Button`, `Modal`, `Table`, `Badge`, `Card`, `EmptyState`) sebelum buat baru
5. **Tab Pengaturan** mengikuti pola `UserTab` (komponen inline di `PengaturanPage.tsx`)


Buat halaman login menggunakan React (functional component) + Tailwind CSS.

Konteks:
Aplikasi bernama SIMAK (Sistem Manajemen Keuangan) untuk BLU UIN Palopo.

Kebutuhan utama:
- Gunakan 100% Bahasa Indonesia
- Desain minimalis, modern, dan fokus ke form login
- Layout centered (full screen, dark theme diperbolehkan)
- Responsive (desktop & mobile)

=== STRUKTUR UI ===

Header:
- Judul besar: "SIMAK"
- Subjudul: "Sistem Manajemen Keuangan"
- Deskripsi kecil: "Platform administrasi keuangan BLU UIN Palopo"
- Tampilkan juga: "Tahun Anggaran: 2026"

Form login:
- Field 1:
  Label: "NIP"
  Input:
    - type: text
    - hanya angka (validasi)
    - placeholder: "Masukkan NIP"
    - maxLength: 18

- Field 2:
  Label: "Kata Sandi"
  Input:
    - type: password
    - ada toggle show/hide password (icon mata)

- Tombol:
  - Label: "Masuk"
  - Full width
  - Disabled saat loading

- Info tambahan:
  Teks kecil di bawah tombol:
  "Lupa kata sandi? Hubungi admin SIMAK"

=== VALIDASI ===
- NIP:
  - wajib diisi
  - hanya angka
  - panjang 18 digit
- Password:
  - wajib diisi

- Tampilkan error message:
  "NIP atau kata sandi tidak valid"

- Validasi realtime (onBlur atau onChange)

=== UX BEHAVIOR ===
- Saat submit:
  - tampilkan loading spinner di tombol
  - disable tombol
- Jika error:
  - tampilkan pesan error di bawah form
- Tambahkan deteksi Caps Lock pada password (opsional)

=== SECURITY AWARE UI ===
- Jangan tampilkan detail error backend
- Gunakan pattern controlled component (React state)

=== STYLE (TAILWIND) ===
- Gunakan Tailwind CSS saja
- Card login di tengah (max-w-md, mx-auto, rounded-xl, shadow-lg)
- Padding nyaman (p-6 / p-8)
- Input:
  - border, rounded-lg
  - focus:ring
- Tombol:
  - warna utama (biru/ungu gradient diperbolehkan)
- Background:
  - dark gradient / subtle pattern

=== OUTPUT ===
- 1 file React component (default export)
- Tidak perlu backend
- Gunakan dummy handler:
  handleLogin()

=== OPTIONAL (jika bisa) ===
- Animasi ringan (hover/focus)
- Transisi smooth

Tujuan:
UI login production-ready, clean, dan mudah diintegrasikan ke sistem SIMAK.