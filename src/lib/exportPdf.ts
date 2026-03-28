import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Transaction } from '../types'
import { formatRupiah, formatTanggal } from './formatters'

export interface LaporanMeta {
  judul:      string
  institusi:  string
  periode:    string
  dicetak:    string
}

export function exportTransaksiPdf(
  rows:        Transaction[],
  meta:        LaporanMeta,
  filename:    string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(meta.institusi, 14, 14)

  doc.setFontSize(11)
  doc.text(meta.judul, 14, 21)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periode: ${meta.periode}`, 14, 27)
  doc.text(`Dicetak: ${meta.dicetak}`, 14, 32)

  doc.setDrawColor(180)
  doc.line(14, 35, 283, 35)

  autoTable(doc, {
    startY: 38,
    head: [['No', 'Tanggal', 'No. Bukti', 'Uraian', 'Kategori', 'Penerimaan (Rp)', 'Pengeluaran (Rp)', 'Status']],
    body: rows.map((t, i) => [
      i + 1,
      formatTanggal(t.tanggal),
      t.nomorBukti,
      t.deskripsi,
      t.kategori,
      t.type === 'penerimaan' ? formatRupiah(t.nominal) : '',
      t.type === 'pengeluaran' ? formatRupiah(t.nominal) : '',
      t.status === 'terverifikasi' ? 'Terverifikasi'
        : t.status === 'diajukan' ? 'Diajukan'
        : t.status === 'ditolak'  ? 'Ditolak'
        : 'Draft',
    ]),
    styles:       { fontSize: 8, cellPadding: 2 },
    headStyles:   { fillColor: [30, 100, 70], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 247] },
    columnStyles: {
      0:  { cellWidth: 8,  halign: 'center' },
      1:  { cellWidth: 24 },
      2:  { cellWidth: 22 },
      3:  { cellWidth: 60 },
      4:  { cellWidth: 30 },
      5:  { cellWidth: 34, halign: 'right' },
      6:  { cellWidth: 34, halign: 'right' },
      7:  { cellWidth: 22, halign: 'center' },
    },
  })

  // Total row
  const totalPenerimaan = rows.filter(t => t.type === 'penerimaan').reduce((s, t) => s + t.nominal, 0)
  const totalPengeluaran = rows.filter(t => t.type === 'pengeluaran').reduce((s, t) => s + t.nominal, 0)

  const finalY = (doc as any).lastAutoTable.finalY + 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Penerimaan: ${formatRupiah(totalPenerimaan)}`, 14, finalY)
  doc.text(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, 14, finalY + 5)
  doc.text(`Saldo: ${formatRupiah(totalPenerimaan - totalPengeluaran)}`, 14, finalY + 10)

  doc.save(`${filename}.pdf`)
}
