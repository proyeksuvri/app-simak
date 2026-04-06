import { useState, useEffect } from 'react'
import type { DbPeriod } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export function usePeriods() {
  const { currentUser, tahunAnggaran } = useAppContext()
  const [periods, setPeriods]           = useState<DbPeriod[]>([])
  const [activePeriod, setActivePeriod] = useState<DbPeriod | null>(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const tenantId = (currentUser as { tenantId?: string }).tenantId
      ?? '11111111-1111-1111-1111-111111111111'

    supabase
      .from('periods')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('year', tahunAnggaran)
      .order('month')
      .then(({ data }) => {
        const rows = (data ?? []) as DbPeriod[]
        setPeriods(rows)
        // Active period = most recent open period this year
        const open = rows.filter(p => !p.is_closed)
        setActivePeriod(open.at(-1) ?? rows.at(-1) ?? null)
        setLoading(false)
      })
  }, [currentUser, tahunAnggaran])

  return { periods, activePeriod, loading }
}
