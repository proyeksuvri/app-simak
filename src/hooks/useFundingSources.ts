import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DbFundingSource } from '../types/database'
import { queryCache, TTL } from '../lib/queryCache'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'
const CACHE_KEY = 'funding_sources'

export function useFundingSources() {
  const [fundingSources, setFundingSources] = useState<DbFundingSource[]>([])
  const [loading, setLoading]              = useState(true)

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = queryCache.get<DbFundingSource[]>(CACHE_KEY)
      if (cached) { setFundingSources(cached); setLoading(false); return }
    }
    setLoading(true)
    supabase
      .from('funding_sources')
      .select('id, tenant_id, name, kode_akun')
      .eq('tenant_id', TENANT_ID)
      .order('name')
      .then(({ data }) => {
        const rows = (data ?? []) as DbFundingSource[]
        queryCache.set(CACHE_KEY, rows, TTL.REFERENCE)
        setFundingSources(rows)
        setLoading(false)
      })
  }, [])

  const refetch = useCallback(() => {
    queryCache.invalidate(CACHE_KEY)
    load(true)
  }, [load])

  useEffect(() => { load() }, [load])

  return { fundingSources, loading, refetch }
}

export function useManageFundingSources() {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function createFundingSource(name: string, kode_akun?: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('funding_sources').insert({
      tenant_id: TENANT_ID,
      name:      name.trim(),
      kode_akun: kode_akun?.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate(CACHE_KEY)
    return null
  }

  async function updateFundingSource(id: string, name: string, kode_akun?: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('funding_sources')
      .update({ name: name.trim(), kode_akun: kode_akun?.trim() || null })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate(CACHE_KEY)
    return null
  }

  async function deleteFundingSource(id: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('funding_sources')
      .delete()
      .eq('id', id)
    setSaving(false)
    if (err) {
      const msg = err.message.includes('foreign key')
        ? 'Tidak dapat dihapus — masih digunakan oleh transaksi atau rekening.'
        : err.message
      setError(msg)
      return msg
    }
    queryCache.invalidate(CACHE_KEY)
    return null
  }

  return { createFundingSource, updateFundingSource, deleteFundingSource, saving, error }
}
