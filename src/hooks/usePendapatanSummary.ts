import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export interface PendapatanSummaryRow {
  jenis_pendapatan_id:    string
  kode_jenis_pendapatan:  string | null
  jenis_pendapatan:       string
  account_id:             string
  bank_name:           string
  account_name:        string
  account_number:      string
  work_unit_id:        string | null
  unit_kerja:          string | null
  year:                number
  month:               number
  jumlah_transaksi:    number
  total_pendapatan:    number
}

export interface PendapatanSummaryFilters {
  year?:               number | null
  month?:              number | null
  jenisPendapatanId?:  string | null
  unitKerja?:          string | null
}

export function usePendapatanSummary(filters: PendapatanSummaryFilters = {}) {
  const [rows,    setRows]    = useState<PendapatanSummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const { year, month, jenisPendapatanId, unitKerja } = filters

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('vw_pendapatan_summary')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('year',  { ascending: false })
        .order('month', { ascending: false })
        .order('total_pendapatan', { ascending: false })

      if (year)               query = query.eq('year',  year)
      if (month)              query = query.eq('month', month)
      if (jenisPendapatanId)  query = query.eq('jenis_pendapatan_id', jenisPendapatanId)
      if (unitKerja)          query = query.eq('unit_kerja', unitKerja)

      const { data, error: err } = await query

      if (cancelled) return
      if (err) { setError(err.message); setLoading(false); return }

      setRows(
        (data ?? []).map(r => ({
          ...r,
          total_pendapatan: Number(r.total_pendapatan),
          jumlah_transaksi: Number(r.jumlah_transaksi),
        }))
      )
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [year, month, jenisPendapatanId, unitKerja])

  return { rows, loading, error }
}
