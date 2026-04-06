import { useState, useEffect } from 'react'
import type { DbWorkUnit } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export function useWorkUnits() {
  const { currentUser } = useAppContext()
  const [workUnits, setWorkUnits] = useState<DbWorkUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tenantId = (currentUser as { tenantId?: string }).tenantId
      ?? '11111111-1111-1111-1111-111111111111'

    supabase
      .from('work_units')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => {
        setWorkUnits((data ?? []) as DbWorkUnit[])
        setLoading(false)
      })
  }, [currentUser])

  return { workUnits, loading }
}
