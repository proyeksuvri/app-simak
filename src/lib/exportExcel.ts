import * as XLSX from 'xlsx'
import type { Transaction } from '../types'
import { formatRupiah, formatTanggal } from './formatters'

export function exportTransaksiExcel(
  rows:     Transaction[],
  judul:    string,
  periode:  string,
  filename: string,
) {
  const wb = XLSX.utils.book_new()

  // Header info rows
  const headerRows: (string | number)[][] = [
    ['UIN Palopo'],
    [judul],
    [`Periode: ${periode}`],
    [`Dicetak: ${new Date().toLocaleString('id-ID')}`],
    [],
    ['No', 'Tanggal', 'No. Bukti', 'Uraian', 'Kategori', 'Penerimaan (Rp)', 'Pengeluaran (Rp)', 'Status'],
  ]

  const dataRows = rows.map((t, i) => [
    i + 1,
    formatTanggal(t.tanggal),
    t.nomorBukti,
    t.deskripsi,
    t.kategori,
    t.type === 'penerimaan' ? t.nominal : 0,
    t.type === 'pengeluaran' ? t.nominal : 0,
    t.status === 'terverifikasi' ? 'Terverifikasi'
      : t.status === 'diajukan' ? 'Diajukan'
      : t.status === 'ditolak'  ? 'Ditolak'
      : 'Draft',
  ])

  const totalPenerimaan = rows.filter(t => t.type === 'penerimaan').reduce((s, t) => s + t.nominal, 0)
  const totalPengeluaran = rows.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.nominal, 0)

  const allRows = [
    ...headerRows,
    ...dataRows,
    [],
    ['', '', '', '', 'Total Penerimaan', totalPenerimaan, '', ''],
    ['', '', '', '', 'Total Pengeluaran', '', totalPengeluaran, ''],
    ['', '', '', '', 'Saldo', totalPenerimaan - totalPengeluaran, '', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet(allRows)

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 16 }, { wch: 14 }, { wch: 40 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
