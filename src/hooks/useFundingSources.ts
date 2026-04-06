import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DbFundingSource } from '../types/database'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export function useFundingSources() {
  const [fundingSources, setFundingSources] = useState<DbFundingSource[]>([])
  const [loading, setLoading]              = useState(true)

  const fetch = () => {
    supabase
      .from('funding_sources')
      .select('id, tenant_id, name, kode_akun')
      .eq('tenant_id', TENANT_ID)
      .order('name')
      .then(({ data }) => {
        setFundingSources((data ?? []) as DbFundingSource[])
        setLoading(false)
      })
  }

  useEffect(() => { fetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { fundingSources, loading, refetch: fetch }
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
    return null
  }

  return { createFundingSource, updateFundingSource, deleteFundingSource, saving, error }
}
