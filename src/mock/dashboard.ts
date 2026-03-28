import type { MetricCardData, ChartDataPoint } from '../types'

export const mockMetrics: MetricCardData[] = [
  {
    id:       'metric-saldo',
    label:    'Saldo Kas BLU',
    value:    2_450_000_000,
    trend:    4.2,
    trendDir: 'up',
    subtitle: 'Per 25 Juni 2024',
    icon:     'account_balance_wallet',
  },
  {
    id:       'metric-penerimaan',
    label:    'Total Penerimaan',
    value:    842_150_000,
    trend:    12.5,
    trendDir: 'up',
    subtitle: '124 transaksi',
    icon:     'trending_up',
  },
  {
    id:       'metric-pengeluaran',
    label:    'Total Pengeluaran',
    value:    512_400_000,
    trend:    -2.3,
    trendDir: 'down',
    subtitle: '89 transaksi',
    icon:     'trending_down',
  },
  {
    id:       'metric-up-tup',
    label:    'Outstanding UP/TUP',
    value:    125_000_000,
    trend:    0,
    trendDir: 'neutral',
    subtitle: '5 pengajuan pending',
    icon:     'pending_actions',
  },
]

export const mockChartData: ChartDataPoint[] = [
  { bulan: 'Jan', penerimaan: 520_000_000, pengeluaran: 310_000_000 },
  { bulan: 'Feb', penerimaan: 480_000_000, pengeluaran: 390_000_000 },
  { bulan: 'Mar', penerimaan: 610_000_000, pengeluaran: 420_000_000 },
  { bulan: 'Apr', penerimaan: 590_000_000, pengeluaran: 380_000_000 },
  { bulan: 'Mei', penerimaan: 750_000_000, pengeluaran: 460_000_000 },
  { bulan: 'Jun', penerimaan: 842_150_000, pengeluaran: 512_400_000 },
]

export const DEADLINE_TUTUP_BUKU = '2024-06-30'
export const TAHUN_ANGGARAN = 2024
