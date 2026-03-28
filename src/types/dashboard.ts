export interface MetricCardData {
  id:        string
  label:     string
  value:     number
  trend:     number        // e.g. 4.2 berarti +4.2%
  trendDir:  'up' | 'down' | 'neutral'
  subtitle:  string        // e.g. "124 transaksi"
  icon:      string        // Material Symbols name
}

export interface ChartDataPoint {
  bulan:       string      // "Jan", "Feb", dst.
  penerimaan:  number
  pengeluaran: number
}

export interface ApprovalItem {
  id:          string
  title:       string
  requestBy:   string
  dueDate:     string      // ISO date string
  priority:    'high' | 'medium' | 'low'
  type:        'bpn' | 'bpk' | 'up_tup' | 'laporan'
}
