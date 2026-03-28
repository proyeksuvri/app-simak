import { useState, useCallback } from 'react'
import type { Transaction } from '../types'
import type { DbTransaction } from '../types/database'
import { supabase } from '../lib/supabase'

export type LaporanType = 'bku-harian' | 'bku-bulanan' | 'konsolidasi' | 'penerimaan' | 'per-unit'

function mapTx(r: DbTransaction & { approved_by?: string; rejection_note?: string }): Transaction {
  return {
    id:            r.id,
    tanggal:       r.transaction_date,
    deskripsi:     r.description ?? '',
    kategori:      (r.kode_rekening ?? 'PNBP Lainnya') as Transaction['kategori'],
    nominal:       Number(r.amount),
    type:          r.type === 'IN' ? 'penerimaan' : 'pengeluaran',
    status:        r.status === 'APPROVED' || r.status === 'POSTED' ? 'terverifikasi'
                 : r.status === 'REJECTED'  ? 'ditolak'
                 : r.status === 'SUBMITTED' ? 'diajukan'
                 : 'pending',
    nomorBukti:    r.no_bukti ?? '-',
    unitId:        r.work_unit_id,
    createdBy:     r.created_by ?? '',
    approvedBy:    r.approved_by ?? null,
    rejectionNote: r.rejection_note ?? null,
  }
}

interface LaporanFilter {
  tahun:   number
  bulan?:  number     // 1-12, undefined = semua bulan
  unitId?: string
  type?:   'IN' | 'OUT'
}

export function useLaporan() {
  const [rows, setRows]       = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async (filter: LaporanFilter) => {
    setLoading(true)
    const start = filter.bulan
      ? `${filter.tahun}-${String(filter.bulan).padStart(2, '0')}-01`
      : `${filter.tahun}-01-01`
    const end = filter.bulan
      ? new Date(filter.tahun, filter.bulan, 0).toISOString().split('T')[0]
      : `${filter.tahun}-12-31`

    let q = supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: true })

    if (filter.unitId) q = q.eq('work_unit_id', filter.unitId)
    if (filter.type)   q = q.eq('type', filter.type)

    const { data } = await q
    setRows(
      ((data ?? []) as DbTransaction[])
        .filter(r => r.type !== 'TRANSFER')
        .map(r => mapTx(r as any))
    )
    setLoading(false)
  }, [])

  return { rows, loading, fetch }
}
