import { useState, useEffect, useCallback } from 'react'
import type { BKUType, BKUEntryWithSaldo } from '../types'
import type { DbTransaction } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'
import { queryCache, TTL } from '../lib/queryCache'

const COLS = [
  'id', 'type', 'amount', 'transaction_date', 'no_bukti', 'description',
  'status', 'work_unit_id', 'source_account_id', 'destination_account_id',
  'jenis_pendapatan_id', 'kode_rekening',
].join(',')

function buildEntries(rows: DbTransaction[], type: BKUType): { withSaldo: BKUEntryWithSaldo[]; saldo: number } {
  let saldo = 0
  const withSaldo: BKUEntryWithSaldo[] = rows.map(r => {
    const debit  = r.type === 'IN'  ? Number(r.amount) : 0
    const kredit = r.type === 'OUT' ? Number(r.amount) : 0
    saldo = saldo + debit - kredit
    return {
      id:                r.id,
      tanggal:           r.transaction_date,
      nomorBukti:        r.no_bukti ?? '-',
      uraian:            r.description ?? '',
      debit,
      kredit,
      bkuType:           type,
      unitId:            r.work_unit_id,
      saldo,
      status:            r.status,
      kategori:          r.kode_rekening,
      sourceAccountId:   r.type === 'IN' ? r.destination_account_id : r.source_account_id,
      jenisPendapatanId: r.jenis_pendapatan_id,
    }
  })
  return { withSaldo, saldo }
}

export function useBKU(type: BKUType, unitId?: string) {
  const { tahunAnggaran } = useAppContext()
  const [entries,    setEntries]    = useState<BKUEntryWithSaldo[]>([])
  const [saldoAkhir, setSaldoAkhir] = useState(0)
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    const cacheKey = `bku:${type}:${unitId ?? ''}:${tahunAnggaran}`

    // Serve from cache instantly, then still refresh in background after 30s
    const cached = queryCache.get<{ withSaldo: BKUEntryWithSaldo[]; saldo: number }>(cacheKey)
    if (cached) {
      setEntries(cached.withSaldo)
      setSaldoAkhir(cached.saldo)
      setLoading(false)
      return
    }

    setLoading(true)

    let q = supabase
      .from('transactions')
      .select(COLS)
      .is('deleted_at', null)
      .in('status', ['APPROVED', 'POSTED'])
      .gte('transaction_date', `${tahunAnggaran}-01-01`)
      .lte('transaction_date', `${tahunAnggaran}-12-31`)
      .order('transaction_date', { ascending: true })

    if (type === 'penerimaan') {
      q = q.eq('type', 'IN')
    } else if (type === 'induk') {
      q = q.is('work_unit_id', null)
    } else {
      q = q.eq('type', 'OUT')
      if (unitId) q = q.eq('work_unit_id', unitId)
    }

    const { data } = await q
    const rows = (data ?? []) as DbTransaction[]
    const result = buildEntries(rows, type)

    queryCache.set(cacheKey, result, TTL.TRANSACTIONS)
    setEntries(result.withSaldo)
    setSaldoAkhir(result.saldo)
    setLoading(false)
  }, [type, unitId, tahunAnggaran])

  useEffect(() => { load() }, [load])

  return { entries, saldoAkhir, loading }
}
