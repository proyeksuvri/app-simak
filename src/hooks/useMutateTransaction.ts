import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export interface TransactionInput {
  type:                'IN' | 'OUT'
  transaction_date:    string          // YYYY-MM-DD
  no_bukti:            string
  description:         string
  kode_rekening:       string
  amount:              number
  work_unit_id:        string | null
  period_id:           string | null
  source_account_id:      string | null   // untuk BPN: rekening tujuan; BPK: rekening asal
  jenis_pendapatan_id:    string | null   // hanya BPN: FK ke funding_sources
  sumber_pendapatan_id:   string | null   // hanya BPN: FK ke sumber_pendapatan_bisnis
}

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

/** Lookup revenue_category_id berdasarkan nama kategori */
async function getRevenueCategoryId(name: string): Promise<string | null> {
  if (!name) return null
  const { data } = await supabase
    .from('revenue_categories')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .eq('name', name)
    .is('deleted_at', null)
    .single()
  return (data as { id: string } | null)?.id ?? null
}

export function useMutateTransaction() {
  const { session } = useAppContext()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function insertTransaction(input: TransactionInput): Promise<boolean> {
    setSaving(true)
    setError(null)

    try {
      const revenueCategoryId = input.type === 'IN'
        ? await getRevenueCategoryId(input.kode_rekening)
        : null

      const { error: err } = await supabase.from('transactions').insert({
        tenant_id:              TENANT_ID,
        type:                   input.type,
        status:                 'DRAFT',
        transaction_date:       input.transaction_date,
        no_bukti:               input.no_bukti || null,
        description:            input.description || null,
        kode_rekening:          input.kode_rekening || null,
        amount:                 input.amount,
        work_unit_id:           input.work_unit_id || null,
        period_id:              input.period_id || null,
        source_account_id:      input.type === 'OUT' ? (input.source_account_id || null) : null,
        destination_account_id: input.type === 'IN'  ? (input.source_account_id || null) : null,
        revenue_category_id:    revenueCategoryId,
        jenis_pendapatan_id:    input.type === 'IN' ? (input.jenis_pendapatan_id ?? null) : null,
        sumber_pendapatan_id:   input.type === 'IN' ? (input.sumber_pendapatan_id ?? null) : null,
        created_by:             session?.user?.id ?? null,
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
      const revenueCategoryId = (input.type === 'IN' && input.kode_rekening)
        ? await getRevenueCategoryId(input.kode_rekening)
        : undefined

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
          ...(input.source_account_id !== undefined && input.type === 'OUT' && { source_account_id:      input.source_account_id || null }),
          ...(input.source_account_id !== undefined && input.type === 'IN'  && { destination_account_id: input.source_account_id || null }),
          ...(revenueCategoryId !== undefined && { revenue_category_id: revenueCategoryId }),
          ...(input.jenis_pendapatan_id  !== undefined && { jenis_pendapatan_id:  input.jenis_pendapatan_id  || null }),
          ...(input.sumber_pendapatan_id !== undefined && { sumber_pendapatan_id: input.sumber_pendapatan_id || null }),
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

  async function deleteTransaction(id: string): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (err) { setError(err.message); return false }
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { insertTransaction, updateTransaction, deleteTransaction, saving, error }
}
