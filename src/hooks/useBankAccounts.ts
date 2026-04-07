import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DbBankAccount } from '../types/database'
import { queryCache, TTL } from '../lib/queryCache'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export function useBankAccounts(onlyActive = false) {
  const [accounts, setAccounts] = useState<DbBankAccount[]>([])
  const [loading, setLoading]   = useState(true)

  const fetch = useCallback((force = false) => {
    const cacheKey = `accounts:${onlyActive ? 'active' : 'all'}`
    if (!force) {
      const cached = queryCache.get<DbBankAccount[]>(cacheKey)
      if (cached) { setAccounts(cached); setLoading(false); return }
    }
    setLoading(true)
    let query = supabase
      .from('accounts')
      .select('id, tenant_id, bank_name, account_number, account_name, is_active, created_at')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .order('bank_name')
    if (onlyActive) query = query.eq('is_active', true)
    query.then(({ data }) => {
      const rows = (data ?? []) as DbBankAccount[]
      queryCache.set(cacheKey, rows, TTL.REFERENCE)
      setAccounts(rows)
      setLoading(false)
    })
  }, [onlyActive])

  const refetch = useCallback(() => {
    queryCache.invalidate('accounts:')
    fetch(true)
  }, [fetch])

  useEffect(() => { fetch() }, [fetch])

  return { accounts, loading, refetch }
}

export interface BankAccountInput {
  bank_name:      string
  account_number: string
  account_name:   string
}

export function useManageBankAccounts() {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function createAccount(input: BankAccountInput): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('accounts').insert({
      tenant_id:      TENANT_ID,
      bank_name:      input.bank_name.trim(),
      account_number: input.account_number.trim(),
      account_name:   input.account_name.trim(),
      is_active:      true,
    })
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate('accounts:')
    return null
  }

  async function updateAccount(id: string, input: BankAccountInput): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('accounts')
      .update({
        bank_name:      input.bank_name.trim(),
        account_number: input.account_number.trim(),
        account_name:   input.account_name.trim(),
      })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate('accounts:')
    return null
  }

  async function toggleActive(id: string, is_active: boolean): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('accounts')
      .update({ is_active })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate('accounts:')
    return null
  }

  async function deleteAccount(id: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate('accounts:')
    return null
  }

  return { createAccount, updateAccount, toggleActive, deleteAccount, saving, error }
}
