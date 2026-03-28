import { useState, useEffect } from 'react'
import type { MetricCardData, ChartDataPoint, ApprovalItem } from '../types'
import type { DbTransaction, DbPeriod } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

const EMPTY_METRICS: MetricCardData[] = [
  { id: 'm1', label: 'Total Penerimaan', value: 0, icon: 'trending_up',           trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm2', label: 'Total Pengeluaran',value: 0, icon: 'trending_down',          trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm3', label: 'Saldo Kas',        value: 0, icon: 'account_balance_wallet', trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm4', label: 'Transaksi Verified',value:0, icon: 'verified',               trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
]

export function useDashboardData() {
  const { tahunAnggaran } = useAppContext()
  const [metrics,   setMetrics]   = useState<MetricCardData[]>(EMPTY_METRICS)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [deadlineTutupBuku, setDeadline] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      // 1. Aggregate totals for metrics
      const { data: aggRaw } = await supabase
        .from('transactions')
        .select('type, amount, status')
        .is('deleted_at', null)
        .in('status', ['APPROVED', 'POSTED'])
        .gte('transaction_date', `${tahunAnggaran}-01-01`)
        .lte('transaction_date', `${tahunAnggaran}-12-31`)

      if (cancelled) return

      const agg = (aggRaw ?? []) as Pick<DbTransaction, 'type' | 'amount' | 'status'>[]

      let totalMasuk = 0, totalKeluar = 0
      for (const r of agg) {
        if (r.type === 'IN')  totalMasuk  += Number(r.amount)
        if (r.type === 'OUT') totalKeluar += Number(r.amount)
      }
      const saldoKas = totalMasuk - totalKeluar

      setMetrics([
        { id: 'm1', label: 'Total Penerimaan',  value: totalMasuk,   icon: 'trending_up',             trendDir: 'up',      trend: 0, subtitle: `TA ${tahunAnggaran}` },
        { id: 'm2', label: 'Total Pengeluaran', value: totalKeluar,  icon: 'trending_down',            trendDir: 'down',    trend: 0, subtitle: `TA ${tahunAnggaran}` },
        { id: 'm3', label: 'Saldo Kas',         value: saldoKas,     icon: 'account_balance_wallet',   trendDir: 'neutral', trend: 0, subtitle: 'Kas bersih' },
        { id: 'm4', label: 'Transaksi Verified',value: agg.length,   icon: 'verified',                 trendDir: 'neutral', trend: 0, subtitle: 'Transaksi terposting' },
      ])

      // 2. Chart 6 bulan: group by month
      const { data: chartRaw } = await supabase
        .from('transactions')
        .select('type, amount, transaction_date')
        .is('deleted_at', null)
        .in('status', ['APPROVED', 'POSTED'])
        .gte('transaction_date', `${tahunAnggaran}-01-01`)
        .lte('transaction_date', `${tahunAnggaran}-12-31`)

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

      // 3. Pending approvals (SUBMITTED transactions)
      const { data: pendingRaw } = await supabase
        .from('transactions')
        .select('id, no_bukti, description, amount, transaction_date, type')
        .eq('status', 'SUBMITTED')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .limit(10)

      const pending = (pendingRaw ?? []) as Pick<DbTransaction, 'id' | 'no_bukti' | 'description' | 'amount' | 'transaction_date' | 'type'>[]

      if (!cancelled) {
        setApprovals(pending.map(r => ({
          id:        r.id,
          title:     r.no_bukti ?? r.description ?? '-',
          requestBy: '-',
          dueDate:   r.transaction_date,
          priority:  'medium' as const,
          type:      r.type === 'IN' ? 'bpn' : 'bpk',
        })))
      }

      // 4. Deadline tutup buku from periods
      const { data: periodRaw } = await supabase
        .from('periods')
        .select('year, month')
        .eq('is_closed', false)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .single()

      const period = periodRaw as Pick<DbPeriod, 'year' | 'month'> | null

      if (!cancelled && period) {
        const lastDay = new Date(period.year, period.month, 0)
        setDeadline(lastDay.toISOString().split('T')[0]!)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tahunAnggaran])

  return { metrics, chartData, approvals, deadlineTutupBuku }
}
