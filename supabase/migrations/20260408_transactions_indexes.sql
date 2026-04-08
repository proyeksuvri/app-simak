-- ============================================================
-- Index Optimization for transactions table
-- Tujuan: mempercepat query server-side pagination di useTransactionsPaged
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Index utama: filter dasar (deleted_at + tahun + type)
--    Dipakai di SEMUA query baseQuery()
CREATE INDEX IF NOT EXISTS idx_transactions_base
  ON transactions (transaction_date, type, deleted_at)
  WHERE deleted_at IS NULL;

-- 2. Index untuk filter status
--    Dipakai saat filterStatus / propStatus aktif
CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions (status, transaction_date, deleted_at)
  WHERE deleted_at IS NULL;

-- 3. Index komposit: type + status + date (pola paling sering)
--    Dipakai di BPN/BPK page dengan filter status
CREATE INDEX IF NOT EXISTS idx_transactions_type_status_date
  ON transactions (type, status, transaction_date)
  WHERE deleted_at IS NULL;

-- 4. Index untuk filter unit kerja
--    Dipakai saat unitId aktif (per bendahara)
CREATE INDEX IF NOT EXISTS idx_transactions_work_unit
  ON transactions (work_unit_id, transaction_date)
  WHERE deleted_at IS NULL;

-- 5. Index untuk filter rekening bank penerimaan (destination_account_id)
CREATE INDEX IF NOT EXISTS idx_transactions_dest_account
  ON transactions (destination_account_id, transaction_date)
  WHERE deleted_at IS NULL AND destination_account_id IS NOT NULL;

-- 6. Index untuk filter rekening bank pengeluaran (source_account_id)
CREATE INDEX IF NOT EXISTS idx_transactions_src_account
  ON transactions (source_account_id, transaction_date)
  WHERE deleted_at IS NULL AND source_account_id IS NOT NULL;

-- 7. Index untuk filter kategori (kode_rekening)
CREATE INDEX IF NOT EXISTS idx_transactions_kode_rekening
  ON transactions (kode_rekening, transaction_date)
  WHERE deleted_at IS NULL;

-- 8. Index untuk sort by amount (nominal)
CREATE INDEX IF NOT EXISTS idx_transactions_amount
  ON transactions (amount, id DESC)
  WHERE deleted_at IS NULL;

-- 9. Full-text search: description dan no_bukti
--    Dipakai saat searchText aktif (ILIKE query)
CREATE INDEX IF NOT EXISTS idx_transactions_description_trgm
  ON transactions USING gin (description gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_no_bukti_trgm
  ON transactions USING gin (no_bukti gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- Aktifkan ekstensi pg_trgm jika belum aktif (diperlukan untuk index trigram)
-- Jalankan ini terlebih dahulu jika index trigram gagal:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- Verifikasi index yang dibuat:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'transactions'
-- ORDER BY indexname;
-- ============================================================
