export type TransactionStatus = 'terverifikasi' | 'pending' | 'diajukan' | 'ditolak'
export type TransactionType   = 'penerimaan' | 'pengeluaran'

export type KategoriPenerimaan =
  | 'UKT'
  | 'PNBP Lainnya'
  | 'Dana Penelitian'
  | 'Transfer BLU'

export type KategoriPengeluaran =
  | 'Honorarium'
  | 'Belanja ATK'
  | 'Perjalanan Dinas'
  | 'Langganan Jurnal'
  | 'Pemeliharaan'
  | 'Pencairan UP'
  | 'Pencairan TUP'

export type KategoriPengeluaranBPN =
  | 'Biaya Operasional BLU'
  | 'Pengembalian UKT'
  | 'Admin Bank'
  | 'Pajak Bank'

export const KATEGORI_PENGELUARAN_BPN: KategoriPengeluaranBPN[] = [
  'Biaya Operasional BLU',
  'Pengembalian UKT',
  'Admin Bank',
  'Pajak Bank',
]

export type KategoriTransaksi = KategoriPenerimaan | KategoriPengeluaran | KategoriPengeluaranBPN

export interface Transaction {
  id:               string
  tanggal:          string            // ISO date string YYYY-MM-DD
  deskripsi:        string
  kategori:         KategoriTransaksi
  nominal:          number            // dalam rupiah (integer)
  type:             TransactionType
  status:           TransactionStatus
  nomorBukti:       string            // BPN-001 atau BPK-001
  unitId:           string | null     // null = transaksi pusat
  sourceAccountId:      string | null     // rekening bank pengeluaran (OUT)
  destinationAccountId: string | null     // rekening bank penerimaan (IN)
  createdBy:            string            // user id
  approvedBy:       string | null
  rejectionNote:    string | null
}
