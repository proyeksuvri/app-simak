import { useState, useEffect, useCallback } from 'react'
import type { DbTransaction } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export type JenisUPTUP = 'UP' | 'TUP'

export interface UPTUPItem {
  id:         string
  tanggal:    string
  jenis:      JenisUPTUP
  unitNama:   string | null
  nominal:    number
  deskripsi:  string
  nomorBukti: string
  status:     'terverifikasi' | 'diajukan' | 'pending' | 'ditolak'
}

function mapStatus(s: string | null): UPTUPItem['status'] {
  if (s === 'APPROVED' || s === 'POSTED') return 'terverifikasi'
  if (s === 'SUBMITTED')                  return 'diajukan'
  if (s === 'REJECTED')                   return 'ditolak'
  return 'pending'
}

export function useUPTUP() {
  const { tahunAnggaran } = useAppContext()
  const [items, setItems]     = useState<UPTUPItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    // UP/TUP = transaksi OUT dengan kode_rekening berisi 'Pencairan UP' atau 'Pencairan TUP'
    const { data } = await supabase
      .from('transactions')
      .select('*, work_units(name)')
      .is('deleted_at', null)
      .eq('type', 'OUT')
      .or('kode_rekening.ilike.%Pencairan UP%,kode_rekening.ilike.%Pencairan TUP%')
      .gte('transaction_date', `${tahunAnggaran}-01-01`)
      .lte('transaction_date', `${tahunAnggaran}-12-31`)
      .order('transaction_date', { ascending: false })

    const rows = (data ?? []) as (DbTransaction & { work_units?: { name: string } | null })[]

    setItems(rows.map(r => ({
      id:         r.id,
      tanggal:    r.transaction_date,
      jenis:      (r.kode_rekening ?? '').toLowerCase().includes('tup') ? 'TUP' : 'UP',
      unitNama:   r.work_units?.name ?? null,
      nominal:    Number(r.amount),
      deskripsi:  r.description ?? '',
      nomorBukti: r.no_bukti ?? '-',
      status:     mapStatus(r.status),
    })))

    setLoading(false)
  }, [tahunAnggaran])

  useEffect(() => { load() }, [load])

  return { items, loading, refetch: load }
}
