-- ============================================================
-- VIEW: vw_saldo_per_bank
-- Saldo akhir per rekening bank (semua waktu / kumulatif penuh)
-- Cocok untuk snapshot "posisi kas saat ini"
-- ============================================================
CREATE OR REPLACE VIEW vw_saldo_per_bank AS
WITH masuk AS (
  SELECT destination_account_id AS account_id,
         SUM(amount)             AS total
  FROM   transactions
  WHERE  type       = 'IN'
    AND  status     IN ('APPROVED', 'POSTED')
    AND  deleted_at IS NULL
  GROUP  BY destination_account_id
),
keluar AS (
  SELECT source_account_id AS account_id,
         SUM(amount)        AS total
  FROM   transactions
  WHERE  type       = 'OUT'
    AND  status     IN ('APPROVED', 'POSTED')
    AND  deleted_at IS NULL
  GROUP  BY source_account_id
)
SELECT
  a.id               AS account_id,
  a.tenant_id,
  a.bank_name,
  a.account_number,
  a.account_name,
  a.jenis_dana,
  a.penanggung_jawab,
  a.unit_kerja,
  COALESCE(m.total, 0)                        AS total_masuk,
  COALESCE(k.total, 0)                        AS total_keluar,
  COALESCE(m.total, 0) - COALESCE(k.total, 0) AS saldo_akhir
FROM   accounts a
LEFT   JOIN masuk  m ON m.account_id = a.id
LEFT   JOIN keluar k ON k.account_id = a.id
WHERE  a.is_active  = TRUE
  AND  a.deleted_at IS NULL
ORDER  BY saldo_akhir DESC;

-- ============================================================
-- FUNCTION: fn_saldo_per_bank(p_from date, p_to date)
-- - masuk_periode / keluar_periode : transaksi dalam rentang p_from–p_to
-- - saldo_akhir                    : kumulatif seluruh riwayat s.d. p_to
-- Dipakai dashboard dengan filter periode (filterFrom, filterTo)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_saldo_per_bank(
  p_from date DEFAULT '2000-01-01',
  p_to   date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id         uuid,
  tenant_id          uuid,
  bank_name          text,
  account_number     text,
  account_name       text,
  jenis_dana         text,
  penanggung_jawab   text,
  unit_kerja         text,
  masuk_periode      numeric,
  keluar_periode     numeric,
  saldo_akhir        numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH
  masuk_periode AS (
    SELECT destination_account_id AS account_id,
           COALESCE(SUM(amount), 0) AS total
    FROM   transactions
    WHERE  type             = 'IN'
      AND  status           IN ('APPROVED', 'POSTED')
      AND  deleted_at       IS NULL
      AND  transaction_date >= p_from
      AND  transaction_date <= p_to
    GROUP  BY destination_account_id
  ),
  keluar_periode AS (
    SELECT source_account_id AS account_id,
           COALESCE(SUM(amount), 0) AS total
    FROM   transactions
    WHERE  type             = 'OUT'
      AND  status           IN ('APPROVED', 'POSTED')
      AND  deleted_at       IS NULL
      AND  transaction_date >= p_from
      AND  transaction_date <= p_to
    GROUP  BY source_account_id
  ),
  saldo_masuk AS (
    SELECT destination_account_id AS account_id,
           COALESCE(SUM(amount), 0) AS total
    FROM   transactions
    WHERE  type             = 'IN'
      AND  status           IN ('APPROVED', 'POSTED')
      AND  deleted_at       IS NULL
      AND  transaction_date <= p_to
    GROUP  BY destination_account_id
  ),
  saldo_keluar AS (
    SELECT source_account_id AS account_id,
           COALESCE(SUM(amount), 0) AS total
    FROM   transactions
    WHERE  type             = 'OUT'
      AND  status           IN ('APPROVED', 'POSTED')
      AND  deleted_at       IS NULL
      AND  transaction_date <= p_to
    GROUP  BY source_account_id
  )
  SELECT
    a.id,
    a.tenant_id,
    a.bank_name,
    a.account_number,
    a.account_name,
    a.jenis_dana,
    a.penanggung_jawab,
    a.unit_kerja,
    COALESCE(mp.total, 0)                          AS masuk_periode,
    COALESCE(kp.total, 0)                          AS keluar_periode,
    COALESCE(sm.total, 0) - COALESCE(sk.total, 0) AS saldo_akhir
  FROM   accounts a
  LEFT   JOIN masuk_periode  mp ON mp.account_id = a.id
  LEFT   JOIN keluar_periode kp ON kp.account_id = a.id
  LEFT   JOIN saldo_masuk    sm ON sm.account_id = a.id
  LEFT   JOIN saldo_keluar   sk ON sk.account_id = a.id
  WHERE  a.is_active  = TRUE
    AND  a.deleted_at IS NULL
  ORDER  BY saldo_akhir DESC;
$$;

GRANT EXECUTE ON FUNCTION fn_saldo_per_bank(date, date) TO authenticated;
