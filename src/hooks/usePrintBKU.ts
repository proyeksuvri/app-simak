import { useCallback, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BKUEntryWithSaldo } from '../types'
import { formatRupiah, formatTanggal } from '../lib/formatters'

interface PrintBKUOptions {
  entries:       BKUEntryWithSaldo[]
  saldoAkhir:    number
  tahunAnggaran: number
  namaUnit?:     string   // opsional, untuk BKU Pembantu
  namaBendahara?: string
  nip?:           string
  kategoriPembantu?: string
}

export function usePrintBKU() {
  const [printing, setPrinting] = useState(false)

  const printBKU = useCallback(async (opts: PrintBKUOptions) => {
    const {
      entries,
      saldoAkhir,
      tahunAnggaran,
      namaUnit      = 'UIN Palopo',
      namaBendahara = '-',
      nip           = '-',
      kategoriPembantu,
    } = opts

    setPrinting(true)

    try {
      // ── Setup dokumen ──────────────────────────────────────────────────────
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const marginX = 14
      const now = new Date()
      const dicetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

      // ── Header / Kop ──────────────────────────────────────────────────────
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      
      if (kategoriPembantu) {
        doc.text('BUKU KAS PEMBANTU PENERIMAAN', pageW / 2, 18, { align: 'center' })
        doc.setFontSize(11)
        doc.text(`KATEGORI / RINCIAN OBYEK: ${kategoriPembantu.toUpperCase()}`, pageW / 2, 23, { align: 'center' })
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`${namaUnit}`, pageW / 2, 28, { align: 'center' })
        doc.text(`Tahun Anggaran ${tahunAnggaran}`, pageW / 2, 33, { align: 'center' })
        
        // Garis bawah header
        doc.setLineWidth(0.4)
        doc.line(marginX, 36, pageW - marginX, 36)
      } else {
        doc.text('BUKU KAS UMUM (BKU) PENERIMAAN', pageW / 2, 18, { align: 'center' })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`${namaUnit}`, pageW / 2, 24, { align: 'center' })
        doc.text(`Tahun Anggaran ${tahunAnggaran}`, pageW / 2, 30, { align: 'center' })

        // Garis bawah header
        doc.setLineWidth(0.4)
        doc.line(marginX, 33, pageW - marginX, 33)
      }

      // Garis bawah header
      doc.setLineWidth(0.4)
      doc.line(marginX, 33, pageW - marginX, 33)

      // Info bendahara
      doc.setFontSize(9)
      doc.text(`Bendahara Penerimaan : ${namaBendahara}`, marginX, 39)
      doc.text(`NIP                  : ${nip}`, marginX, 44)

      // ── Ringkasan ─────────────────────────────────────────────────────────
      const totalDebit  = entries.reduce((s, e) => s + e.debit,  0)
      const jumlah      = entries.filter(e => e.debit > 0).length

      doc.setFontSize(9)
      doc.text(`Total Penerimaan  : ${formatRupiah(totalDebit)}`, pageW - marginX - 90, 39)
      doc.text(`Jumlah Transaksi  : ${jumlah} dokumen`,           pageW - marginX - 90, 44)
      doc.text(`Saldo Akhir       : ${formatRupiah(saldoAkhir)}`, pageW - marginX - 90, 49)

      // ── Tabel ─────────────────────────────────────────────────────────────
      const head = [['No', 'Tanggal', 'No. Bukti', 'Uraian', 'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo']]

      const body = entries.map((e, idx) => [
        String(idx + 1),
        formatTanggal(e.tanggal),
        e.nomorBukti,
        e.uraian,
        e.debit  > 0 ? formatRupiah(e.debit)  : '—',
        e.kredit > 0 ? formatRupiah(e.kredit) : '—',
        formatRupiah(e.saldo),
      ])

      // Baris saldo akhir
      body.push(['', '', '', 'SALDO AKHIR', '', '', formatRupiah(saldoAkhir)])

      autoTable(doc, {
        startY:       54,
        head,
        body,
        margin:       { left: marginX, right: marginX },
        styles:       { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
        headStyles:   {
          fillColor:  [40, 50, 80],
          textColor:  255,
          fontStyle:  'bold',
          halign:     'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 26 },
          2: { cellWidth: 28 },
          3: { cellWidth: 70 },
          4: { halign: 'right', cellWidth: 38 },
          5: { halign: 'right', cellWidth: 38 },
          6: { halign: 'right', cellWidth: 38 },
        },
        alternateRowStyles: { fillColor: [245, 246, 250] },
        // Style baris saldo akhir (baris terakhir)
        didParseCell(data) {
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle  = 'bold'
            data.cell.styles.fillColor  = [220, 230, 255]
            data.cell.styles.textColor  = [20, 30, 80]
          }
        },
      })

      // ── Footer tanda tangan ────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY as number
      const signY  = finalY + 12

      if (signY < doc.internal.pageSize.getHeight() - 30) {
        doc.setFontSize(9)
        doc.text(`Dicetak pada: ${dicetak}`, marginX, signY + 4)

        const signX = pageW - marginX - 55
        doc.text('Bendahara Penerimaan,', signX, signY)
        doc.line(signX, signY + 22, signX + 50, signY + 22)
        doc.text(namaBendahara, signX, signY + 26)
        doc.text(`NIP. ${nip}`, signX, signY + 30)
      }

      // ── Nomor halaman ─────────────────────────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(120)
        doc.text(`Halaman ${i} dari ${totalPages}`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' })
        doc.setTextColor(0)
      }

      // ── Simpan / buka PDF ─────────────────────────────────────────────────
      const filename = `BKU_Penerimaan_${tahunAnggaran}.pdf`
      doc.save(filename)
    } finally {
      setPrinting(false)
    }
  }, [])

  return { printBKU, printing }
}
