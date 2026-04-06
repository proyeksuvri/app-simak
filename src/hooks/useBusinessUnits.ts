import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DbBusinessUnit } from '../types/database'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export function useBusinessUnits() {
  const [businessUnits, setBusinessUnits] = useState<DbBusinessUnit[]>([])
  const [loading, setLoading]             = useState(true)

  const fetch = () => {
    supabase
      .from('business_units')
      .select('id, tenant_id, name')
      .eq('tenant_id', TENANT_ID)
      .order('name')
      .then(({ data }) => {
        setBusinessUnits((data ?? []) as DbBusinessUnit[])
        setLoading(false)
      })
  }

  useEffect(() => { fetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { businessUnits, loading, refetch: fetch }
}

export function useManageBusinessUnits() {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function createBusinessUnit(name: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('business_units').insert({
      tenant_id: TENANT_ID,
      name:      name.trim(),
    })
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  async function updateBusinessUnit(id: string, name: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('business_units')
      .update({ name: name.trim() })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  async function deleteBusinessUnit(id: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('business_units')
      .delete()
      .eq('id', id)
    setSaving(false)
    if (err) {
      const msg = err.message.includes('foreign key')
        ? 'Tidak dapat dihapus — masih digunakan oleh kategori penerimaan.'
        : err.message
      setError(msg)
      return msg
    }
    return null
  }

  return { createBusinessUnit, updateBusinessUnit, deleteBusinessUnit, saving, error }
}
