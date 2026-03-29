import { useState, useEffect } from 'react'
import type { MetricCardData, ChartDataPoint, ApprovalItem } from '../types'
import type { DbTransaction, DbPeriod } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

const EMPTY_METRICS: MetricCardData[] = [
  { id: 'm1', label: 'Total Penerimaan',   value: 0, icon: 'trending_up',           trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm2', label: 'Total Pengeluaran',  value: 0, icon: 'trending_down',          trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm3', label: 'Saldo Kas',          value: 0, icon: 'account_balance_wallet', trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm4', label: 'Transaksi Verified', value: 0, icon: 'verified',               trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
]

export function useDashboardData() {
  const { tahunAnggaran, currentUser } = useAppContext()
  const [metrics,          setMetrics]   = useState<MetricCardData[]>(EMPTY_METRICS)
  const [chartData,        setChartData] = useState<ChartDataPoint[]>([])
  const [approvals,        setApprovals] = useState<ApprovalItem[]>([])
  const [deadlineTutupBuku,setDeadline]  = useState('')
  const [loading,          setLoading]   = useState(true)

  const role   = currentUser.role
  const unitId = currentUser.unitId
  const isGlobal = role === 'admin' || role === 'pimpinan'
  const isBPN    = role === 'bendahara_penerimaan'
  const isBPK    = role === 'bendahara_induk' || role === 'bendahara_pembantu'

  useEffect(() => {
    // Tunggu sampai user profile siap (bukan loading placeholder)
    if (!currentUser.id) return

    let cancelled = false

    async function load() {
      setLoading(true)

      const dateFrom = `${tahunAnggaran}-01-01`
      const dateTo   = `${tahunAnggaran}-12-31`

      // ── Helper: terapkan filter role ke query ──────────────────────────────
      function applyRoleFilter<T extends ReturnType<typeof supabase.from>>(q: T): T {
        if (isBPN) (q as any).eq('type', 'IN')
        if (isBPK) (q as any).eq('type', 'OUT')
        if (role === 'bendahara_pembantu' && unitId) (q as any).eq('work_unit_id', unitId)
        return q
      }

      // ── 1. Metric totals ───────────────────────────────────────────────────
      let aggQuery = supabase
        .from('transactions')
        .select('type, amount, status')
        .is('deleted_at', null)
        .in('status', ['APPROVED', 'POSTED'])
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)

      if (isBPN) aggQuery = aggQuery.eq('type', 'IN')
      if (isBPK) aggQuery = aggQuery.eq('type', 'OUT')
      if (role === 'bendahara_pembantu' && unitId) aggQuery = aggQuery.eq('work_unit_id', unitId)

      const { data: aggRaw } = await aggQuery
      if (cancelled) return

      const agg = (aggRaw ?? []) as Pick<DbTransaction, 'type' | 'amount' | 'status'>[]

      let totalMasuk = 0, totalKeluar = 0
      for (const r of agg) {
        if (r.type === 'IN')  totalMasuk  += Number(r.amount)
        if (r.type === 'OUT') totalKeluar += Number(r.amount)
      }
      const saldoKas = totalMasuk - totalKeluar

      // Metric cards berbeda tiap role
      if (isBPN) {
        setMetrics([
          { id: 'm1', label: 'Total Penerimaan',  value: totalMasuk, icon: 'trending_up',           trendDir: 'up',      trend: 0, subtitle: `TA ${tahunAnggaran}` },
          { id: 'm2', label: 'Saldo Penerimaan',  value: saldoKas,   icon: 'account_balance_wallet', trendDir: 'neutral', trend: 0, subtitle: 'Kas bersih' },
          { id: 'm3', label: 'BPN Terverifikasi', value: agg.length, icon: 'verified',               trendDir: 'neutral', trend: 0, subtitle: 'Sudah disetujui' },
          { id: 'm4', label: 'BPN Diproses',      value: agg.filter(r => r.status === 'POSTED').length, icon: 'task_alt', trendDir: 'neutral', trend: 0, subtitle: 'Sudah diposting' },
        ])
      } else if (isBPK) {
        setMetrics([
          { id: 'm1', label: 'Total Pengeluaran', value: totalKeluar, icon: 'trending_down',          trendDir: 'down',    trend: 0, subtitle: `TA ${tahunAnggaran}` },
          { id: 'm2', label: 'Sisa Kas',          value: -saldoKas,   icon: 'account_balance_wallet', trendDir: 'neutral', trend: 0, subtitle: 'Total sudah keluar' },
          { id: 'm3', label: 'BPK Terverifikasi', value: agg.length,  icon: 'verified',               trendDir: 'neutral', trend: 0, subtitle: 'Sudah disetujui' },
          { id: 'm4', label: 'BPK Diproses',      value: agg.filter(r => r.status === 'POSTED').length, icon: 'task_alt', trendDir: 'neutral', trend: 0, subtitle: 'Sudah diposting' },
        ])
      } else {
        // admin / pimpinan — semua data
        setMetrics([
          { id: 'm1', label: 'Total Penerimaan',   value: totalMasuk,   icon: 'trending_up',             trendDir: 'up',      trend: 0, subtitle: `TA ${tahunAnggaran}` },
          { id: 'm2', label: 'Total Pengeluaran',  value: totalKeluar,  icon: 'trending_down',            trendDir: 'down',    trend: 0, subtitle: `TA ${tahunAnggaran}` },
          { id: 'm3', label: 'Saldo Kas',          value: saldoKas,     icon: 'account_balance_wallet',   trendDir: 'neutral', trend: 0, subtitle: 'Kas bersih' },
          { id: 'm4', label: 'Transaksi Verified', value: agg.length,   icon: 'verified',                 trendDir: 'neutral', trend: 0, subtitle: 'Transaksi terposting' },
        ])
      }

      // ── 2. Chart bulanan ───────────────────────────────────────────────────
      let chartQuery = supabase
        .from('transactions')
        .select('type, amount, transaction_date')
        .is('deleted_at', null)
        .in('status', ['APPROVED', 'POSTED'])
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)

      if (isBPN) chartQuery = chartQuery.eq('type', 'IN')
      if (isBPK) chartQuery = chartQuery.eq('type', 'OUT')
      if (role === 'bendahara_pembantu' && unitId) chartQuery = chartQuery.eq('work_unit_id', unitId)

      const { data: chartRaw } = await chartQuery
      const chartRows = (chartRaw ?? []) as Pick<DbTransaction, 'type' | 'amount' | 'transaction_date'>[]

      if (!cancelled) {
        const byMonth: Record<string, { penerimaan: number; pengeluaran: number }> = {}
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

        for (const r of chartRows) {
          const m   = new Date(r.transaction_date).getMonth()
          const key = MONTHS[m]!
          if (!byMonth[key]) byMonth[key] = { penerimaan: 0, pengeluaran: 0 }
          if (r.type === 'IN')  byMonth[key]!.penerimaan  += Number(r.amount)
          if (r.type === 'OUT') byMonth[key]!.pengeluaran += Number(r.amount)
        }

        const points: ChartDataPoint[] = Object.entries(byMonth).map(([bulan, v]) => ({
          bulan,
          penerimaan:  v.penerimaan,
          pengeluaran: v.pengeluaran,
        }))
        setChartData(points)
      }

      // ── 3. Pending approvals (SUBMITTED) ──────────────────────────────────
      let pendingQuery = supabase
        .from('transactions')
        .select('id, no_bukti, description, amount, transaction_date, type, created_by')
        .eq('status', 'SUBMITTED')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .limit(10)

      // Bendahara hanya lihat pengajuan sesuai tipenya (untuk info saja)
      if (isBPN) pendingQuery = pendingQuery.eq('type', 'IN')
      if (isBPK) pendingQuery = pendingQuery.eq('type', 'OUT')
      if (role === 'bendahara_pembantu' && unitId) pendingQuery = pendingQuery.eq('work_unit_id', unitId)

      const { data: pendingRaw } = await pendingQuery
      const pending = (pendingRaw ?? []) as Pick<DbTransaction, 'id' | 'no_bukti' | 'description' | 'amount' | 'transaction_date' | 'type' | 'created_by'>[]

      const creatorIds = [...new Set(pending.map(r => r.created_by).filter(Boolean) as string[])]
      let userEmailMap: Record<string, string> = {}
      if (creatorIds.length > 0) {
        const { data: usersRaw } = await supabase
          .from('users')
          .select('id, email')
          .in('id', creatorIds)
        for (const u of (usersRaw ?? []) as { id: string; email: string }[]) {
          userEmailMap[u.id] = u.email
        }
      }

      if (!cancelled) {
        setApprovals(pending.map(r => ({
          id:        r.id,
          title:     r.no_bukti ?? r.description ?? '-',
          requestBy: r.created_by ? (userEmailMap[r.created_by] ?? r.created_by) : '-',
          dueDate:   r.transaction_date,
          priority:  'medium' as const,
          type:      r.type === 'IN' ? 'bpn' : 'bpk',
        })))
      }

      // ── 4. Deadline tutup buku ─────────────────────────────────────────────
      const { data: periodRaw } = await supabase
        .from('periods')
        .select('year, month')
        .eq('is_closed', false)
        .order('year',  { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .single()

      const period = periodRaw as Pick<DbPeriod, 'year' | 'month'> | null
      if (!cancelled && period) {
        const lastDay = new Date(period.year, period.month, 0)
        setDeadline(lastDay.toISOString().split('T')[0]!)
      }
    }

    load().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tahunAnggaran, currentUser.id, currentUser.role, currentUser.unitId])

  return { metrics, chartData, approvals, deadlineTutupBuku, loading, isBPN, isBPK, isGlobal }
}
