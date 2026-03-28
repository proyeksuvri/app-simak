import type { BKUEntry } from '../types'

// BKU Penerimaan — kas masuk ke rekening BLU
export const mockBKUPenerimaan: BKUEntry[] = [
  { id: 'bkup-001', tanggal: '2024-06-01', nomorBukti: 'BPN-2024-006', uraian: 'PNBP Pendaftaran Mahasiswa Baru 2024',             debit: 45_000_000,  kredit: 0,           bkuType: 'penerimaan', unitId: null },
  { id: 'bkup-002', tanggal: '2024-06-05', nomorBukti: 'BPN-2024-008', uraian: 'Transfer BLU ke Rekening Pengeluaran',             debit: 0,            kredit: 500_000_000, bkuType: 'penerimaan', unitId: null },
  { id: 'bkup-003', tanggal: '2024-06-10', nomorBukti: 'BPN-2024-007', uraian: 'Pembayaran UKT — FT',                              debit: 112_800_000, kredit: 0,            bkuType: 'penerimaan', unitId: 'unit-04' },
  { id: 'bkup-004', tanggal: '2024-06-15', nomorBukti: 'BPN-2024-006', uraian: 'PNBP Pendaftaran PMB 2024 (susulan)',              debit: 12_000_000,  kredit: 0,            bkuType: 'penerimaan', unitId: null },
  { id: 'bkup-005', tanggal: '2024-06-18', nomorBukti: 'BPN-2024-005', uraian: 'Pembayaran UKT — FUAD',                           debit: 98_500_000,  kredit: 0,            bkuType: 'penerimaan', unitId: 'unit-03' },
  { id: 'bkup-006', tanggal: '2024-06-20', nomorBukti: 'BPN-2024-004', uraian: 'PNBP Layanan Legalisir & Transkip',               debit: 12_400_000,  kredit: 0,            bkuType: 'penerimaan', unitId: null },
  { id: 'bkup-007', tanggal: '2024-06-22', nomorBukti: 'BPN-2024-003', uraian: 'Hibah Penelitian DRTPM 2024',                     debit: 200_000_000, kredit: 0,            bkuType: 'penerimaan', unitId: null },
  { id: 'bkup-008', tanggal: '2024-06-24', nomorBukti: 'BPN-2024-002', uraian: 'Pembayaran UKT — FEBI',                           debit: 156_750_000, kredit: 0,            bkuType: 'penerimaan', unitId: 'unit-02' },
  { id: 'bkup-009', tanggal: '2024-06-25', nomorBukti: 'BPN-2024-001', uraian: 'Pembayaran UKT — FTIK',                           debit: 285_000_000, kredit: 0,            bkuType: 'penerimaan', unitId: 'unit-01' },
]

// BKU Induk — pengeluaran dari kas pusat & distribusi ke BPP
export const mockBKUInduk: BKUEntry[] = [
  { id: 'bkui-001', tanggal: '2024-06-01', nomorBukti: 'BPN-TRANS-001', uraian: 'Penerimaan Transfer BLU',                        debit: 500_000_000, kredit: 0,            bkuType: 'induk', unitId: null },
  { id: 'bkui-002', tanggal: '2024-06-03', nomorBukti: 'BPK-2024-011',  uraian: 'Pemeliharaan Gedung Rektorat',                   debit: 0,            kredit: 28_600_000,  bkuType: 'induk', unitId: 'unit-07' },
  { id: 'bkui-003', tanggal: '2024-06-05', nomorBukti: 'BPK-2024-010',  uraian: 'Pencairan TUP — PMB 2024',                      debit: 0,            kredit: 125_000_000, bkuType: 'induk', unitId: null },
  { id: 'bkui-004', tanggal: '2024-06-08', nomorBukti: 'BPK-2024-009',  uraian: 'Belanja ATK Wisuda 2024',                        debit: 0,            kredit: 5_150_000,   bkuType: 'induk', unitId: null },
  { id: 'bkui-005', tanggal: '2024-06-10', nomorBukti: 'BPK-2024-008',  uraian: 'Honorarium UAS — Dibatalkan',                   debit: 0,            kredit: 0,            bkuType: 'induk', unitId: null },
  { id: 'bkui-006', tanggal: '2024-06-12', nomorBukti: 'BPK-2024-007',  uraian: 'Pencairan UP TW-II — FEBI',                     debit: 0,            kredit: 60_000_000,  bkuType: 'induk', unitId: 'unit-02' },
  { id: 'bkui-007', tanggal: '2024-06-14', nomorBukti: 'BPK-2024-006',  uraian: 'Pencairan UP TW-II — FTIK',                     debit: 0,            kredit: 75_000_000,  bkuType: 'induk', unitId: 'unit-01' },
  { id: 'bkui-008', tanggal: '2024-06-21', nomorBukti: 'BPK-2024-003',  uraian: 'Perjalanan Dinas Rapat BLU Jakarta',             debit: 0,            kredit: 18_500_000,  bkuType: 'induk', unitId: null },
  { id: 'bkui-009', tanggal: '2024-06-23', nomorBukti: 'BPK-2024-002',  uraian: 'ATK & Bahan Habis Pakai Rektorat',               debit: 0,            kredit: 8_750_000,   bkuType: 'induk', unitId: 'unit-07' },
  { id: 'bkui-010', tanggal: '2024-06-25', nomorBukti: 'BPK-DIST-001',  uraian: 'Distribusi Dana ke BPP FK',                     debit: 0,            kredit: 40_000_000,  bkuType: 'induk', unitId: 'unit-05' },
]

// BKU Pembantu — per unit (contoh: FTIK unit-01)
export const mockBKUPembantu: BKUEntry[] = [
  { id: 'bkupp-001', tanggal: '2024-06-01', nomorBukti: 'BPN-UP-001',    uraian: 'Penerimaan UP TW-I sisa saldo',                 debit: 15_000_000,  kredit: 0,            bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-002', tanggal: '2024-06-03', nomorBukti: 'BPK-PP-001',    uraian: 'Pengadaan ATK Prodi',                           debit: 0,            kredit: 2_500_000,   bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-003', tanggal: '2024-06-07', nomorBukti: 'BPK-PP-002',    uraian: 'Perjalanan Dinas Dosen ke Seminar',             debit: 0,            kredit: 4_800_000,   bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-004', tanggal: '2024-06-14', nomorBukti: 'BPN-UP-002',    uraian: 'Penerimaan Pencairan UP TW-II',                 debit: 75_000_000,  kredit: 0,            bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-005', tanggal: '2024-06-15', nomorBukti: 'BPK-PP-003',    uraian: 'Honorarium Dosen Pembimbing Skripsi',           debit: 0,            kredit: 45_000_000,  bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-006', tanggal: '2024-06-18', nomorBukti: 'BPK-PP-004',    uraian: 'Pembelian Tinta Printer & Kertas',              debit: 0,            kredit: 1_200_000,   bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-007', tanggal: '2024-06-20', nomorBukti: 'BPK-PP-005',    uraian: 'Konsumsi Rapat Program Studi',                  debit: 0,            kredit: 850_000,     bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-008', tanggal: '2024-06-22', nomorBukti: 'BPK-PP-006',    uraian: 'Penggandaan Soal UAS',                         debit: 0,            kredit: 3_200_000,   bkuType: 'pembantu', unitId: 'unit-01' },
  { id: 'bkupp-009', tanggal: '2024-06-24', nomorBukti: 'BPK-PP-007',    uraian: 'Biaya Pengiriman Dokumen Akreditasi',           debit: 0,            kredit: 750_000,     bkuType: 'pembantu', unitId: 'unit-01' },
]

export const mockAllBKU = [
  ...mockBKUPenerimaan,
  ...mockBKUInduk,
  ...mockBKUPembantu,
]
