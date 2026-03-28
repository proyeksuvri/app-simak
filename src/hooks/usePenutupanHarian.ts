import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

export interface RingkasanHarian {
  saldoAwal:    number   // saldo akhir kemarin
  totalMasuk:   number   // penerimaan hari ini (APPROVED/POSTED)
  totalKeluar:  number   // pengeluaran hari ini (APPROVED/POSTED)
  saldoAkhir:   number
}

export interface ClosingLog {
  id:           string
  closingDate:  string
  saldoAkhir:   number
  totalMasuk:   number
  totalKeluar:  number
  tutupOleh:    string   // user_id
}

export function usePenutupanHarian() {
  const { tahunAnggaran } = useAppContext()
  const [ringkasan, setRingkasan]   = useState<RingkasanHarian | null>(null)
  const [riwayat,   setRiwayat]     = useState<ClosingLog[]>([])
  const [loading,   setLoading]     = useState(false)
  const [tenantId,  setTenantId]    = useState<string | null>(null)
  const [periodId,  setPeriodId]    = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]!
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!

    // Get tenant + period aktif
    const { data: ut } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single()

    const tid = ut?.tenant_id ?? null
    setTenantId(tid)

    const { data: periodData } = await supabase
      .from('periods')
      .select('id')
      .eq('is_closed', false)
      .eq('year', tahunAnggaran)
      .order('month', { ascending: false })
      .limit(1)
      .single()

    setPeriodId(periodData?.id ?? null)

    // Saldo awal = semua transaksi APPROVED/POSTED sebelum hari ini (year-to-date)
    const { data: prevData } = await supabase
      .from('transactions')
      .select('type, amount')
      .is('deleted_at', null)
      .in('status', ['APPROVED', 'POSTED'])
      .gte('transaction_date', `${tahunAnggaran}-01-01`)
      .lte('transaction_date', yesterday)

    let saldoAwal = 0
    for (const r of (prevData ?? []) as { type: string; amount: string }[]) {
      saldoAwal += r.type === 'IN' ? Number(r.amount) : -Number(r.amount)
    }

    // Transaksi hari ini
    const { data: todayData } = await supabase
      .from('transactions')
      .select('type, amount')
      .is('deleted_at', null)
      .in('status', ['APPROVED', 'POSTED'])
      .eq('transaction_date', today)

    let totalMasuk = 0, totalKeluar = 0
    for (const r of (todayData ?? []) as { type: string; amount: string }[]) {
      if (r.type === 'IN')  totalMasuk  += Number(r.amount)
      if (r.type === 'OUT') totalKeluar += Number(r.amount)
    }

    setRingkasan({
      saldoAwal,
      totalMasuk,
      totalKeluar,
      saldoAkhir: saldoAwal + totalMasuk - totalKeluar,
    })

    // Riwayat closing (5 terakhir)
    const { data: logData } = await supabase
      .from('closing_logs')
      .select('id, closing_date, saldo_akhir, total_masuk, total_keluar, user_id')
      .eq('tenant_id', tid ?? '')
      .order('closing_date', { ascending: false })
      .limit(5)

    setRiwayat((logData ?? []).map((r: any) => ({
      id:          r.id,
      closingDate: r.closing_date ?? '',
      saldoAkhir:  Number(r.saldo_akhir ?? 0),
      totalMasuk:  Number(r.total_masuk ?? 0),
      totalKeluar: Number(r.total_keluar ?? 0),
      tutupOleh:   r.user_id ?? '',
    })))

    setLoading(false)
  }, [tahunAnggaran])

  const tutupBuku = async (): Promise<string | null> => {
    if (!ringkasan) return 'Data belum dimuat'
    if (!tenantId)  return 'Tenant tidak ditemukan'

    const today = new Date().toISOString().split('T')[0]!

    // Cek sudah ditutup hari ini
    const { data: existing } = await supabase
      .from('closing_logs')
      .select('id')
      .eq('closing_date', today)
      .eq('tenant_id', tenantId)
      .single()

    if (existing) return 'BKU hari ini sudah ditutup.'

    const { error } = await supabase.from('closing_logs').insert({
      closing_date: today,
      action:       'DAILY_CLOSE',
      saldo_awal:   ringkasan.saldoAwal,
      total_masuk:  ringkasan.totalMasuk,
      total_keluar: ringkasan.totalKeluar,
      saldo_akhir:  ringkasan.saldoAkhir,
      period_id:    periodId,
      tenant_id:    tenantId,
      user_id:      (await supabase.auth.getUser()).data.user?.id,
    })

    if (error) return error.message
    await load()
    return null
  }

  return { ringkasan, riwayat, loading, load, tutupBuku }
}
