import { useState, useEffect, useCallback } from 'react'
import type { DbWorkUnit } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'
import { queryCache, TTL } from '../lib/queryCache'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export function useWorkUnits() {
  const { currentUser } = useAppContext()
  const [workUnits, setWorkUnits] = useState<DbWorkUnit[]>([])
  const [loading, setLoading] = useState(true)

  const tenantId = (currentUser as { tenantId?: string }).tenantId ?? TENANT_ID

  const load = useCallback((force = false) => {
    const cacheKey = `work_units:${tenantId}`
    if (!force) {
      const cached = queryCache.get<DbWorkUnit[]>(cacheKey)
      if (cached) { setWorkUnits(cached); setLoading(false); return }
    }
    setLoading(true)
    supabase
      .from('work_units')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => {
        const rows = (data ?? []) as DbWorkUnit[]
        queryCache.set(cacheKey, rows, TTL.REFERENCE)
        setWorkUnits(rows)
        setLoading(false)
      })
  }, [tenantId])

  const refetch = useCallback(() => {
    queryCache.invalidate('work_units:')
    load(true)
  }, [load])

  useEffect(() => { load() }, [load])

  return { workUnits, loading, refetch }
}

export function useManageWorkUnits() {
  const { currentUser } = useAppContext()
  const tenantId = (currentUser as { tenantId?: string }).tenantId ?? TENANT_ID

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createWorkUnit = async (name: string, parentId?: string | null): Promise<string | null> => {
    setSaving(true); setError(null)
    const { error: err } = await supabase
      .from('work_units')
      .insert({ tenant_id: tenantId, name: name.trim(), parent_id: parentId ?? null })
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate('work_units:')
    return null
  }

  const updateWorkUnit = async (id: string, name: string, parentId?: string | null): Promise<string | null> => {
    setSaving(true); setError(null)
    const { error: err } = await supabase
      .from('work_units')
      .update({ name: name.trim(), parent_id: parentId ?? null, updated_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate('work_units:')
    return null
  }

  const deleteWorkUnit = async (id: string): Promise<string | null> => {
    setSaving(true); setError(null)
    const { error: err } = await supabase
      .from('work_units')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    queryCache.invalidate('work_units:')
    return null
  }

  return { createWorkUnit, updateWorkUnit, deleteWorkUnit, saving, error }
}
