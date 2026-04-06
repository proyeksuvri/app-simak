export interface MetricCardData {
  id:        string
  label:     string
  value:     number
  format?:   'rupiah' | 'count'   // default: 'rupiah'
  trend:     number        // e.g. 4.2 berarti +4.2%
  trendDir:  'up' | 'down' | 'neutral'
  subtitle:  string        // e.g. "124 transaksi"
  icon:      string        // Material Symbols name
}

export interface ChartDataPoint {
  label:       string      // "01 Jan", "02 Jan", dst. (harian)
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

export interface BpnPipelineData {
  draft:         number  // DRAFT
  diajukan:      number  // SUBMITTED
  terverifikasi: number  // APPROVED
  diposting:     number  // POSTED
  ditolak:       number  // REJECTED
}

export interface BpnKategoriRow {
  kategori: string  // nilai kode_rekening: 'UKT', 'PNBP Lainnya', dst.
  count:    number
  total:    number
  pct:      number  // 0–100
}

export interface BpnRekeningRow {
  accountId:     string
  bankName:      string
  accountNumber: string  // "...XXXX" (4 digit terakhir)
  accountName:   string
  count:         number
  total:         number
  pct:           number
}

export interface BpnActionItem {
  id:      string
  noBukti: string
  tanggal: string
  amount:  number
  status:  'DRAFT' | 'REJECTED'
}

export interface BpnAlertCounts {
  rejected:       number  // status REJECTED
  missingAccount: number  // status != REJECTED & destination_account_id IS NULL
}
