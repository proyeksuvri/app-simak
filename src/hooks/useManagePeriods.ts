import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export interface Period {
  id:       string
  code:     string
  year:     number
  month:    number
  semester: string | null
  isClosed: boolean
}

const BULAN = [
  '','Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

export function useManagePeriods() {
  const { tahunAnggaran } = useAppContext()
  const [periods, setPeriods]   = useState<Period[]>([])
  const [loading, setLoading]   = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // Get tenant
    const { data: ut } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single()

    if (ut) setTenantId(ut.tenant_id)

    const { data } = await supabase
      .from('periods')
      .select('*')
      .is('deleted_at', null)
      .eq('year', tahunAnggaran)
      .order('month', { ascending: true })

    setPeriods((data ?? []).map((r: any) => ({
      id:       r.id,
      code:     r.code,
      year:     r.year,
      month:    r.month,
      semester: r.semester,
      isClosed: r.is_closed,
    })))
    setLoading(false)
  }, [tahunAnggaran])

  useEffect(() => { load() }, [load])

  const openPeriod = async (month: number): Promise<string | null> => {
    if (!tenantId) return 'Tenant tidak ditemukan'
    const code = `${BULAN[month].slice(0, 3).toUpperCase()}-${tahunAnggaran}`
    const { error } = await supabase.from('periods').upsert({
      tenant_id: tenantId,
      year:      tahunAnggaran,
      month,
      code,
      is_closed: false,
    }, { onConflict: 'tenant_id,year,month' })
    if (error) return error.message
    await load()
    return null
  }

  const closePeriod = async (id: string): Promise<string | null> => {
    const { error } = await supabase
      .from('periods')
      .update({ is_closed: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return error.message
    await load()
    return null
  }

  return { periods, loading, openPeriod, closePeriod, refetch: load, BULAN }
}
