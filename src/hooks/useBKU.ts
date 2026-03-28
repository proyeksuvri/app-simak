import { useState, useEffect, useCallback } from 'react'
import type { BKUType, BKUEntryWithSaldo } from '../types'
import type { DbTransaction } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export function useBKU(type: BKUType, unitId?: string) {
  const { tahunAnggaran } = useAppContext()
  const [entries,    setEntries]    = useState<BKUEntryWithSaldo[]>([])
  const [saldoAkhir, setSaldoAkhir] = useState(0)
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    // BKU Penerimaan: IN transactions
    // BKU Induk: both IN and OUT (pusat = no work_unit_id)
    // BKU Pembantu: OUT transactions for a specific unit
    let q = supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .in('status', ['APPROVED', 'POSTED'])
      .gte('transaction_date', `${tahunAnggaran}-01-01`)
      .lte('transaction_date', `${tahunAnggaran}-12-31`)
      .order('transaction_date', { ascending: true })

    if (type === 'penerimaan') {
      q = q.eq('type', 'IN')
    } else if (type === 'induk') {
      // Induk = semua transaksi pusat (tidak ada work_unit_id)
      q = q.is('work_unit_id', null)
    } else {
      // Pembantu = transaksi OUT untuk unit tertentu
      q = q.eq('type', 'OUT')
      if (unitId) q = q.eq('work_unit_id', unitId)
    }

    const { data } = await q
    const rows = (data ?? []) as DbTransaction[]

    let saldo = 0
    const withSaldo: BKUEntryWithSaldo[] = rows.map(r => {
      const debit  = r.type === 'IN'  ? Number(r.amount) : 0
      const kredit = r.type === 'OUT' ? Number(r.amount) : 0
      saldo = saldo + debit - kredit
      return {
        id:         r.id,
        tanggal:    r.transaction_date,
        nomorBukti: r.no_bukti ?? '-',
        uraian:     r.description ?? '',
        debit,
        kredit,
        bkuType:    type,
        unitId:     r.work_unit_id,
        saldo,
      }
    })

    setEntries(withSaldo)
    setSaldoAkhir(saldo)
    setLoading(false)
  }, [type, unitId, tahunAnggaran])

  useEffect(() => { load() }, [load])

  return { entries, saldoAkhir, loading }
}
