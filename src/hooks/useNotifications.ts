import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

export interface NotificationItem {
  id:               string
  no_bukti:         string
  description:      string
  amount:           number
  transaction_date: string
  type:             'IN' | 'OUT'
}

interface UseNotificationsResult {
  items:   NotificationItem[]
  count:   number
  loading: boolean
  refresh: () => void
}

export function useNotifications(
  role: UserRole,
  unitId: string | null,
): UseNotificationsResult {
  const [items,   setItems]   = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const isBPN = role === 'bendahara_penerimaan'
      const isBPK = role === 'bendahara_pembantu'

      let q = supabase
        .from('transactions')
        .select('id, no_bukti, description, amount, transaction_date, type')
        .eq('status', 'SUBMITTED')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .limit(20)

      if (isBPN) q = q.eq('type', 'IN')
      if (isBPK) {
        q = q.eq('type', 'OUT')
        if (unitId) q = q.eq('work_unit_id', unitId)
      }

      const { data } = await q
      setItems((data as NotificationItem[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [role, unitId])

  useEffect(() => {
    fetch()

    // Real-time: re-fetch when any transaction changes status
    const channel = supabase
      .channel('notif-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => { fetch() },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { items, count: items.length, loading, refresh: fetch }
}
