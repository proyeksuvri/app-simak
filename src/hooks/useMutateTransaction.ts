import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export interface TransactionInput {
  type:             'IN' | 'OUT'
  transaction_date: string          // YYYY-MM-DD
  no_bukti:         string
  description:      string
  kode_rekening:    string
  amount:           number
  work_unit_id:     string | null
  period_id:        string | null
}

export function useMutateTransaction() {
  const { session } = useAppContext()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const tenantId = '11111111-1111-1111-1111-111111111111'

  async function insertTransaction(input: TransactionInput): Promise<boolean> {
    setSaving(true)
    setError(null)

    try {
      const { error: err } = await supabase.from('transactions').insert({
        tenant_id:        tenantId,
        type:             input.type,
        status:           'DRAFT',
        transaction_date: input.transaction_date,
        no_bukti:         input.no_bukti || null,
        description:      input.description || null,
        kode_rekening:    input.kode_rekening || null,
        amount:           input.amount,
        work_unit_id:     input.work_unit_id || null,
        period_id:        input.period_id || null,
        created_by:       session?.user?.id ?? null,
      })

      if (err) {
        console.error('[insertTransaction] Supabase error:', err)
        setError(err.message)
        return false
      }
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan tidak terduga'
      console.error('[insertTransaction] Exception:', e)
      setError(msg)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function updateTransaction(id: string, input: Partial<TransactionInput>): Promise<boolean> {
    setSaving(true)
    setError(null)

    try {
      const { error: err } = await supabase
        .from('transactions')
        .update({
          ...(input.transaction_date !== undefined && { transaction_date: input.transaction_date }),
          ...(input.no_bukti         !== undefined && { no_bukti:         input.no_bukti || null }),
          ...(input.description      !== undefined && { description:      input.description || null }),
          ...(input.kode_rekening    !== undefined && { kode_rekening:    input.kode_rekening || null }),
          ...(input.amount           !== undefined && { amount:           input.amount }),
          ...(input.work_unit_id     !== undefined && { work_unit_id:     input.work_unit_id || null }),
          ...(input.period_id        !== undefined && { period_id:        input.period_id || null }),
        })
        .eq('id', id)

      if (err) {
        console.error('[updateTransaction] Supabase error:', err)
        setError(err.message)
        return false
      }
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan tidak terduga'
      console.error('[updateTransaction] Exception:', e)
      setError(msg)
      return false
    } finally {
      setSaving(false)
    }
  }

  return { insertTransaction, updateTransaction, saving, error }
}
