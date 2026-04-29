/**
 * usePrintBKUPembantuRekening
 * Template PDF portrait A4 — sederhana, hitam/abu/putih
 * Logo UIN Palopo dari asset lokal
 */
import { useCallback, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BKUEntryWithSaldo } from '../types'
import logoUinPalopo from '../assets/logo-uinpalopo.png'

// ── Muat font TTF dari CDN ────────────────────────────────────────────────
async function loadFontBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf   = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let bin = ''
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin)
  } catch { return null }
}

// ── Palette biru navy premium ─────────────────────────────────────────────
const K = {
  hitam:    [15,  35,  80]  as [number,number,number],  // deep navy (header, total)
  abuGelap: [55,  75, 120]  as [number,number,number],  // slate blue (label)
  abuMid:   [140,158,200]   as [number,number,number],  // steel blue (border)
  abuTerang:[218,226,242]   as [number,number,number],  // light blue-gray (divider)
  abuStripe:[240,244,252]   as [number,number,number],  // blue-tint stripe
  putih:    [255,255,255]   as [number,number,number],
}

function hr(doc: jsPDF, x1:number, y:number, x2:number, w=0.3, color=K.abuTerang) {
  doc.setDrawColor(...color)
  doc.setLineWidth(w)
  doc.line(x1, y, x2, y)
}

function fmtNum(n: number): string {
  return n > 0 ? new Intl.NumberFormat('id-ID').format(n) : '-'
}

function namaBulan(m: number): string {
  return ['Januari','Februari','Maret','April','Mei','Juni',
          'Juli','Agustus','September','Oktober','November','Desember'][m-1] ?? ''
}

function detectBulan(entries: BKUEntryWithSaldo[]): number|null {
  if (!entries.length) return null
  const c: Record<number,number> = {}
  entries.forEach(e => { const m = +e.tanggal.slice(5,7); c[m]=(c[m]??0)+1 })
  return +Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]
}

export interface PrintRekeningOptions {
  entries:        BKUEntryWithSaldo[]
  saldoAkhir:     number
  tahunAnggaran:  number
  namaUnit?:      string
  namaBendahara?: string
  nip?:           string
  namaRekening?:  string
  bulanFilter?:   number|null
  nomorBKU?:      string
  kodeDIPA?:      string
}

export function usePrintBKUPembantuRekening() {
  const [printing, setPrinting] = useState(false)

  const printRekening = useCallback(async (opts: PrintRekeningOptions) => {
    const {
      entries,
      saldoAkhir,
      tahunAnggaran,
      namaUnit       = 'UIN Palopo — Biro Keuangan',
      namaBendahara  = '-',
      nip            = '-',
      namaRekening   = '',
      bulanFilter    = null,
      nomorBKU       = `BKU-001/IV/UINPLP/${tahunAnggaran}`,
      kodeDIPA       = '025.04.2.423451/2025',
    } = opts

    setPrinting(true)

    try {
      const doc   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
      const pageW = doc.internal.pageSize.getWidth()   // 210
      const pageH = doc.internal.pageSize.getHeight()  // 297
      const mX    = 15

      // ── Embed custom fonts (Inter + Plus Jakarta Sans) ─────────────
      const CDN = 'https://cdn.jsdelivr.net/npm'
      const [irB64, ibB64, jrB64, jbB64] = await Promise.all([
        loadFontBase64(`${CDN}/@fontsource/inter@5/files/inter-latin-400-normal.ttf`),
        loadFontBase64(`${CDN}/@fontsource/inter@5/files/inter-latin-700-normal.ttf`),
        loadFontBase64(`${CDN}/@fontsource/plus-jakarta-sans@8/files/plus-jakarta-sans-latin-400-normal.ttf`),
        loadFontBase64(`${CDN}/@fontsource/plus-jakarta-sans@8/files/plus-jakarta-sans-latin-700-normal.ttf`),
      ])
      const HAS_INTER   = !!irB64
      const HAS_JAKARTA = !!jrB64
      if (irB64) { doc.addFileToVFS('Inter-R.ttf', irB64); doc.addFont('Inter-R.ttf', 'Inter', 'normal') }
      if (ibB64) { doc.addFileToVFS('Inter-B.ttf', ibB64); doc.addFont('Inter-B.ttf', 'Inter', 'bold')   }
      if (jrB64) { doc.addFileToVFS('Jakarta-R.ttf', jrB64); doc.addFont('Jakarta-R.ttf', 'Jakarta', 'normal') }
      if (jbB64) { doc.addFileToVFS('Jakarta-B.ttf', jbB64); doc.addFont('Jakarta-B.ttf', 'Jakarta', 'bold')   }

      // Helper: font data (Inter) — untuk angka & body
      const FD = (style: 'normal'|'bold') =>
        HAS_INTER ? ['Inter', style] as const : ['helvetica', style] as const
      // Helper: font heading (Jakarta) — untuk judul & label
      const FH = (style: 'normal'|'bold') =>
        HAS_JAKARTA ? ['Jakarta', style] as const : ['helvetica', style] as const

      const now     = new Date()
      const dicetak = now.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })

      const bulan      = bulanFilter ?? detectBulan(entries)
      const bulanLabel = bulan ? namaBulan(bulan) : `Tahun ${tahunAnggaran}`

      // Tanggal tanda tangan = akhir bulan yang aktif
      const signBulan = bulan ?? (now.getMonth() + 1)
      const signTahun = tahunAnggaran
      const hariAkhir = new Date(signTahun, signBulan, 0).getDate()  // hari terakhir bulan
      const tanggalTtd = new Date(signTahun, signBulan - 1, hariAkhir)
        .toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })

      const totalMasuk  = entries.reduce((s,e) => s + e.debit,  0)
      const totalKeluar = entries.reduce((s,e) => s + e.kredit, 0)

      const periodeStr = (() => {
        if (!entries.length) return `${bulanLabel} ${tahunAnggaran}`
        const d1 = entries[0].tanggal.slice(8,10)
        const d2 = entries[entries.length-1].tanggal.slice(8,10)
        return `${d1} — ${d2} ${bulanLabel} ${tahunAnggaran}`
      })()

      // ════════════════════════════════════════════════════════════════
      // KOP — dipanggil tiap halaman
      // ════════════════════════════════════════════════════════════════
      const renderKOP = (): number => {
        // Logo (kiri)
        try {
          doc.addImage(logoUinPalopo, 'PNG', mX, 6, 18, 18)
        } catch {/**/}

        // Teks institusi (kanan logo)
        const tx = mX + 22
        doc.setFont(...FD('normal'))
        doc.setFontSize(7)
        doc.setTextColor(...K.abuGelap)
        doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', tx, 10)

        doc.setFont(...FH('bold'))
        doc.setFontSize(10)
        doc.setTextColor(...K.hitam)
        doc.text('UNIVERSITAS ISLAM NEGERI PALOPO', tx, 16)

        doc.setFont(...FD('normal'))
        doc.setFontSize(6.5)
        doc.setTextColor(...K.abuGelap)
        doc.text('Jalan Agatis Balandai, Kota Palopo, Sulawesi Selatan 91914', tx, 20.5)
        doc.text('keu.uinpalopo@uinpalopo.ac.id  ·  uinpalopo.ac.id', tx, 24)

        // Garis pemisah bawah KOP — tebal + tipis
        hr(doc, mX, 27, pageW - mX, 0.6, K.hitam)
        hr(doc, mX, 28.2, pageW - mX, 0.25, K.abuMid)

        return 31  // Y awal konten
      }

      let y = renderKOP()

      // ════════════════════════════════════════════════════════════════
      // Label kecil + Judul + Nomor/Bulan/DIPA
      // ════════════════════════════════════════════════════════════════

      // Tag label (abu kecil)
      doc.setFont(...FD('normal'))
      doc.setFontSize(5.5)
      doc.setTextColor(...K.abuMid)
      const tagText = namaRekening
        ? `BUKU PEMBANTU REKENING  ·  ${namaRekening.toUpperCase()}`
        : 'LAPORAN KEUANGAN  ·  PNBP/BLU'
      doc.text(tagText, mX, y + 3)

      // Judul kapital
      doc.setFont(...FH('bold'))
      doc.setFontSize(13)
      doc.setTextColor(...K.hitam)
      doc.text('BUKU KAS UMUM', mX, y + 9)

      // Sub-judul
      doc.setFont(...FD('normal'))
      doc.setFontSize(6.5)
      doc.setTextColor(...K.abuGelap)
      doc.text('General Cash Ledger', mX, y + 13.5)

      // Garis tipis bawah judul
      hr(doc, mX, y + 15, pageW / 2 - 5, 0.2, K.abuTerang)

      // Nomor / Bulan / DIPA (kanan) — sejajar vertikal dengan judul
      const infoRX = pageW - mX - 68
      const metaRows = [
        { l:'Nomor', v: nomorBKU },
        { l:'Bulan', v: `${bulanLabel} ${tahunAnggaran}` },
        { l:'DIPA',  v: kodeDIPA },
      ]
      metaRows.forEach(({l,v}, i) => {
        const ry = y + 4 + i * 5.5
        doc.setFont(...FD('bold'))
        doc.setFontSize(6)
        doc.setTextColor(...K.abuGelap)
        doc.text(l, infoRX, ry)
        doc.setFont(...FD('normal'))
        doc.setFontSize(6.5)
        doc.setTextColor(...K.hitam)
        doc.text(v, infoRX + 11, ry)
        hr(doc, infoRX, ry + 1, pageW - mX, 0.15, K.abuTerang)
      })

      y += 19

      // ════════════════════════════════════════════════════════════════
      // Tabel info header (Unit Kerja | Jenis Kas | Bendahara | Periode)
      // ════════════════════════════════════════════════════════════════
      const iW   = pageW - mX * 2
      const cols = [iW*0.24, iW*0.18, iW*0.36, iW*0.22]
      const hdrs = ['SATUAN KERJA','JENIS KAS','BENDAHARA PENERIMAAN','PERIODE']
      const vals = [
        namaUnit,
        'PNBP / BLU',
        `${namaBendahara}\nNIP. ${nip}`,
        periodeStr,
      ]
      const rowH  = 16
      const hdrH  = 5.5
      let cx = mX
      hdrs.forEach((h, i) => {
        const w = cols[i]
        // header
        doc.setFillColor(...K.hitam)
        doc.rect(cx, y, w, hdrH, 'F')
        doc.setFont(...FD('bold'))
        doc.setFontSize(5.8)
        doc.setTextColor(...K.putih)
        doc.text(h, cx + 2, y + 3.7)
        // value area
        doc.setFillColor(...K.putih)
        doc.rect(cx, y + hdrH, w, rowH - hdrH, 'F')
        doc.setFont(...FD(i === 2 ? 'bold' : 'normal'))
        doc.setFontSize(7.5)
        doc.setTextColor(...K.hitam)
        const lines = vals[i].split('\n')
        lines.forEach((l, li) => {
          if (li > 0) {
            doc.setFont(...FD('normal'))
            doc.setFontSize(6.5)
            doc.setTextColor(...K.abuGelap)
          }
          doc.text(l, cx + 2, y + hdrH + 4.5 + li * 4.2, { maxWidth: w - 4 })
        })
        // border
        doc.setDrawColor(...K.abuMid)
        doc.setLineWidth(0.3)
        doc.rect(cx, y, w, rowH, 'D')
        cx += w
      })
      y += rowH + 5

      // ════════════════════════════════════════════════════════════════
      // Tabel Transaksi — 7 kolom flat
      // Lebar tabel = 180mm, rasio 5:15:10:30:20:20:20 → ×1.5
      // ════════════════════════════════════════════════════════════════
      const head = [['No', 'Tanggal', 'No. Bukti', 'Uraian / Keterangan',
                     'Pendapatan', 'Pengeluaran', 'Saldo']]

      const body = entries.map((e, idx) => [
        String(idx+1),
        (() => { const d=e.tanggal; return `${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(2,4)}` })(),
        e.nomorBukti || '–',
        e.uraian,
        e.debit  > 0 ? fmtNum(e.debit)  : '',
        e.kredit > 0 ? fmtNum(e.kredit) : '',
        fmtNum(e.saldo),
      ])

      // Baris total — background hitam
      const TB = K.hitam
      body.push([
        { content: `TOTAL ${bulanLabel.toUpperCase()} ${tahunAnggaran}`, colSpan:4,
          styles:{ fontStyle:'bold' as const, fillColor: TB, textColor: K.putih,
                   halign:'right' as const, fontSize: 7 }},
        { content: fmtNum(totalMasuk),  styles:{ fontStyle:'bold' as const, fillColor: TB, textColor: K.putih, halign:'right' as const, fontSize: 7 }},
        { content: fmtNum(totalKeluar), styles:{ fontStyle:'bold' as const, fillColor: TB, textColor: K.putih, halign:'right' as const, fontSize: 7 }},
        { content: fmtNum(saldoAkhir),  styles:{ fontStyle:'bold' as const, fillColor: TB, textColor: K.putih, halign:'right' as const, fontSize: 7 }},
      ])

      autoTable(doc, {
        startY: y,
        head,
        body,
        margin: { left: mX, right: mX },
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
          font: HAS_INTER ? 'Inter' : 'helvetica',
          lineColor: K.abuTerang,
          lineWidth: 0.2,
          textColor: K.hitam,
        },
        headStyles: {
          fillColor:   [10, 25, 65] as [number,number,number],  // navy paling gelap
          textColor:   K.putih,
          fontStyle:   'bold',
          halign:      'center',
          fontSize:    7.5,
          cellPadding: 3,
          font: HAS_JAKARTA ? 'Jakarta' : 'helvetica',
          lineColor:   [10, 25, 65] as [number,number,number],  // border senada
          lineWidth:   0.1,
        },
        // 5:15:10:30:20:20:20 → normalisasi ke 180mm (÷120×180)
        columnStyles: {
          0: { halign:'center', cellWidth:  7.5 },  //  5%
          1: { halign:'center', cellWidth: 22.5 },  // 15%
          2: { halign:'center', cellWidth: 15   },  // 10%
          3: { halign:'left',   cellWidth: 45   },  // 30%
          4: { halign:'right',  cellWidth: 30   },  // 20%
          5: { halign:'right',  cellWidth: 30   },  // 20%
          6: { halign:'right',  cellWidth: 30   },  // 20%
        },
        alternateRowStyles: { fillColor: K.abuStripe },
        didDrawPage(data) {
          if (data.pageNumber > 1) renderKOP()
          // Footer
          hr(doc, mX, pageH - 12, pageW - mX, 0.3, K.abuMid)
          doc.setFontSize(6.5)
          doc.setFont(...FD('normal'))
          doc.setTextColor(...K.abuGelap)
          doc.text(`BKU — UIN PALOPO — ${bulanLabel.toUpperCase()} ${tahunAnggaran}`, mX, pageH - 8.5)
          doc.text(`Dicetak: ${dicetak}`, mX, pageH - 5.5)
          doc.text('SAH APABILA DITANDATANGANI BENDAHARA PENERIMAAN', pageW/2, pageH - 5.5, {align:'center'})
          doc.text(`Hal. ${data.pageNumber}`, pageW - mX, pageH - 5.5, {align:'right'})
        },
      })

      // ════════════════════════════════════════════════════════════════
      // Rekapitulasi Kas + Tanda Tangan
      // ════════════════════════════════════════════════════════════════
      doc.setPage(doc.internal.getNumberOfPages())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let botY = (doc as any).lastAutoTable.finalY as number
      botY += 8

      // ── Kiri: Rekapitulasi ─────────────────────────────────────────
      const rekW = 75
      const rekH = 36

      // Border kotak
      doc.setDrawColor(...K.abuMid)
      doc.setLineWidth(0.3)
      doc.rect(mX, botY, rekW, rekH, 'D')

      // Header kotak — hitam
      doc.setFillColor(...K.hitam)
      doc.rect(mX, botY, rekW, 6.5, 'F')
      doc.setFont(...FH('bold'))
      doc.setFontSize(6.5)
      doc.setTextColor(...K.putih)
      doc.text('REKAPITULASI KAS', mX + 3, botY + 4.5)

      // Format nilai — tampilkan "0" jika kosong, bukan "Rp -"
      const fmtRp = (n: number) => `Rp ${n > 0 ? fmtNum(n) : '0'}`

      const rekRows = [
        { l:'Total Penerimaan',  v: fmtRp(totalMasuk)  },
        { l:'Total Pengeluaran', v: fmtRp(totalKeluar) },
      ]
      rekRows.forEach(({l,v}, i) => {
        const ry = botY + 6.5 + 4 + i * 7
        // zebra
        if (i % 2 === 1) {
          doc.setFillColor(...K.abuStripe)
          doc.rect(mX, ry - 3.5, rekW, 7, 'F')
        }
        doc.setFont(...FD('normal'))
        doc.setFontSize(7)
        doc.setTextColor(...K.hitam)
        doc.text(l, mX + 3, ry)
        doc.setFont(...FD('bold'))
        doc.text(v, mX + rekW - 3, ry, {align:'right'})
      })

      // Garis pemisah sebelum saldo akhir
      const sfLineY = botY + 6.5 + 4 + rekRows.length * 7 + 1
      hr(doc, mX, sfLineY, mX + rekW, 0.5, K.hitam)

      // Saldo akhir — dalam kotak
      const sfY2 = sfLineY + 1
      doc.setFillColor(...K.hitam)
      doc.rect(mX, sfY2, rekW, 8, 'F')
      doc.setFont(...FD('bold'))
      doc.setFontSize(7.5)
      doc.setTextColor(...K.putih)
      doc.text('Saldo Akhir', mX + 3, sfY2 + 5)
      doc.text(fmtRp(saldoAkhir), mX + rekW - 3, sfY2 + 5, {align:'right'})

      // ── Kanan: Tanda Tangan ────────────────────────────────────────
      const signW = 65
      const signX = pageW - mX - signW
      const signY = botY

      // Tanggal akhir bulan aktif
      doc.setFont(...FD('normal'))
      doc.setFontSize(8)
      doc.setTextColor(...K.hitam)
      doc.text(`Palopo, ${tanggalTtd}`, signX + signW/2, signY + 4, {align:'center'})

      doc.setFont(...FH('bold'))
      doc.setFontSize(7.5)
      doc.text('BENDAHARA PENERIMAAN', signX + signW/2, signY + 9, {align:'center'})
      doc.setFont(...FD('normal'))
      doc.setFontSize(7)
      doc.setTextColor(...K.abuGelap)
      doc.text('Universitas Islam Negeri Palopo', signX + signW/2, signY + 13, {align:'center'})

      // Ruang tanda tangan kosong (tanpa stempel)
      const lineY = signY + 30
      doc.setDrawColor(...K.hitam)
      doc.setLineWidth(0.35)
      doc.line(signX + 4, lineY, signX + signW - 4, lineY)

      doc.setFont(...FH('bold'))
      doc.setFontSize(8.5)
      doc.setTextColor(...K.hitam)
      doc.text('SUVRI ABDILLAH, S.Sos', signX + signW/2, lineY + 5, {align:'center'})

      doc.setFont(...FD('normal'))
      doc.setFontSize(7)
      doc.setTextColor(...K.abuGelap)
      doc.text(`NIP. ${nip}`, signX + signW/2, lineY + 9.5, {align:'center'})

      // ── Simpan ─────────────────────────────────────────────────────
      const tag = bulan ? namaBulan(bulan).slice(0,3).toUpperCase() : tahunAnggaran
      doc.save(`BKU_Pembantu_Rekening_${tag}_${tahunAnggaran}.pdf`)

    } finally {
      setPrinting(false)
    }
  }, [])

  return { printRekening, printing }
}
