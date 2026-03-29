import { useState, useEffect, useCallback } from 'react'
import type { Transaction, TransactionType, TransactionStatus } from '../types'
import type { DbTransaction } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

interface FilterOptions {
  type?:    TransactionType
  status?:  TransactionStatus
  unitId?:  string
}

function mapStatus(s: string | null): TransactionStatus {
  if (s === 'APPROVED' || s === 'POSTED') return 'terverifikasi'
  if (s === 'REJECTED')                   return 'ditolak'
  if (s === 'SUBMITTED')                  return 'diajukan'
  return 'pending'  // DRAFT
}

function mapType(t: string): TransactionType {
  return t === 'IN' ? 'penerimaan' : 'pengeluaran'
}

export function useTransactions(filter: FilterOptions = {}) {
  const { tahunAnggaran } = useAppContext()
  const [transactions,    setTransactions]    = useState<Transaction[]>([])
  const [totalPenerimaan, setTotalPenerimaan] = useState(0)
  const [totalPengeluaran,setTotalPengeluaran]= useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    let q = supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .gte('transaction_date', `${tahunAnggaran}-01-01`)
      .lte('transaction_date', `${tahunAnggaran}-12-31`)
      .order('transaction_date', { ascending: false })

    if (filter.type === 'penerimaan') q = q.eq('type', 'IN')
    if (filter.type === 'pengeluaran') q = q.eq('type', 'OUT')
    if (filter.unitId) q = q.eq('work_unit_id', filter.unitId)

    const { data } = await q
    const rows = (data ?? []) as DbTransaction[]

    const mapped: Transaction[] = rows
      .filter(r => r.type !== 'TRANSFER')
      .map(r => ({
        id:             r.id,
        tanggal:        r.transaction_date,
        deskripsi:      r.description ?? '',
        kategori:       (r.kode_rekening ?? 'PNBP Lainnya') as Transaction['kategori'],
        nominal:        Number(r.amount),
        type:           mapType(r.type),
        status:         mapStatus(r.status),
        nomorBukti:      r.no_bukti ?? '-',
        unitId:          r.work_unit_id,
        sourceAccountId: r.source_account_id ?? null,
        createdBy:       r.created_by ?? '',
        approvedBy:     (r as any).approved_by ?? null,
        rejectionNote:  (r as any).rejection_note ?? null,
      }))
      .filter(t => {
        if (filter.status && t.status !== filter.status) return false
        return true
      })

    setTransactions(mapped)

    // Aggregates from full year (all statuses = terverifikasi)
    const { data: agg } = await supabase
      .from('transactions')
      .select('type, amount')
      .is('deleted_at', null)
      .in('status', ['APPROVED', 'POSTED'])
      .gte('transaction_date', `${tahunAnggaran}-01-01`)
      .lte('transaction_date', `${tahunAnggaran}-12-31`)

    let masuk = 0, keluar = 0
    for (const row of (agg ?? []) as Pick<DbTransaction, 'type' | 'amount'>[]) {
      if (row.type === 'IN')  masuk  += Number(row.amount)
      if (row.type === 'OUT') keluar += Number(row.amount)
    }
    setTotalPenerimaan(masuk)
    setTotalPengeluaran(keluar)
    setLoading(false)
  }, [tahunAnggaran, filter.type, filter.status, filter.unitId])

  useEffect(() => { load() }, [load])

  return { transactions, totalPenerimaan, totalPengeluaran, loading, refetch: load }
}
