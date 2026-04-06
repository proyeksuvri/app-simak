import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DbSumberPendapatanBisnis } from '../types/database'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export function useSumberPendapatanBisnis() {
  const [items,   setItems]   = useState<DbSumberPendapatanBisnis[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = () => {
    supabase
      .from('sumber_pendapatan_bisnis')
      .select('id, tenant_id, name, kode, deskripsi, created_at, deleted_at')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => {
        setItems((data ?? []) as DbSumberPendapatanBisnis[])
        setLoading(false)
      })
  }

  useEffect(() => { fetch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { items, loading, refetch: fetch }
}

export function useManageSumberPendapatanBisnis() {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function create(name: string, kode?: string, deskripsi?: string): Promise<string | null> {
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('sumber_pendapatan_bisnis').insert({
      tenant_id: TENANT_ID,
      name:      name.trim(),
      kode:      kode?.trim()      || null,
      deskripsi: deskripsi?.trim() || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  async function update(id: string, name: string, kode?: string, deskripsi?: string): Promise<string | null> {
    setSaving(true); setError(null)
    const { error: err } = await supabase
      .from('sumber_pendapatan_bisnis')
      .update({ name: name.trim(), kode: kode?.trim() || null, deskripsi: deskripsi?.trim() || null })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  async function remove(id: string): Promise<string | null> {
    setSaving(true); setError(null)
    const { error: err } = await supabase
      .from('sumber_pendapatan_bisnis')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    return null
  }

  return { create, update, remove, saving, error }
}
