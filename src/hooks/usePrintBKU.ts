import { useCallback, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BKUEntryWithSaldo } from '../types'
import { formatRupiah, formatTanggal } from '../lib/formatters'

// ── Identitas Institusi ───────────────────────────────────────────────────────
const INSTITUSI = {
  nama:       'UNIVERSITAS ISLAM NEGERI PALOPO',
  singkat:    'UIN PALOPO',
  alamat:     'Jl. Agatis, Kel. Balandai, Kec. Bara, Kota Palopo, Sulawesi Selatan 91914',
  telp:       'Telp. (0471) 22202',
  website:    'www.uinpalopo.ac.id',
  logo:       'https://uinpalopo.ac.id/wp-content/uploads/2024/01/logo-header.png',
}

// Warna tema profesional
const WARNA = {
  hijauTua:   [0,  84,  54]  as [number, number, number],   // #005436 (hijau UIN)
  hijauMuda:  [0, 120,  80]  as [number, number, number],   // #007850
  emasGelap:  [180, 140,  40] as [number, number, number],  // #B48C28
  emasTerang: [212, 175,  55] as [number, number, number],  // #D4AF37
  abuMuda:    [245, 245, 245] as [number, number, number],
  abuGelap:   [80,  80,  80]  as [number, number, number],
  putih:      [255, 255, 255] as [number, number, number],
  hitam:      [20,  20,  20]  as [number, number, number],
}

// Label jabatan berdasarkan tipe BKU
function getLabelBendahara(tipeBKU: string): string {
  if (tipeBKU === 'induk') return 'Bendahara Pengeluaran'
  if (tipeBKU === 'pembantu') return 'Bendahara Pengeluaran Pembantu'
  return 'Bendahara Penerimaan'
}

// Format bulan tutup buku dari entries
function getTanggalTutupBuku(entries: BKUEntryWithSaldo[]): string {
  if (entries.length === 0) return '-'
  const lastEntry = entries[entries.length - 1]
  const d = new Date(lastEntry.tanggal)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return lastDay.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Ambil bulan dari entries untuk caption periode
function getPeriodeLabel(entries: BKUEntryWithSaldo[], tahun: number): string {
  if (entries.length === 0) return `Tahun Anggaran ${tahun}`
  const first = new Date(entries[0].tanggal)
  const last  = new Date(entries[entries.length - 1].tanggal)
  const bulanPertama = first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const bulanTerakhir = last.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  if (bulanPertama === bulanTerakhir) return bulanPertama
  return `${bulanPertama} s.d. ${bulanTerakhir}`
}

export interface PrintBKUOptions {
  entries:            BKUEntryWithSaldo[]
  saldoAkhir:         number
  tahunAnggaran:      number
  namaUnit?:          string
  namaBendahara?:     string
  nip?:               string
  kategoriPembantu?:  string
  tipeBKU?:           'penerimaan' | 'induk' | 'pembantu'
}

// ── Muat logo sebagai base64 ──────────────────────────────────────────────────
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
  } catch {
    return null
  }
}

// ── Gambar garis emas dekoratif ───────────────────────────────────────────────
function garisEmas(doc: jsPDF, x1: number, y: number, x2: number, tebal = 0.8) {
  doc.setDrawColor(...WARNA.emasTerang)
  doc.setLineWidth(tebal)
  doc.line(x1, y, x2, y)
}

function garisHijau(doc: jsPDF, x1: number, y: number, x2: number, tebal = 0.4) {
  doc.setDrawColor(...WARNA.hijauTua)
  doc.setLineWidth(tebal)
  doc.line(x1, y, x2, y)
}

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
      const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW  = doc.internal.pageSize.getWidth()   // 297mm
      const pageH  = doc.internal.pageSize.getHeight()  // 210mm
      const mX     = 15   // margin kiri-kanan
      const now    = new Date()
      const dicetak = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      const labelBendahara = getLabelBendahara(tipeBKU)
      const tanggalTutup   = getTanggalTutupBuku(entries)
      const periodeLabel   = getPeriodeLabel(entries, tahunAnggaran)

      // ── Judul dokumen ────────────────────────────────────────────────────
      let judulUtama: string
      let judulSub:   string | null = null
      if (tipeBKU === 'induk') {
        judulUtama = 'BUKU KAS UMUM (BKU) INDUK PENGELUARAN'
      } else if (tipeBKU === 'pembantu' || kategoriPembantu) {
        judulUtama = 'BUKU KAS PEMBANTU PENERIMAAN'
        judulSub   = kategoriPembantu ? `Rincian Obyek: ${kategoriPembantu.toUpperCase()}` : null
      } else {
        judulUtama = 'BUKU KAS UMUM (BKU) PENERIMAAN'
      }

      // ── Muat logo ────────────────────────────────────────────────────────
      const logoBase64 = await loadLogoBase64()

      // ──────────────────────────────────────────────────────────────────────
      // Fungsi render header — dipanggil di setiap halaman
      // ──────────────────────────────────────────────────────────────────────
      const renderHeader = (pageNum: number) => {
        // Background strip hijau di atas
        doc.setFillColor(...WARNA.hijauTua)
        doc.rect(0, 0, pageW, 8, 'F')

        // Garis emas di bawah strip hijau
        garisEmas(doc, 0, 8, pageW, 1.2)

        // Logo kiri
        const logoX = mX
        const logoY = 10
        const logoH = 22
        if (logoBase64) {
          try {
            doc.addImage(logoBase64, 'PNG', logoX, logoY, logoH, logoH)
          } catch { /* logo gagal muat */ }
        } else {
          // Fallback: kotak placeholder hijau
          doc.setFillColor(...WARNA.hijauMuda)
          doc.roundedRect(logoX, logoY, logoH, logoH, 2, 2, 'F')
          doc.setFontSize(6)
          doc.setTextColor(...WARNA.putih)
          doc.setFont('helvetica', 'bold')
          doc.text('UIN', logoX + logoH / 2, logoY + logoH / 2 + 1, { align: 'center' })
        }

        // Teks identitas — tengah
        const teksX = pageW / 2
        doc.setTextColor(...WARNA.hijauTua)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', teksX, 14, { align: 'center' })

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(INSTITUSI.nama, teksX, 20, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...WARNA.abuGelap)
        doc.text(INSTITUSI.alamat, teksX, 25, { align: 'center' })
        doc.text(`${INSTITUSI.telp}  |  ${INSTITUSI.website}`, teksX, 29, { align: 'center' })

        // Garis emas pembatas KOP
        garisEmas(doc, mX, 32, pageW - mX, 0.8)
        garisHijau(doc, mX, 33.2, pageW - mX, 0.3)

        // Judul BKU — di dalam kotak hijau kecil
        const boxY = 35
        const boxH = judulSub ? 14 : 10
        doc.setFillColor(...WARNA.hijauTua)
        doc.roundedRect(mX, boxY, pageW - mX * 2, boxH, 1.5, 1.5, 'F')
        garisEmas(doc, mX, boxY, pageW - mX, 0.5)
        garisEmas(doc, mX, boxY + boxH, pageW - mX, 0.5)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...WARNA.putih)
        doc.text(judulUtama, teksX, boxY + (judulSub ? 5.5 : 6.5), { align: 'center' })

        if (judulSub) {
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...WARNA.emasTerang)
          doc.text(judulSub, teksX, boxY + 11, { align: 'center' })
        }

        // Info unit & periode — baris di bawah judul
        const infoY = boxY + boxH + 4
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...WARNA.hitam)
        doc.text(`Satuan Kerja : ${namaUnit}`, mX, infoY)
        doc.text(`Periode      : ${periodeLabel}`, mX, infoY + 4.5)

        // Halaman di kanan atas
        if (pageNum > 0) {
          doc.setFontSize(7.5)
          doc.setTextColor(...WARNA.abuGelap)
          doc.text(`Halaman ${pageNum}`, pageW - mX, infoY, { align: 'right' })
        }

        // Garis bawah info
        garisHijau(doc, mX, infoY + 7, pageW - mX, 0.3)

        return infoY + 9  // kembalikan posisi Y siap untuk konten
      }

      // Render halaman pertama
      let startY = renderHeader(1)

      // ── Ringkasan transaksi ─────────────────────────────────────────────
      const totalDebit  = entries.reduce((s, e) => s + e.debit, 0)
      const totalKredit = entries.reduce((s, e) => s + e.kredit, 0)
      const jumlahTrx   = entries.filter(e => e.debit > 0 || e.kredit > 0).length

      // Kotak ringkasan 3 kolom
      const ringkasanW = (pageW - mX * 2) / 3
      const ringkasanY = startY
      const ringkasanH = 10

      const ringkasanItems = [
        { label: tipeBKU === 'induk' ? 'Total Pengeluaran' : 'Total Penerimaan',
          value: formatRupiah(tipeBKU === 'induk' ? totalKredit : totalDebit) },
        { label: 'Jumlah Transaksi', value: `${jumlahTrx} transaksi` },
        { label: 'Saldo Akhir',      value: formatRupiah(saldoAkhir) },
      ]

      ringkasanItems.forEach((item, i) => {
        const rx = mX + i * ringkasanW
        // border kiri emas untuk item pertama dan terakhir
        if (i === 0 || i === 2) {
          doc.setFillColor(...WARNA.hijauTua)
        } else {
          doc.setFillColor(...WARNA.hijauMuda)
        }
        doc.roundedRect(rx, ringkasanY, ringkasanW - 1, ringkasanH, 1, 1, 'F')
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...WARNA.emasTerang)
        doc.text(item.label.toUpperCase(), rx + 3, ringkasanY + 3.5)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...WARNA.putih)
        doc.text(item.value, rx + 3, ringkasanY + 8)
      })

      startY = ringkasanY + ringkasanH + 4

      // ── Info bendahara (kiri) ───────────────────────────────────────────
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...WARNA.hitam)
      doc.text(`${labelBendahara}  :  ${namaBendahara}`, mX, startY)
      doc.text(`NIP                           :  ${nip}`, mX, startY + 4.5)

      startY = startY + 9

      // ── Tabel data ──────────────────────────────────────────────────────
      const head = [['No', 'Tanggal', 'No. Bukti', 'Uraian / Keterangan', 'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo']]

      const body = entries.map((e, idx) => [
        String(idx + 1),
        formatTanggal(e.tanggal),
        e.nomorBukti || '-',
        e.uraian,
        e.debit  > 0 ? formatRupiah(e.debit)  : '—',
        e.kredit > 0 ? formatRupiah(e.kredit) : '—',
        formatRupiah(e.saldo),
      ])

      // Baris total
      body.push([
        '', '', '',
        'JUMLAH',
        tipeBKU === 'induk' ? '—' : formatRupiah(totalDebit),
        tipeBKU === 'induk' ? formatRupiah(totalKredit) : '—',
        '',
      ])
      body.push(['', '', '', 'SALDO AKHIR', '', '', formatRupiah(saldoAkhir)])

      autoTable(doc, {
        startY,
        head,
        body,
        margin:  { left: mX, right: mX },
        styles:  { fontSize: 8, cellPadding: 2.2, valign: 'middle', font: 'helvetica' },
        headStyles: {
          fillColor:  WARNA.hijauTua,
          textColor:  WARNA.putih,
          fontStyle:  'bold',
          halign:     'center',
          fontSize:   8,
          lineWidth:  0,
        },
        columnStyles: {
          0: { halign: 'center',  cellWidth: 9  },
          1: { halign: 'center',  cellWidth: 26 },
          2: { halign: 'center',  cellWidth: 30 },
          3: { cellWidth: 'auto' },
          4: { halign: 'right',   cellWidth: 36 },
          5: { halign: 'right',   cellWidth: 36 },
          6: { halign: 'right',   cellWidth: 36 },
        },
        alternateRowStyles: { fillColor: [248, 250, 248] },
        bodyStyles: { textColor: WARNA.hitam, lineColor: [220, 225, 220], lineWidth: 0.15 },
        // Style baris Jumlah & Saldo Akhir
        didParseCell(data) {
          const lastIdx  = body.length - 1
          const totalIdx = body.length - 2
          if (data.row.index === totalIdx) {
            data.cell.styles.fontStyle  = 'bold'
            data.cell.styles.fillColor  = [230, 245, 235]
            data.cell.styles.textColor  = WARNA.hijauTua
          }
          if (data.row.index === lastIdx) {
            data.cell.styles.fontStyle  = 'bold'
            data.cell.styles.fillColor  = WARNA.hijauTua
            data.cell.styles.textColor  = WARNA.putih
          }
        },
        // Re-render header di setiap halaman baru
        didDrawPage(data) {
          const pg = data.pageNumber
          if (pg > 1) {
            renderHeader(pg)
          }
          // Footer garis emas
          garisEmas(doc, mX, pageH - 9, pageW - mX, 0.5)
          // Footer teks
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...WARNA.abuGelap)
          doc.text(`Dicetak: ${dicetak}`, mX, pageH - 5)
          doc.text(
            `Halaman ${pg} dari {total_pages} — ${INSTITUSI.nama}`,
            pageW / 2, pageH - 5, { align: 'center' }
          )
        },
      })

      // Ganti placeholder jumlah halaman
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const total = (doc as any).internal.getNumberOfPages() as number
      for (let i = 1; i <= total; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(...WARNA.abuGelap)
        // Tulis ulang footer dengan total halaman yang benar
        doc.setFillColor(255, 255, 255)
        doc.rect(pageW / 2 - 80, pageH - 8, 160, 5, 'F')
        doc.text(
          `Halaman ${i} dari ${total} — ${INSTITUSI.nama}`,
          pageW / 2, pageH - 5, { align: 'center' }
        )
      }

      // ── Blok Tanda Tangan ─────────────────────────────────────────────
      doc.setPage(total)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY as number
      const signY  = finalY + 8
      const spaceLeft = pageH - signY - 12

      if (spaceLeft >= 40) {
        const signBoxX  = pageW - mX - 70
        const signBoxW  = 70

        // Label tanggal tutup buku
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...WARNA.hitam)
        doc.text(`Tutup buku tanggal : ${tanggalTutup}`, mX, signY)

        // Kotak tanda tangan
        doc.setFillColor(...WARNA.hijauTua)
        doc.roundedRect(signBoxX, signY - 2, signBoxW, 6, 1, 1, 'F')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...WARNA.putih)
        doc.text(labelBendahara + ',', signBoxX + signBoxW / 2, signY + 2.5, { align: 'center' })

        // Area tanda tangan (ruang kosong)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...WARNA.abuGelap)
        doc.text('Palopo, ' + dicetak.split(', ').slice(1).join(', '), signBoxX + signBoxW / 2, signY + 7, { align: 'center' })

        // Garis tanda tangan
        const lineY = signY + 30
        doc.setDrawColor(...WARNA.hitam)
        doc.setLineWidth(0.3)
        doc.line(signBoxX + 5, lineY, signBoxX + signBoxW - 5, lineY)

        // Nama & NIP
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...WARNA.hitam)
        doc.text(namaBendahara, signBoxX + signBoxW / 2, lineY + 4.5, { align: 'center' })

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...WARNA.abuGelap)
        doc.text(`NIP. ${nip}`, signBoxX + signBoxW / 2, lineY + 9, { align: 'center' })

        // Garis bawah dekoratif
        garisEmas(doc, signBoxX, lineY + 12, signBoxX + signBoxW, 0.5)
      }

      // ── Simpan PDF ─────────────────────────────────────────────────────
      const tipeLabel = tipeBKU === 'induk' ? 'Induk' : (tipeBKU === 'pembantu' ? 'Pembantu' : 'Penerimaan')
      const filename  = `BKU_${tipeLabel}_${tahunAnggaran}.pdf`
      doc.save(filename)

    } finally {
      setPrinting(false)
    }
  }, [])

  return { printBKU, printing }
}
