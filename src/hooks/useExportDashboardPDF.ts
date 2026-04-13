import { useCallback, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { MetricCardData, AnomalyItem } from '../types'
import type { RevenueBreakdownRow } from './useRevenueBreakdown'
import { formatRupiah, formatRupiahSingkat } from '../lib/formatters'

// ── Identitas Institusi ────────────────────────────────────────────────────────
const INSTITUSI = {
  nama:    'UNIVERSITAS ISLAM NEGERI PALOPO',
  alamat:  'Jl. Agatis, Kel. Balandai, Kec. Bara, Kota Palopo, Sulawesi Selatan 91914',
  telp:    'Telp. (0471) 22202',
  website: 'www.uinpalopo.ac.id',
  logo:    'https://uinpalopo.ac.id/wp-content/uploads/2024/01/logo-header.png',
}

// ── Palet warna — konsisten dengan usePrintBKU ────────────────────────────────
const C = {
  hijauTua:   [0,  84,  54]  as [number, number, number],
  hijauMuda:  [0, 120,  80]  as [number, number, number],
  emas:       [212, 175, 55] as [number, number, number],
  gelapHeader:[28,  32,  46] as [number, number, number],
  gelapPanel: [42,  47,  66] as [number, number, number],
  gelapBorder:[90,  95, 120] as [number, number, number],
  abuStripe:  [248, 249, 252] as [number, number, number],
  abuGelap:   [80,  80,  90] as [number, number, number],
  putih:      [255, 255, 255] as [number, number, number],
  hitam:      [20,  22,  28]  as [number, number, number],
  ungu:       [108,  72, 209] as [number, number, number],
  hijauSaldo: [0,  130,  70]  as [number, number, number],
  merahMuda:  [220,  50,  50] as [number, number, number],
  kuning:     [180, 130,   0] as [number, number, number],
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function drawLine(doc: jsPDF, x1: number, y: number, x2: number,
                  color: [number, number, number], w = 0.4) {
  doc.setDrawColor(...color)
  doc.setLineWidth(w)
  doc.line(x1, y, x2, y)
}

/** Render KOP surat dan kembalikan Y awal konten */
function renderKOP(
  doc:         jsPDF,
  pageNum:     number,
  pageW:       number,
  pageH:       number,
  mX:          number,
  periodeLabel:string,
  logoBase64:  string | null,
): number {
  // Strip hijau atas
  doc.setFillColor(...C.hijauTua)
  doc.rect(0, 0, pageW, 7, 'F')
  drawLine(doc, 0, 7, pageW, C.emas, 1.0)

  // Logo
  const logoX = mX, logoY = 9, logoSz = 22
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSz, logoSz) }
    catch { /* gagal load */ }
  } else {
    doc.setFillColor(...C.hijauMuda)
    doc.roundedRect(logoX, logoY, logoSz, logoSz, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...C.putih)
    doc.text('UIN', logoX + logoSz / 2, logoY + logoSz / 2 + 1, { align: 'center' })
  }

  // Teks KOP
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

  drawLine(doc, mX, 31.5, pageW - mX, C.emas, 0.8)
  drawLine(doc, mX, 32.6, pageW - mX, C.hijauTua, 0.3)

  // Kotak judul laporan
  const boxY = 34.5, boxH = 14
  doc.setFillColor(...C.gelapHeader)
  doc.roundedRect(mX, boxY, pageW - mX * 2, boxH, 1.5, 1.5, 'F')
  drawLine(doc, mX, boxY,        pageW - mX, C.emas, 0.5)
  drawLine(doc, mX, boxY + boxH, pageW - mX, C.emas, 0.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...C.putih)
  doc.text('LAPORAN KEUANGAN EKSEKUTIF', cx, boxY + 5.8, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.emas)
  doc.text(`Periode: ${periodeLabel}`, cx, boxY + 11, { align: 'center' })

  // Nomor halaman (halaman 2+)
  if (pageNum > 1) {
    doc.setFontSize(7.5)
    doc.setTextColor(...C.abuGelap)
    doc.text(`Hal. ${pageNum}`, pageW - mX, boxY + 6, { align: 'right' })
  }

  return boxY + boxH + 5  // Y awal konten
}

/** Kotak KPI sederhana */
function drawKpiBox(
  doc:   jsPDF,
  x:     number,
  y:     number,
  w:     number,
  label: string,
  value: string,
  sub?:  string,
  accent: [number, number, number] = C.ungu,
) {
  const h = 20
  // Background
  doc.setFillColor(248, 248, 252)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F')
  // Accent top border
  doc.setFillColor(...accent)
  doc.roundedRect(x, y, w, 2, 0.5, 0.5, 'F')

  // Label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.abuGelap)
  doc.text(label.toUpperCase(), x + w / 2, y + 7, { align: 'center' })

  // Value
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.hitam)
  doc.text(value, x + w / 2, y + 13, { align: 'center' })

  // Sub
  if (sub) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.abuGelap)
    doc.text(sub, x + w / 2, y + 17.5, { align: 'center' })
  }
}

/** Narasi risiko ringkas — tanpa status teknis */
function buildRiskNarasi(anomalies: AnomalyItem[]): string[] {
  if (anomalies.length === 0) return ['Tidak ada indikasi risiko keuangan pada periode ini.']
  const lines: string[] = []

  const kritis    = anomalies.filter(a => a.severity === 'kritis')
  const peringatan = anomalies.filter(a => a.severity === 'peringatan')
  const info       = anomalies.filter(a => a.severity === 'info')

  if (kritis.length > 0) {
    lines.push(`${kritis.length} temuan KRITIS yang memerlukan tindakan segera:`)
    kritis.forEach(a => lines.push(`  • ${a.title}: ${a.detail}`))
  }
  if (peringatan.length > 0) {
    lines.push(`${peringatan.length} peringatan yang perlu diperhatikan:`)
    peringatan.forEach(a => lines.push(`  • ${a.title}: ${a.detail}`))
  }
  if (info.length > 0) {
    lines.push(`${info.length} catatan informasi:`)
    info.forEach(a => lines.push(`  • ${a.title}`))
  }
  return lines
}

// ── Interface opsi export ──────────────────────────────────────────────────────
export interface ExportDashboardPDFOptions {
  metrics:           MetricCardData[]
  revenueBreakdown:  RevenueBreakdownRow[]
  anomalies:         AnomalyItem[]
  periodLabel:       string
  filterFrom:        string
  filterTo:          string
  namaUser?:         string
}

// ── Hook utama ─────────────────────────────────────────────────────────────────
export function useExportDashboardPDF() {
  const [exporting, setExporting] = useState(false)

  const exportPDF = useCallback(async (opts: ExportDashboardPDFOptions) => {
    const {
      metrics,
      revenueBreakdown,
      anomalies,
      periodLabel,
      namaUser = 'Sistem',
    } = opts

    setExporting(true)

    try {
      const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const mX    = 15
      const now   = new Date()
      const dicetak = now.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })

      const logoBase64 = await loadLogoBase64()

      // Footer renderer — dipanggil sekali di akhir per halaman
      const renderFooter = (pg: number, total: number) => {
        drawLine(doc, mX, pageH - 9, pageW - mX, C.emas, 0.5)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.abuGelap)
        doc.text(`Dicetak oleh: ${namaUser}  |  ${dicetak}`, mX, pageH - 5)
        doc.text(
          `Halaman ${pg} dari ${total} — ${INSTITUSI.nama}`,
          pageW / 2, pageH - 5, { align: 'center' },
        )
        doc.text('Dokumen ini bersifat rahasia', pageW - mX, pageH - 5, { align: 'right' })
      }

      // ── Halaman 1: KOP + KPI + Breakdown Pendapatan ──────────────────────────
      let y = renderKOP(doc, 1, pageW, pageH, mX, periodLabel, logoBase64)

      // ── BAGIAN 1: Ringkasan Keuangan (KPI boxes) ─────────────────────────────
      const kpiIds = ['saldo_awal', 'm1', 'm2', 'saldo']
      const kpiAccents: Record<string, [number, number, number]> = {
        saldo_awal: [90, 95, 120],
        m1:         C.hijauSaldo,
        m2:         C.merahMuda,
        saldo:      C.ungu,
      }
      const kpiItems = metrics.filter(m => kpiIds.includes(m.id))

      // Section label
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...C.gelapHeader)
      doc.text('RINGKASAN POSISI KEUANGAN', mX, y + 4)
      drawLine(doc, mX, y + 5.5, pageW - mX, C.emas, 0.35)
      y += 8

      const kpiW   = (pageW - mX * 2 - 3 * 4) / 4
      const kpiGap = 4
      kpiItems.forEach((m, i) => {
        const kx = mX + i * (kpiW + kpiGap)
        const fmtVal = (m.format === 'count')
          ? m.value.toLocaleString('id-ID')
          : formatRupiahSingkat(m.value)
        const subtitle = m.value >= 1_000_000 && m.format !== 'count'
          ? formatRupiah(m.value)
          : undefined
        drawKpiBox(doc, kx, y, kpiW, m.label, fmtVal, subtitle,
                   kpiAccents[m.id] ?? C.ungu)
      })
      y += 25

      // ── BAGIAN 2: Tabel Breakdown Sumber Pendapatan ───────────────────────────
      if (revenueBreakdown.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...C.gelapHeader)
        doc.text('KOMPOSISI SUMBER PENDAPATAN', mX, y + 4)
        drawLine(doc, mX, y + 5.5, pageW - mX, C.emas, 0.35)
        y += 8

        const grandTotal = revenueBreakdown.reduce((s, r) => s + r.total, 0)
        const totalTx    = revenueBreakdown.reduce((s, r) => s + r.count, 0)

        const tableHead = [['No', 'Jenis Pendapatan', 'Kode', 'Jumlah Transaksi', 'Total Pendapatan (Rp)', 'Kontribusi']]
        const tableBody = revenueBreakdown.map((r, i) => [
          String(i + 1),
          r.label,
          r.kode || '—',
          r.count.toLocaleString('id-ID'),
          formatRupiah(r.total),
          `${r.pct}%`,
        ])

        // Baris total
        tableBody.push([
          '', 'TOTAL PENERIMAAN', '',
          totalTx.toLocaleString('id-ID'),
          formatRupiah(grandTotal),
          '100%',
        ])

        autoTable(doc, {
          startY: y,
          head:   tableHead,
          body:   tableBody,
          margin: { left: mX, right: mX },
          styles: {
            fontSize:    8,
            cellPadding: 2.5,
            valign:      'middle',
            font:        'helvetica',
            lineColor:   [210, 213, 225],
            lineWidth:   0.15,
          },
          headStyles: {
            fillColor:   C.gelapHeader,
            textColor:   C.putih,
            fontStyle:   'bold',
            halign:      'center',
            fontSize:    8.5,
            lineWidth:   0,
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 32 },
            4: { halign: 'right',  cellWidth: 52 },
            5: { halign: 'center', cellWidth: 22 },
          },
          alternateRowStyles: { fillColor: C.abuStripe },
          bodyStyles: { textColor: C.hitam },
          didParseCell(data) {
            // Baris TOTAL — highlight
            const lastIdx = tableBody.length - 1
            if (data.row.index === lastIdx) {
              data.cell.styles.fontStyle  = 'bold'
              data.cell.styles.fillColor  = [232, 245, 238]
              data.cell.styles.textColor  = C.hijauTua
            }
          },
          didDrawPage(data) {
            const pg = data.pageNumber
            if (pg > 1) {
              renderKOP(doc, pg, pageW, pageH, mX, periodLabel, logoBase64)
            }
          },
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // ── BAGIAN 3: Indikator Risiko ────────────────────────────────────────────
      // Cek apakah muat di halaman ini atau perlu halaman baru
      const risikoLines = buildRiskNarasi(anomalies)
      const estimasiH   = 14 + risikoLines.length * 5.5
      if (y + estimasiH > pageH - 18) {
        doc.addPage()
        y = renderKOP(doc, doc.internal.getNumberOfPages(), pageW, pageH, mX, periodLabel, logoBase64)
      }

      // Header section
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...C.gelapHeader)
      doc.text('INDIKATOR RISIKO & KEPATUHAN', mX, y + 4)
      drawLine(doc, mX, y + 5.5, pageW - mX, C.emas, 0.35)
      y += 9

      // Kotak narasi
      const narColor: [number, number, number] = anomalies.some(a => a.severity === 'kritis')
        ? C.merahMuda
        : anomalies.some(a => a.severity === 'peringatan')
        ? C.kuning
        : C.hijauSaldo

      const boxH = 6 + risikoLines.length * 5.5
      doc.setFillColor(narColor[0], narColor[1], narColor[2])
      doc.rect(mX, y, 2.5, boxH, 'F')
      doc.setFillColor(248, 249, 252)
      doc.rect(mX + 2.5, y, pageW - mX * 2 - 2.5, boxH, 'F')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.hitam)
      risikoLines.forEach((line, i) => {
        const lineY      = y + 4.5 + i * 5.5
        const isBold     = !line.startsWith('  •')
        const textColor  = isBold ? narColor : C.hitam
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        doc.setFontSize(isBold ? 8 : 7.5)
        doc.setTextColor(...textColor)
        doc.text(line, mX + 5, lineY, { maxWidth: pageW - mX * 2 - 10 })
      })

      doc.setDrawColor(...C.gelapBorder)
      doc.setLineWidth(0.2)
      doc.rect(mX, y, pageW - mX * 2, boxH, 'D')

      // ── Footer semua halaman ──────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPages = (doc as any).internal.getNumberOfPages() as number
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        renderFooter(i, totalPages)
      }

      // ── Simpan ────────────────────────────────────────────────────────────────
      const safePeriod = periodLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      doc.save(`Laporan_Eksekutif_${safePeriod}.pdf`)

    } finally {
      setExporting(false)
    }
  }, [])

  return { exportPDF, exporting }
}
