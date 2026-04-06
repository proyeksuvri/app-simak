import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export interface BankStatement {
  id:            string
  statementDate: string
  description:   string
  debit:         number
  credit:        number
}

export interface RekonsiliasiData {
  bkuSaldo:   number
  bankSaldo:  number
  selisih:    number
  bkuRows:    { tanggal: string; deskripsi: string; masuk: number; keluar: number }[]
  bankRows:   BankStatement[]
}

export function useRekonsiliasi(bulan: number) {
  const { tahunAnggaran } = useAppContext()
  const [data,    setData]    = useState<RekonsiliasiData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    const start = `${tahunAnggaran}-${String(bulan).padStart(2, '0')}-01`
    const lastDay = new Date(tahunAnggaran, bulan, 0).getDate()
    const end   = `${tahunAnggaran}-${String(bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Fetch BKU transactions (APPROVED/POSTED only)
    const { data: txData } = await supabase
      .from('transactions')
      .select('transaction_date, description, type, amount')
      .is('deleted_at', null)
      .in('status', ['APPROVED', 'POSTED'])
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: true })

    const bkuRows = (txData ?? []).map((r: any) => ({
      tanggal:   r.transaction_date as string,
      deskripsi: r.description as string ?? '',
      masuk:     r.type === 'IN'  ? Number(r.amount) : 0,
      keluar:    r.type === 'OUT' ? Number(r.amount) : 0,
    }))

    const bkuSaldo = bkuRows.reduce((s, r) => s + r.masuk - r.keluar, 0)

    // Fetch bank statements
    const { data: bankData } = await supabase
      .from('bank_statements')
      .select('*')
      .is('deleted_at', null)
      .gte('statement_date', start)
      .lte('statement_date', end)
      .order('statement_date', { ascending: true })

    const bankRows: BankStatement[] = (bankData ?? []).map((r: any) => ({
      id:            r.id,
      statementDate: r.statement_date,
      description:   r.description,
      debit:         Number(r.debit),
      credit:        Number(r.credit),
    }))

    const bankSaldo = bankRows.reduce((s, r) => s + r.credit - r.debit, 0)

    setData({ bkuSaldo, bankSaldo, selisih: bkuSaldo - bankSaldo, bkuRows, bankRows })
    setLoading(false)
  }, [tahunAnggaran, bulan])

  const addBankStatement = async (row: Omit<BankStatement, 'id'> & { periodId?: string }) => {
    const { data: tenantData } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single()

    if (!tenantData) return 'Gagal mendapatkan tenant'

    const { error } = await supabase.from('bank_statements').insert({
      tenant_id:      tenantData.tenant_id,
      statement_date: row.statementDate,
      description:    row.description,
      debit:          row.debit,
      credit:         row.credit,
    })
    if (error) return error.message
    await load()
    return null
  }

  const deleteBankStatement = async (id: string) => {
    const { error } = await supabase
      .from('bank_statements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return error.message
    await load()
    return null
  }

  return { data, loading, load, addBankStatement, deleteBankStatement }
}
