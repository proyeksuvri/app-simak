import type { TransactionStatus } from './database'

export type BKUType = 'penerimaan' | 'induk' | 'pembantu'

export interface BKUEntry {
  id:          string
  tanggal:     string   // ISO date string YYYY-MM-DD
  nomorBukti:  string
  uraian:      string
  debit:       number   // kas masuk (BPN) — 0 jika pengeluaran
  kredit:      number   // kas keluar (BPK) — 0 jika penerimaan
  bkuType:     BKUType
  unitId:      string | null
  status?:          TransactionStatus | null  // status transaksi dari DB
  kategori?:        string | null
  sourceAccountId?:   string | null
  jenisPendapatanId?: string | null
}


// BKUEntry dengan saldo berjalan yang sudah dihitung
export interface BKUEntryWithSaldo extends BKUEntry {
  saldo: number
}
