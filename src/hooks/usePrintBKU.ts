import { useCallback, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BKUEntryWithSaldo } from '../types'
import { formatRupiah, formatTanggal } from '../lib/formatters'

// ── Identitas Institusi ───────────────────────────────────────────────────────
const INSTITUSI = {
  nama:    'UNIVERSITAS ISLAM NEGERI PALOPO',
  alamat:  'Jl. Agatis, Kel. Balandai, Kec. Bara, Kota Palopo, Sulawesi Selatan 91914',
  telp:    'Telp. (0471) 22202',
  website: 'www.uinpalopo.ac.id',
  logo:    'https://uinpalopo.ac.id/wp-content/uploads/2024/01/logo-header.png',
}

// ── Palet warna ───────────────────────────────────────────────────────────────
const C = {
  hijauTua:   [0,  84,  54]  as [number, number, number],
  hijauMuda:  [0, 120,  80]  as [number, number, number],
  emas:       [212, 175, 55] as [number, number, number],
  // "General Ledger" dark theme
  gelapHeader:[28,  32,  46] as [number, number, number],   // near-black biru
  gelapPanel: [42,  47,  66] as [number, number, number],   // panel label bg
  gelapBorder:[90,  95, 120] as [number, number, number],
  abuStripe:  [248, 249, 252] as [number, number, number],  // baris genap
  abuGelap:   [80,  80,  90] as [number, number, number],
  putih:      [255, 255, 255] as [number, number, number],
  hitam:      [20,  22,  28]  as [number, number, number],
  merah:      [200,  40,  40] as [number, number, number],
  hijauSaldo: [0,  130,  70]  as [number, number, number],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLabelBendahara(tipeBKU: string): string {
  if (tipeBKU === 'induk')   return 'Bendahara Pengeluaran'
  if (tipeBKU === 'pembantu') return 'Bendahara Pengeluaran Pembantu'
  return 'Bendahara Penerimaan'
}

function getTanggalTutupBuku(entries: BKUEntryWithSaldo[]): string {
  if (entries.length === 0) return '-'
  const d = new Date(entries[entries.length - 1].tanggal)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return lastDay.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getPeriodeLabel(entries: BKUEntryWithSaldo[], tahun: number): string {
  if (entries.length === 0) return `Tahun Anggaran ${tahun}`
  const first = new Date(entries[0].tanggal)
  const last  = new Date(entries[entries.length - 1].tanggal)
  const a = first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const b = last.toLocaleDateString('id-ID',  { month: 'long', year: 'numeric' })
  return a === b ? a : `${a} s.d. ${b}`
}

function getSaldoAwal(entries: BKUEntryWithSaldo[]): number {
  if (entries.length === 0) return 0
  const e = entries[0]
  return e.saldo - e.debit + e.kredit
}

export interface PrintBKUOptions {
  entries:           BKUEntryWithSaldo[]
  saldoAkhir:        number
  tahunAnggaran:     number
  namaUnit?:         string
  namaBendahara?:    string
  nip?:              string
  kategoriPembantu?: string
  tipeBKU?:          'penerimaan' | 'induk' | 'pembantu'
}

// ── Muat logo ─────────────────────────────────────────────────────────────────
async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(INSTITUSI.logo)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror   = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// ── Garis dekoratif ───────────────────────────────────────────────────────────
function drawLine(doc: jsPDF, x1: number, y: number, x2: number,
                  color: [number,number,number], w = 0.4) {
  doc.setDrawColor(...color)
  doc.setLineWidth(w)
  doc.line(x1, y, x2, y)
}

// ── Kotak dengan header gelap + rows ─────────────────────────────────────────
function drawInfoBox(
  doc: jsPDF,
  x: number, y: number, w: number,
  rows: { label: string; value: string }[],
  rowH = 7,
  labelRatio = 0.38,
) {
  rows.forEach(({ label, value }, idx) => {
    const ry = y + idx * rowH
    const lw = w * labelRatio
    const vw = w - lw

    // label cell — gelap
    doc.setFillColor(...(idx % 2 === 0 ? C.gelapPanel : [36, 41, 58] as [number, number, number]))
    doc.rect(x, ry, lw, rowH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.putih)
    doc.text(label, x + 3, ry + 4.6)

    // value cell — putih/terang
    doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 253)
    doc.rect(x + lw, ry, vw, rowH, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.hitam)
    const maxW = vw - 6
    doc.text(value, x + lw + 3, ry + 4.6, { maxWidth: maxW })

    // garis bawah
    doc.setDrawColor(...C.gelapBorder)
    doc.setLineWidth(0.15)
    doc.line(x, ry + rowH, x + w, ry + rowH)
  })

  // border luar
  doc.setDrawColor(...C.gelapBorder)
  doc.setLineWidth(0.4)
  doc.rect(x, y, w, rowH * rows.length, 'D')
}

// ── Kotak ringkasan (RINGKASAN) ───────────────────────────────────────────────
function drawSummaryBox(
  doc: jsPDF,
  x: number, y: number, w: number,
  title: string,
  rows: { label: string; value: string; highlight?: boolean }[],
  rowH = 7.5,
) {
  const headerH = 8.5

  // Header
  doc.setFillColor(...C.gelapHeader)
  doc.rect(x, y, w, headerH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.putih)
  doc.text(title, x + w / 2, y + 5.7, { align: 'center' })

  // Rows
  rows.forEach(({ label, value, highlight }, idx) => {
    const ry = y + headerH + idx * rowH
    const lw = w * 0.56

    // label bg
    doc.setFillColor(...(highlight ? ([22, 26, 42] as [number, number, number]) : ([38, 43, 62] as [number, number, number])))
    doc.rect(x, ry, lw, rowH, 'F')
    doc.setFont('helvetica', highlight ? 'bold' : 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...(highlight ? C.emas : ([190, 195, 220] as [number, number, number])))
    doc.text(label, x + 3, ry + 4.9)

    // value bg
    doc.setFillColor(...(highlight ? ([22, 26, 42] as [number, number, number]) : ([248, 249, 252] as [number, number, number])))
    doc.rect(x + lw, ry, w - lw, rowH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...(highlight ? C.emas : C.hitam))
    doc.text(value, x + w - 3, ry + 4.9, { align: 'right' })

    // garis bawah
    doc.setDrawColor(...C.gelapBorder)
    doc.setLineWidth(0.15)
    doc.line(x, ry + rowH, x + w, ry + rowH)
  })

  // Border luar
  doc.setDrawColor(...C.gelapBorder)
  doc.setLineWidth(0.5)
  doc.rect(x, y, w, headerH + rowH * rows.length, 'D')
}

// ─────────────────────────────────────────────────────────────────────────────
export function usePrintBKU() {
  const [printing, setPrinting] = useState(false)

  const printBKU = useCallback(async (opts: PrintBKUOptions) => {
    const {
      entries,
      saldoAkhir,
      tahunAnggaran,
      namaUnit       = 'UIN Palopo',
      namaBendahara  = '-',
      nip            = '-',
      kategoriPembantu,
      tipeBKU        = kategoriPembantu ? 'pembantu' : 'penerimaan',
    } = opts

    setPrinting(true)

    try {
      const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const mX    = 15
      const now   = new Date()
      const dicetak = now.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })

      const labelBendahara = getLabelBendahara(tipeBKU)
      const tanggalTutup   = getTanggalTutupBuku(entries)
      const periodeLabel   = getPeriodeLabel(entries, tahunAnggaran)
      const totalDebit     = entries.reduce((s, e) => s + e.debit, 0)
      const totalKredit    = entries.reduce((s, e) => s + e.kredit, 0)
      const jumlahTrx      = entries.filter(e => e.debit > 0 || e.kredit > 0).length
      const saldoAwal      = getSaldoAwal(entries)

      // Judul dokumen
      let judulUtama: string
      let judulSub: string | null = null
      if (tipeBKU === 'induk') {
        judulUtama = 'BUKU KAS UMUM (BKU) INDUK PENGELUARAN'
      } else if (tipeBKU === 'pembantu' || kategoriPembantu) {
        judulUtama = 'BUKU KAS PEMBANTU PENERIMAAN'
        judulSub   = kategoriPembantu ? `Rincian Obyek: ${kategoriPembantu.toUpperCase()}` : null
      } else {
        judulUtama = 'BUKU KAS UMUM (BKU) PENERIMAAN'
      }

      const logoBase64 = await loadLogoBase64()

      // ── Fungsi render KOP — dipanggil di setiap halaman ──────────────────
      const renderKOP = (pageNum: number): number => {
        // Strip hijau atas
        doc.setFillColor(...C.hijauTua)
        doc.rect(0, 0, pageW, 7, 'F')
        drawLine(doc, 0, 7, pageW, C.emas, 1.0)

        // Logo
        const logoX = mX
        const logoY = 9
        const logoSz = 22
        if (logoBase64) {
          try { doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSz, logoSz) }
          catch { /* gagal */ }
        } else {
          doc.setFillColor(...C.hijauMuda)
          doc.roundedRect(logoX, logoY, logoSz, logoSz, 2, 2, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(6)
          doc.setTextColor(...C.putih)
          doc.text('UIN', logoX + logoSz / 2, logoY + logoSz / 2 + 1, { align: 'center' })
        }

        // Teks KOP — tengah
        const cx = pageW / 2
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...C.hijauTua)
        doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', cx, 13, { align: 'center' })

        doc.setFontSize(13.5)
        doc.text(INSTITUSI.nama, cx, 19.5, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.2)
        doc.setTextColor(...C.abuGelap)
        doc.text(INSTITUSI.alamat, cx, 24.5, { align: 'center' })
        doc.text(`${INSTITUSI.telp}  |  ${INSTITUSI.website}`, cx, 28.5, { align: 'center' })

        // Garis emas + hijau pemisah KOP
        drawLine(doc, mX, 31.5, pageW - mX, C.emas, 0.8)
        drawLine(doc, mX, 32.6, pageW - mX, C.hijauTua, 0.3)

        // Kotak judul BKU — header gelap
        const boxY = 34.5
        const boxH = judulSub ? 14 : 10
        doc.setFillColor(...C.gelapHeader)
        doc.roundedRect(mX, boxY, pageW - mX * 2, boxH, 1.5, 1.5, 'F')
        drawLine(doc, mX, boxY, pageW - mX, C.emas, 0.5)
        drawLine(doc, mX, boxY + boxH, pageW - mX, C.emas, 0.5)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...C.putih)
        doc.text(judulUtama, cx, boxY + (judulSub ? 5.5 : 6.8), { align: 'center' })

        if (judulSub) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...C.emas)
          doc.text(judulSub, cx, boxY + 11, { align: 'center' })
        }

        // Nomor halaman
        if (pageNum > 1) {
          doc.setFontSize(7.5)
          doc.setTextColor(...C.abuGelap)
          doc.text(`Hal. ${pageNum}`, pageW - mX, boxY + 6.8, { align: 'right' })
        }

        return boxY + boxH + 4   // Y mulai konten
      }

      // Render halaman pertama
      let startY = renderKOP(1)

      // ── Info Panel + Summary Panel ─────────────────────────────────────────
      const panelAreaW = pageW - mX * 2
      const leftW  = panelAreaW * 0.54
      const rightW = panelAreaW * 0.42
      const gap    = panelAreaW - leftW - rightW
      const leftX  = mX
      const rightX = mX + leftW + gap

      const infoRows = [
        { label: 'Satuan Kerja', value: namaUnit },
        { label: 'Periode',      value: periodeLabel },
        { label: 'Bendahara',    value: namaBendahara },
        { label: 'NIP',          value: nip },
      ]

      const summaryRows = [
        { label: 'Saldo Awal',
          value: formatRupiah(saldoAwal) },
        { label: tipeBKU === 'induk' ? 'Total Pengeluaran' : 'Total Penerimaan',
          value: formatRupiah(tipeBKU === 'induk' ? totalKredit : totalDebit) },
        { label: 'Jumlah Transaksi',
          value: `${jumlahTrx} transaksi` },
        { label: 'Saldo Akhir',
          value: formatRupiah(saldoAkhir),
          highlight: true },
      ]

      const rowH      = 7
      const infoH     = rowH * infoRows.length
      const summRowH  = 7
      const summH     = 8.5 + summRowH * summaryRows.length
      const panelH    = Math.max(infoH, summH)

      drawInfoBox(doc, leftX, startY, leftW, infoRows, rowH)
      drawSummaryBox(doc, rightX, startY, rightW, 'RINGKASAN', summaryRows, summRowH)

      startY += panelH + 5

      // ── Tabel Transaksi ───────────────────────────────────────────────────
      const head = [['No', 'Tanggal', 'No. Bukti', 'Uraian / Keterangan',
                      'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo']]

      const body = entries.map((e, idx) => [
        String(idx + 1),
        formatTanggal(e.tanggal),
        e.nomorBukti || '-',
        e.uraian,
        e.debit  > 0 ? formatRupiah(e.debit)  : '—',
        e.kredit > 0 ? formatRupiah(e.kredit) : '—',
        // Kolom saldo dengan indikator ▲/▼
        e.saldo < 0
          ? `▼ ${formatRupiah(Math.abs(e.saldo))}`
          : `▲ ${formatRupiah(e.saldo)}`,
      ])

      // Baris total
      body.push([
        '', '', '', 'JUMLAH',
        tipeBKU === 'induk' ? '—' : formatRupiah(totalDebit),
        tipeBKU === 'induk' ? formatRupiah(totalKredit) : '—',
        '',
      ])
      body.push(['', '', '', 'SALDO AKHIR', '', '', formatRupiah(saldoAkhir)])

      autoTable(doc, {
        startY,
        head,
        body,
        margin: { left: mX, right: mX },
        styles: {
          fontSize: 8,
          cellPadding: 2.4,
          valign: 'middle',
          font: 'helvetica',
          lineColor: [210, 213, 225],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor:  C.gelapHeader,
          textColor:  C.putih,
          fontStyle:  'bold',
          halign:     'center',
          fontSize:   8.5,
          lineWidth:  0,
          cellPadding: 3,
        },
        columnStyles: {
          0: { halign: 'center',  cellWidth: 9  },
          1: { halign: 'center',  cellWidth: 26 },
          2: { halign: 'center',  cellWidth: 30 },
          3: { cellWidth: 'auto' },
          4: { halign: 'right',   cellWidth: 36 },
          5: { halign: 'right',   cellWidth: 36 },
          6: { halign: 'right',   cellWidth: 38 },
        },
        alternateRowStyles: {
          fillColor: C.abuStripe,
        },
        bodyStyles: {
          textColor: C.hitam,
        },
        didParseCell(data) {
          const lastIdx  = body.length - 1
          const totalIdx = body.length - 2

          // Baris JUMLAH
          if (data.row.index === totalIdx) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = [232, 245, 238]
            data.cell.styles.textColor = C.hijauTua
          }

          // Baris SALDO AKHIR
          if (data.row.index === lastIdx) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = C.gelapHeader
            data.cell.styles.textColor = C.putih
          }

          // Warna kolom saldo (▲ hijau, ▼ merah)
          if (data.column.index === 6 && data.section === 'body'
              && data.row.index < entries.length) {
            const saldo = entries[data.row.index]?.saldo ?? 0
            data.cell.styles.textColor = saldo < 0 ? C.merah : C.hijauSaldo
            data.cell.styles.fontStyle = 'bold'
          }
        },

        // Re-render KOP di halaman baru
        didDrawPage(data) {
          const pg = data.pageNumber
          if (pg > 1) renderKOP(pg)

          // Garis emas footer
          drawLine(doc, mX, pageH - 9, pageW - mX, C.emas, 0.5)

          // Footer teks
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...C.abuGelap)
          doc.text(`Dicetak: ${dicetak}`, mX, pageH - 5)
          doc.text(
            `Halaman ${pg} dari {total_pages} — ${INSTITUSI.nama}`,
            pageW / 2, pageH - 5, { align: 'center' },
          )
        },
      })

      // Ganti placeholder total halaman
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = (doc as any).internal.getNumberOfPages() as number
      for (let i = 1; i <= total; i++) {
        doc.setPage(i)
        doc.setFillColor(255, 255, 255)
        doc.rect(pageW / 2 - 80, pageH - 8, 160, 5, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.abuGelap)
        doc.text(
          `Halaman ${i} dari ${total} — ${INSTITUSI.nama}`,
          pageW / 2, pageH - 5, { align: 'center' },
        )
      }

      // ── Blok Tanda Tangan ─────────────────────────────────────────────────
      doc.setPage(total)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY  = (doc as any).lastAutoTable.finalY as number
      const signY   = finalY + 8
      const spaceOK = pageH - signY - 12 >= 38

      if (spaceOK) {
        const signW = 72
        const signX = pageW - mX - signW

        // Kiri: tutup buku
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.hitam)
        doc.text(`Tutup buku tanggal : ${tanggalTutup}`, mX, signY)

        // Header label jabatan — dark box
        doc.setFillColor(...C.gelapHeader)
        doc.roundedRect(signX, signY - 2, signW, 7, 1.5, 1.5, 'F')
        drawLine(doc, signX, signY - 2, signX + signW, C.emas, 0.5)
        drawLine(doc, signX, signY + 5, signX + signW, C.emas, 0.5)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...C.putih)
        doc.text(labelBendahara + ',', signX + signW / 2, signY + 2.5, { align: 'center' })

        // Tempat & tanggal
        const tanggalSign = 'Palopo, ' + dicetak.split(', ').slice(1).join(', ')
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.abuGelap)
        doc.text(tanggalSign, signX + signW / 2, signY + 8, { align: 'center' })

        // Garis tanda tangan
        const lineY = signY + 29
        doc.setDrawColor(...C.hitam)
        doc.setLineWidth(0.35)
        doc.line(signX + 4, lineY, signX + signW - 4, lineY)

        // Nama
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.hitam)
        doc.text(namaBendahara, signX + signW / 2, lineY + 4.5, { align: 'center' })

        // NIP
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.abuGelap)
        doc.text(`NIP. ${nip}`, signX + signW / 2, lineY + 9, { align: 'center' })

        // Garis bawah emas dekoratif
        drawLine(doc, signX, lineY + 12, signX + signW, C.emas, 0.5)
      }

      // ── Simpan ────────────────────────────────────────────────────────────
      const tipeLabel = tipeBKU === 'induk' ? 'Induk' : tipeBKU === 'pembantu' ? 'Pembantu' : 'Penerimaan'
      doc.save(`BKU_${tipeLabel}_${tahunAnggaran}.pdf`)

    } finally {
      setPrinting(false)
    }
  }, [])

  return { printBKU, printing }
}
