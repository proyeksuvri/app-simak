import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DbRevenueCategory } from '../types/database'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export function useRevenueCategories() {
  const [categories, setCategories] = useState<DbRevenueCategory[]>([])
  const [loading, setLoading]       = useState(true)

  const fetch = () => {
    supabase
      .from('revenue_categories')
      .select('id, tenant_id, name, business_unit_id, updated_at, deleted_at')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => {
        setCategories((data ?? []) as DbRevenueCategory[])
        setLoading(false)
      })
  }

  useEffect(() => { fetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { categories, loading, refetch: fetch }
}

export function useManageRevenueCategories() {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function createCategory(name: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('revenue_categories').insert({
      tenant_id: TENANT_ID,
      name:      name.trim(),
    })
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  async function updateCategory(id: string, name: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('revenue_categories')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  async function deleteCategory(id: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('revenue_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  return { createCategory, updateCategory, deleteCategory, saving, error }
}
