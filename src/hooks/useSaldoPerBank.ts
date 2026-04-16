import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface SaldoPerBankRow {
  accountId:       string
  bankName:        string
  accountNumber:   string
  accountName:     string
  jenisDana:       string | null
  penanggungJawab: string | null
  unitKerja:       string | null
  masukPeriode:    number   // penerimaan dalam rentang filterFrom–filterTo
  keluarPeriode:   number   // pengeluaran dalam rentang filterFrom–filterTo
  saldoAkhir:      number   // kumulatif s.d. filterTo
}

/**
 * Hitung saldo akhir per rekening bank menggunakan fn_saldo_per_bank(p_from, p_to).
 * - masukPeriode / keluarPeriode : hanya transaksi dalam rentang filterFrom–filterTo
 * - saldoAkhir                   : kumulatif seluruh riwayat s.d. filterTo
 * Hanya transaksi APPROVED / POSTED yang dihitung.
 */
export function useSaldoPerBank(filterFrom: string, filterTo: string) {
  const [rows,    setRows]    = useState<SaldoPerBankRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!filterFrom || !filterTo) {
      setRows([])
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      setLoading(true)

      const { data, error } = await supabase.rpc('fn_saldo_per_bank', {
        p_from: filterFrom,
        p_to:   filterTo,
      })

      if (cancelled) return
      if (error) {
        console.error('useSaldoPerBank error:', error)
        setRows([])
        setLoading(false)
        return
      }

      const result: SaldoPerBankRow[] = (data ?? []).map((r: {
        account_id:       string
        bank_name:        string
        account_number:   string
        account_name:     string
        jenis_dana:       string | null
        penanggung_jawab: string | null
        unit_kerja:       string | null
        masuk_periode:    number
        keluar_periode:   number
        saldo_akhir:      number
      }) => {
        const num = r.account_number ?? ''
        return {
          accountId:       r.account_id,
          bankName:        r.bank_name,
          accountNumber:   num.length > 4 ? `...${num.slice(-4)}` : num,
          accountName:     r.account_name,
          jenisDana:       r.jenis_dana,
          penanggungJawab: r.penanggung_jawab,
          unitKerja:       r.unit_kerja,
          masukPeriode:    Number(r.masuk_periode),
          keluarPeriode:   Number(r.keluar_periode),
          saldoAkhir:      Number(r.saldo_akhir),
        }
      })

      setRows(result)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [filterFrom, filterTo])

  return { rows, loading }
}
