/**
 * useBKUPage — server-side paginated BKU hook.
 *
 * Data fetched = exactly `pageSize` rows per request.
 * Saldo running balance is computed in PostgreSQL via window function,
 * so it is always accurate regardless of which page is shown.
 *
 * Pass page=0 to fetch ALL rows at once (used by print/export).
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { BKUType, BKUEntryWithSaldo } from '../types'
import { useAppContext } from '../context/AppContext'

export interface BKUPageFilters {
  unitId?:             string | null
  accountId?:          string | null
  bulan?:              number | null
  jenisPendapatanId?:  string | null
}

interface RpcRow {
  id:                     string
  type:                   'IN' | 'OUT'
  transaction_date:       string
  no_bukti:               string | null
  description:            string | null
  status:                 string
  work_unit_id:           string | null
  source_account_id:      string | null
  destination_account_id: string | null
  jenis_pendapatan_id:    string | null
  kode_rekening:          string | null
  debit:                  number
  kredit:                 number
  saldo:                  number
}

interface RpcResult {
  total:         number
  saldo_akhir:   number
  total_debit:   number
  total_kredit:  number
  rows:          RpcRow[]
}

function mapRow(r: RpcRow, bkuType: BKUType): BKUEntryWithSaldo {
  return {
    id:                r.id,
    tanggal:           r.transaction_date,
    nomorBukti:        r.no_bukti ?? '-',
    uraian:            r.description ?? '',
    debit:             Number(r.debit),
    kredit:            Number(r.kredit),
    bkuType,
    unitId:            r.work_unit_id,
    saldo:             Number(r.saldo),
    status:            r.status,
    kategori:          r.kode_rekening,
    sourceAccountId:   r.type === 'IN' ? r.destination_account_id : r.source_account_id,
    jenisPendapatanId: r.jenis_pendapatan_id,
  }
}

export function useBKUPage(
  type:     BKUType,
  page:     number,
  pageSize: number,
  filters:  BKUPageFilters = {},
) {
  const { tahunAnggaran } = useAppContext()
  const [entries,     setEntries]     = useState<BKUEntryWithSaldo[]>([])
  const [saldoAkhir,  setSaldoAkhir]  = useState(0)
  const [totalDebit,  setTotalDebit]  = useState(0)
  const [totalKredit, setTotalKredit] = useState(0)
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)

  const { unitId, accountId, bulan, jenisPendapatanId } = filters

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_bku_page', {
      p_bku_type:            type,
      p_tahun:               tahunAnggaran,
      p_page:                page,
      p_page_size:           pageSize,
      p_unit_id:             unitId   ?? null,
      p_account_id:          accountId ?? null,
      p_bulan:               bulan    ?? null,
      p_jenis_pendapatan_id: jenisPendapatanId ?? null,
    })

    if (error) {
      console.error('[useBKUPage]', error)
      setLoading(false)
      return
    }

    const result = data as RpcResult
    setTotal(result.total ?? 0)
    setSaldoAkhir(Number(result.saldo_akhir  ?? 0))
    setTotalDebit(Number(result.total_debit  ?? 0))
    setTotalKredit(Number(result.total_kredit ?? 0))
    setEntries((result.rows ?? []).map(r => mapRow(r, type)))
    setLoading(false)
  }, [type, tahunAnggaran, page, pageSize, unitId, accountId, bulan, jenisPendapatanId])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return { entries, saldoAkhir, totalDebit, totalKredit, total, totalPages, loading }
}

/**
 * Fetch ALL entries for a BKU type (used by print).
 * Calls get_bku_page with p_page=0 (no LIMIT).
 */
export async function fetchAllBKUEntries(
  type:          BKUType,
  tahunAnggaran: number,
  filters:       BKUPageFilters = {},
): Promise<{ entries: BKUEntryWithSaldo[]; saldoAkhir: number }> {
  const { data, error } = await supabase.rpc('get_bku_page', {
    p_bku_type:            type,
    p_tahun:               tahunAnggaran,
    p_page:                0,
    p_page_size:           0,
    p_unit_id:             filters.unitId             ?? null,
    p_account_id:          filters.accountId          ?? null,
    p_bulan:               filters.bulan              ?? null,
    p_jenis_pendapatan_id: filters.jenisPendapatanId  ?? null,
  })

  if (error || !data) return { entries: [], saldoAkhir: 0 }

  const result = data as RpcResult
  return {
    entries:    (result.rows ?? []).map(r => mapRow(r, type)),
    saldoAkhir: Number(result.saldo_akhir ?? 0),
  }
}
