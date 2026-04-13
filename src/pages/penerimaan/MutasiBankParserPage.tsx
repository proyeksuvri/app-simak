/**
 * MutasiBankParserPage — Parser mutasi bank (BRI NLedger CSV/Excel) → Template Upload Massal
 *
 * Alur kerja:
 *   1. Upload file mutasi bank (CSV / XLSX / XLS dari BRI NLedger)
 *   2. Parser membaca dan memfilter baris data valid
 *   3. User mengatur konfigurasi: tipe transaksi, rekening bank, kategori default
 *   4. Preview tabel hasil parsing
 *   5. Unduh file Excel yang kompatibel dengan BulkUploadModal (template upload massal)
 *   6. Upload file Excel tersebut secara manual via halaman BPN/BPK → Upload Massal
 *
 * Format yang didukung:
 *
 * 1. BRI Internet Banking / Account Statement (Excel):
 *    Header: TANGGAL | TIME | REMARK | DEBET | CREDIT | TELLER ID
 *    Tanggal: DD/MM/YY (2-digit year, misal: 31/01/26)
 *    Angka: 1.800.000,00 (titik=ribuan, koma=desimal) — 0,00 untuk nol
 *
 * 2. BRI CMS NLedger (CSV semicolon-delimited, 11 kolom):
 *    Row 1 header: textbox50;textbox88;textbox55;textbox74;textbox9;textbox56;textbox59;textbox18;textbox72;textbox104;textbox14
 *    textbox56=tanggal (DD/MM/YYYY), textbox59=waktu, textbox18=remark,
 *    textbox72=debet, textbox104=kredit, textbox14=teller_id
 */

import { useRef, useState, useMemo, Fragment } from 'react'
import * as XLSX from 'xlsx'
import { PageContainer }        from '../../components/layout/PageContainer'
import { Card }                 from '../../components/ui/Card'
import { Button }               from '../../components/ui/Button'
import { useBankAccounts }      from '../../hooks/useBankAccounts'
import { useRevenueCategories } from '../../hooks/useRevenueCategories'
import { formatRupiah }         from '../../lib/formatters'

// ─── Kartu Ringkasan ──────────────────────────────────────────────────────────

type CardAccent = 'green' | 'red' | 'blue' | 'purple'

const accentStyles: Record<CardAccent, { iconBg: string; iconBorder: string; iconColor: string; valueColor: string; diffColor: string }> = {
  green:  { iconBg: 'rgba(74,222,128,0.12)',  iconBorder: 'rgba(74,222,128,0.2)',  iconColor: '#4ade80', valueColor: '#86efac', diffColor: '#4ade80' },
  red:    { iconBg: 'rgba(248,113,113,0.12)', iconBorder: 'rgba(248,113,113,0.2)', iconColor: '#f87171', valueColor: '#fca5a5', diffColor: '#f87171' },
  blue:   { iconBg: 'rgba(96,165,250,0.12)',  iconBorder: 'rgba(96,165,250,0.2)',  iconColor: '#60a5fa', valueColor: '#93c5fd', diffColor: '#60a5fa' },
  purple: { iconBg: 'rgba(108,72,209,0.15)',  iconBorder: 'rgba(108,72,209,0.25)', iconColor: '#9B6DFF', valueColor: '#c4b5fd', diffColor: '#9B6DFF' },
}

interface SummaryCardProps {
  icon:        string
  label:       string
  valueFile:   number   // total di seluruh file (sumber)
  valueExport: number   // total baris dipilih (export)
  countFile:   number
  countExport: number
  accent:      CardAccent
  format?:     'rupiah' | 'count'
}

function SummaryCard({ icon, label, valueFile, valueExport, countFile, countExport, accent, format = 'rupiah' }: SummaryCardProps) {
  const c      = accentStyles[accent]
  const diff   = valueFile - valueExport
  const pct    = valueFile > 0 ? Math.round((valueExport / valueFile) * 100) : 0
  const allSel = valueFile === valueExport
  const fmt    = (v: number) => format === 'count' ? `${v} baris` : formatRupiah(v)

  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-xl"
      style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.iconBg, border: `1px solid ${c.iconBorder}` }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1rem', color: c.iconColor, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >
            {icon}
          </span>
        </div>
        <p className="text-[0.65rem] uppercase tracking-widest font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>
          {label}
        </p>
      </div>

      {/* Baris sumber */}
      <div>
        <p className="text-[0.6rem] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(232,234,240,0.3)' }}>
          Sumber File ({countFile} baris)
        </p>
        <p className="text-xl font-bold font-headline tabular-nums leading-tight" style={{ color: c.valueColor }}>
          {fmt(valueFile)}
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* Baris dipilih / export */}
      <div>
        <p className="text-[0.6rem] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(232,234,240,0.3)' }}>
          Dipilih / Export ({countExport} baris)
        </p>
        <p className="text-lg font-bold font-headline tabular-nums leading-tight" style={{ color: c.valueColor }}>
          {fmt(valueExport)}
        </p>
      </div>

      {/* Indikator selisih */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {allSel ? (
          <span className="text-[0.65rem] font-medium" style={{ color: c.diffColor }}>
            Semua baris dipilih
          </span>
        ) : (
          <span className="text-[0.65rem]" style={{ color: 'rgba(232,234,240,0.35)' }}>
            Selisih: <span style={{ color: c.diffColor }}>{fmt(diff)}</span>
          </span>
        )}
        <span
          className="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: c.iconBg, color: c.iconColor }}
        >
          {pct}%
        </span>
      </div>
    </div>
  )
}

// ─── Tipe ────────────────────────────────────────────────────────────────────

type TxType = 'IN' | 'OUT'

interface MutasiRow {
  idx:        number
  tanggal:    string        // YYYY-MM-DD
  waktu:      string
  deskripsi:  string
  debet:      number
  kredit:     number
  teller_id:  string
  isBriva:    boolean
  isBfva:     boolean
  selected:   boolean
  // NIM auto-detect
  nim?:           string
  nimAngkatan?:   string   // 2 digit, e.g. "23"
  nimFakultas?:   string   // 2 digit kode fakultas, e.g. "01"
  nimProdi?:      string   // 4 digit kode prodi, e.g. "0101"
  nimNomorUrut?:  string   // 4 digit nomor urut
  // Per-row overrides (auto-filled jika NIM terdeteksi, atau manual)
  kategori?:          string
  jenis_pendapatan?:  string
  sumber_pendapatan?: string
  unit_kerja?:        string
  isManualEdit?:      boolean   // true jika user sudah mengedit manual
}

// ─── Tabel Kode Fakultas & Program Studi (UIN Palopo) ───────────────────────

const FAKULTAS_NAMES: Record<string, string> = {
  '01': 'Fakultas Ushuluddin, Adab & Dakwah',
  '02': 'Fakultas Syariah',
  '03': 'Fakultas Tarbiyah & Ilmu Keguruan',
  '04': 'Fakultas Ekonomi & Bisnis Islam',
  '05': 'Fakultas Sains & Teknologi',
}

const PRODI_NAMES: Record<string, string> = {
  '0101': 'Ilmu Al-Quran & Tafsir',      '0102': 'Komunikasi & Penyiaran Islam',
  '0103': 'Bimbingan Konseling Islam',    '0104': 'Manajemen Dakwah',
  '0201': 'Ahwal Syakhshiyah',            '0202': 'Hukum Ekonomi Syariah',
  '0203': 'Hukum Tata Negara',            '0204': 'Perbandingan Mazhab',
  '0205': 'Hukum Pidana Islam',           '0206': 'Ilmu Falak',
  '0207': 'Hukum Keluarga Islam',         '0208': 'Hukum Islam',
  '0301': 'Pendidikan Agama Islam',       '0302': 'Pendidikan Bahasa Arab',
  '0303': 'Manajemen Pendidikan Islam',
  '0401': 'Ekonomi Syariah',             '0402': 'Perbankan Syariah',
  '0403': 'Akuntansi Syariah',           '0404': 'Manajemen Bisnis Syariah',
  '0501': 'Informatika',                 '0502': 'Sistem Informasi',
  '0503': 'Teknik Pertambangan',         '0504': 'Fisika',
  '0505': 'Matematika',                  '0506': 'Biologi',
  '0507': 'Tadris Fisika',
}

/** Ekstrak NIM dari teks deskripsi (pola: 71998 diikuti 10 digit angka) */
function extractNim(deskripsi: string): string | null {
  const m = deskripsi.match(/71998(\d{10})/)
  return m ? m[1] : null
}

/** Parse komponen NIM 10 digit */
function parseNim(nim: string) {
  return {
    angkatan:  nim.slice(0, 2),        // e.g. "23"
    fakultas:  nim.slice(2, 4),        // e.g. "01"
    prodi:     nim.slice(2, 6),        // e.g. "0101" (includes faculty code)
    nomorUrut: nim.slice(6, 10),       // e.g. "0048"
  }
}

/** Buat field UKT otomatis dari NIM */
function buildUktFields() {
  return {
    kategori:          'Pendapatan Akademik',
    jenis_pendapatan:  'Pendapatan jasa pelayanan pendidikan',
    sumber_pendapatan: 'Pendapatan Uang Kuliah Tunggal (UKT)',
    unit_kerja:        'Rektorat',
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Konversi berbagai format tanggal → YYYY-MM-DD */
function parseTanggal(raw: unknown): string {
  // JS Date object (dari cellDates: true di XLSX)
  if (raw instanceof Date) {
    const y  = raw.getFullYear()
    const mo = String(raw.getMonth() + 1).padStart(2, '0')
    const d  = String(raw.getDate()).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  const s = String(raw).trim()
  // DD/MM/YYYY (4-digit year)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  // DD/MM/YY (2-digit year) — BRI Internet Banking
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (m2) return `20${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  // DD-MM-YYYY
  const m3 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m3) return `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`
  // YYYY-MM-DD sudah benar
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return s
}

/**
 * Parse angka dari format BRI:
 *   "1.800.000,00" (titik=ribuan, koma=desimal) → 1800000   [BRI Internet Banking]
 *   "1,800,000.00" (koma=ribuan, titik=desimal) → 1800000   [BRI NLedger]
 *   "0,00" atau "0.00" atau "0"                 → 0
 */
function parseNominal(raw: string | number): number {
  if (typeof raw === 'number') return Math.round(raw)
  const s = String(raw).trim()
  if (!s || s === '0' || s === '0,00' || s === '0.00' || s === '00.00') return 0
  // Jika ada titik dan koma — deteksi mana desimal
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',')
    const lastDot   = s.lastIndexOf('.')
    if (lastDot > lastComma) {
      // Format: 1,800,000.00 (koma = ribuan, titik = desimal)
      return Math.round(parseFloat(s.replace(/,/g, '')) || 0)
    } else {
      // Format: 1.800.000,00 (titik = ribuan, koma = desimal)
      return Math.round(parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0)
    }
  }
  // Hanya koma — misal "1800000,00" (desimal koma tanpa ribuan titik)
  if (s.includes(',') && !s.includes('.')) {
    return Math.round(parseFloat(s.replace(',', '.')) || 0)
  }
  // Hanya titik — misal "1800000.00"
  return Math.round(parseFloat(s) || 0)
}

/** Highlight substring yang cocok dengan query dalam teks */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#6C48D1]/40 text-[#c4b5fd] rounded-sm px-0.5 not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

/** Cek apakah nilai adalah tanggal yang valid */
function isTanggalValid(raw: unknown): boolean {
  // JS Date object (dari cellDates: true)
  if (raw instanceof Date) return !isNaN(raw.getTime())
  const s = String(raw).trim()
  // DD/MM/YY atau DD/MM/YYYY
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export function MutasiBankParserPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const { accounts }            = useBankAccounts(true)
  const { categories: revCats } = useRevenueCategories()

  const [rows,      setRows]      = useState<MutasiRow[]>([])
  const [fileName,  setFileName]  = useState('')
  const [dragOver,  setDragOver]  = useState(false)
  const [parseErr,  setParseErr]  = useState('')

  // Saldo awal (diinput manual sebelum parsing)
  const [saldoAwalStr, setSaldoAwalStr] = useState('')

  const saldoAwal = useMemo(() => {
    const cleaned = saldoAwalStr.replace(/[^0-9]/g, '')
    return cleaned ? parseInt(cleaned, 10) : 0
  }, [saldoAwalStr])

  // Edit modal
  const [editRowIdx, setEditRowIdx] = useState<number | null>(null)

  function updateRow(idx: number, patch: Partial<MutasiRow>) {
    setRows(prev => prev.map(r => r.idx === idx ? { ...r, ...patch, isManualEdit: true } : r))
  }

  function closeEdit() { setEditRowIdx(null) }

  // Konfigurasi output
  const [txType,          setTxType]          = useState<TxType>('IN')
  const [rekeningBank,    setRekeningBank]     = useState('')
  const [kategoriDefault, setKategoriDefault] = useState('')
  const [filterMode,      setFilterMode]      = useState<'all' | 'kredit' | 'debet'>('kredit')

  // ── Parse file ──────────────────────────────────────────────────────────────

  function parseFile(file: File) {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setParseErr('Format PDF belum didukung. Silakan export mutasi sebagai CSV atau Excel dari BRI Internet Banking / BRI CMS.')
      return
    }
    setParseErr('')
    setFileName(file.name)
    setRows([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        // cellDates: true → sel tanggal Excel dikembalikan sebagai JS Date (bukan serial number)
        const wb   = XLSX.read(data, { type: 'array', cellDates: true })
        const ws   = wb.Sheets[wb.SheetNames[0]]

        // raw: true → angka dikembalikan sebagai number, Date sebagai Date object
        const jsonRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          defval: '',
          raw:    true,
          header: 1,
        }) as unknown[][]

        if (jsonRows.length < 2) {
          setParseErr('File tidak berisi data yang cukup.')
          return
        }

        // ── Cari baris header: scan seluruh baris sampai ketemu "tanggal" ──────
        // File BRI Internet Banking memiliki beberapa baris preamble (nama bank,
        // info akun, periode) sebelum baris header data aktual.
        let headerRowIdx = -1
        let idxTanggal   = -1
        let idxWaktu     = -1
        let idxRemark    = -1
        let idxDebet     = -1
        let idxKredit    = -1
        let idxTeller    = -1

        for (let r = 0; r < Math.min(jsonRows.length, 30); r++) {
          const cells = jsonRows[r].map(v => String(v ?? '').trim().toLowerCase())

          // ── BRI Internet Banking: TANGGAL | TIME | REMARK | DEBET | CREDIT | TELLER ID
          const tIB  = cells.findIndex(h => h === 'tanggal')
          const rkIB = cells.findIndex(h => h === 'remark')
          if (tIB !== -1 && rkIB !== -1) {
            headerRowIdx = r
            idxTanggal   = tIB
            idxWaktu     = cells.findIndex(h => h === 'time')
            idxRemark    = rkIB
            idxDebet     = cells.findIndex(h => h === 'debet')
            idxKredit    = cells.findIndex(h => h === 'credit')
            idxTeller    = cells.findIndex(h => h === 'teller id' || h === 'teller_id')
            break
          }

          // ── BRI NLedger: textbox56 | textbox59 | textbox18 | textbox72 | textbox104 | textbox14
          const tNL = cells.indexOf('textbox56')
          if (tNL !== -1) {
            headerRowIdx = r
            idxTanggal   = tNL
            idxWaktu     = cells.indexOf('textbox59')
            idxRemark    = cells.indexOf('textbox18')
            idxDebet     = cells.indexOf('textbox72')
            idxKredit    = cells.indexOf('textbox104')
            idxTeller    = cells.indexOf('textbox14')
            break
          }
        }

        if (headerRowIdx === -1 || idxTanggal === -1 || idxRemark === -1) {
          setParseErr('Format file tidak dikenali. Header kolom TANGGAL/REMARK tidak ditemukan. Pastikan file adalah Account Statement dari BRI Internet Banking atau BRI CMS NLedger.')
          return
        }

        const parsed: MutasiRow[] = []

        // Mulai dari baris setelah header
        for (let i = headerRowIdx + 1; i < jsonRows.length; i++) {
          const row = jsonRows[i]
          if (!row || row.length === 0) continue

          // Ambil nilai kolom berdasarkan indeks yang ditemukan saat scan header
          // tanggalRaw bisa berupa Date object (cellDates:true) atau string
          const tanggalRaw: unknown = row[idxTanggal] ?? ''
          const waktuRaw   = String(idxWaktu  >= 0 ? row[idxWaktu]  : '').trim()
          const remarkRaw  = String(row[idxRemark] ?? '').trim()
          const debetRaw   = idxDebet  >= 0 ? row[idxDebet]  : ''
          const kreditRaw  = idxKredit >= 0 ? row[idxKredit] : ''
          const tellerRaw  = String(idxTeller >= 0 ? row[idxTeller] : '').trim()

          // Filter: skip baris yang tidak memiliki tanggal valid
          if (!isTanggalValid(tanggalRaw)) continue
          // Skip baris kosong
          if (!remarkRaw && !kreditRaw && !debetRaw) continue

          const deskripsi = remarkRaw
          const debet     = parseNominal(debetRaw as string | number)
          const kredit    = parseNominal(kreditRaw as string | number)

          const nim      = extractNim(deskripsi)
          const nimParts = nim ? parseNim(nim) : null
          const uktFields = nim ? buildUktFields() : {}

          parsed.push({
            idx:       parsed.length,
            tanggal:   parseTanggal(tanggalRaw),
            waktu:     waktuRaw,
            deskripsi,
            debet,
            kredit,
            teller_id:  tellerRaw,
            isBriva:    /BRIVA/i.test(deskripsi),
            isBfva:     /BFVA/i.test(deskripsi),
            selected:   true,
            // NIM
            ...(nim && nimParts ? {
              nim,
              nimAngkatan:  nimParts.angkatan,
              nimFakultas:  nimParts.fakultas,
              nimProdi:     nimParts.prodi,
              nimNomorUrut: nimParts.nomorUrut,
            } : {}),
            // Auto-fill UKT
            ...uktFields,
          })
        }

        if (parsed.length === 0) {
          setParseErr('Tidak ada baris data valid yang ditemukan. Pastikan file adalah mutasi BRI (CSV/Excel) dari BRI Internet Banking atau BRI CMS NLedger.')
          return
        }

        setRows(parsed)
      } catch (err) {
        console.error(err)
        setParseErr('File tidak dapat dibaca. Pastikan format file benar (.xlsx, .xls, atau .csv).')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  // ── Toggle pilih baris ──────────────────────────────────────────────────────

  function toggleRow(idx: number) {
    setRows(prev => prev.map(r => r.idx === idx ? { ...r, selected: !r.selected } : r))
  }

  function toggleAll(val: boolean) {
    setRows(prev => prev.map(r => ({ ...r, selected: val })))
  }

  // ── Download template Excel ─────────────────────────────────────────────────

  function downloadTemplate() {
    const filteredRows = rows.filter(r => {
      if (!r.selected) return false
      if (filterMode === 'kredit') return r.kredit > 0
      if (filterMode === 'debet')  return r.debet > 0
      return r.kredit > 0 || r.debet > 0
    })

    if (filteredRows.length === 0) {
      alert('Tidak ada baris yang dipilih / sesuai filter.')
      return
    }

    const headers = txType === 'IN'
      ? ['tanggal', 'no_bukti', 'deskripsi', 'kategori_pendapatan', 'nominal', 'rekening_bank', 'jenis_pendapatan', 'sumber_pendapatan', 'unit_kerja']
      : ['tanggal', 'no_bukti', 'deskripsi', 'kategori_pendapatan', 'nominal', 'rekening_bank', 'unit_kerja']

    const dataRows = filteredRows.map(r => {
      const nominal = txType === 'IN' ? r.kredit : r.debet
      const kat  = r.kategori          || kategoriDefault
      const jns  = r.jenis_pendapatan  || ''
      const smb  = r.sumber_pendapatan || ''
      const uk   = r.unit_kerja        || ''
      if (txType === 'IN') {
        return [r.tanggal, '', r.deskripsi, kat, nominal, rekeningBank, jns, smb, uk]
      } else {
        return [r.tanggal, '', r.deskripsi, kat, nominal, rekeningBank, uk]
      }
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
    ws['!cols'] = headers.map(() => ({ wch: 24 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Mutasi ${txType === 'IN' ? 'BPN' : 'BPK'}`)
    XLSX.writeFile(wb, `mutasi_parsed_${txType === 'IN' ? 'bpn' : 'bpk'}.xlsx`)
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('')

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows.filter(r => {
      // filter mode
      if (filterMode === 'kredit' && r.kredit <= 0) return false
      if (filterMode === 'debet'  && r.debet  <= 0) return false
      if (filterMode !== 'all' && r.kredit <= 0 && r.debet <= 0) return false
      // search
      if (!q) return true
      return (
        r.deskripsi.toLowerCase().includes(q) ||
        r.tanggal.includes(q) ||
        (r.nim ?? '').includes(q) ||
        (r.nimFakultas ?? '').includes(q) ||
        (r.nimProdi ?? '').includes(q) ||
        (r.kategori ?? '').toLowerCase().includes(q) ||
        (r.jenis_pendapatan ?? '').toLowerCase().includes(q) ||
        (r.sumber_pendapatan ?? '').toLowerCase().includes(q) ||
        (r.unit_kerja ?? '').toLowerCase().includes(q) ||
        (r.teller_id ?? '').toLowerCase().includes(q) ||
        String(r.kredit).includes(q) ||
        String(r.debet).includes(q)
      )
    })
  }, [rows, filterMode, searchQuery])

  const selectedVisible = visibleRows.filter(r => r.selected)
  const totalKredit = selectedVisible.reduce((s, r) => s + r.kredit, 0)
  const totalDebet  = selectedVisible.reduce((s, r) => s + r.debet, 0)
  const hasRows     = rows.length > 0

  // ── Statistik validasi: sumber file vs hasil dipilih ───────────────────────
  const stats = useMemo(() => {
    const allKredit = rows.filter(r => r.kredit > 0)
    const allDebet  = rows.filter(r => r.debet  > 0)

    const fileTotalKredit = allKredit.reduce((s, r) => s + r.kredit, 0)
    const fileTotalDebet  = allDebet .reduce((s, r) => s + r.debet,  0)
    const fileSaldo       = fileTotalKredit - fileTotalDebet

    const selKredit = rows.filter(r => r.kredit > 0 && r.selected)
    const selDebet  = rows.filter(r => r.debet  > 0 && r.selected)

    const exportTotalKredit = selKredit.reduce((s, r) => s + r.kredit, 0)
    const exportTotalDebet  = selDebet .reduce((s, r) => s + r.debet,  0)
    const exportSaldo       = exportTotalKredit - exportTotalDebet

    const nimCount     = rows.filter(r => r.nim).length
    const nimSelected  = rows.filter(r => r.nim && r.selected).length

    return {
      fileTotalKredit,  fileCountKredit: allKredit.length,
      fileTotalDebet,   fileCountDebet:  allDebet.length,
      fileSaldo,        fileCountAll:    rows.length,
      exportTotalKredit, exportCountKredit: selKredit.length,
      exportTotalDebet,  exportCountDebet:  selDebet.length,
      exportSaldo,       exportCountAll:    rows.filter(r => r.selected).length,
      nimCount, nimSelected,
    }
  }, [rows])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <PageContainer
      title="Parser Mutasi Bank"
      subtitle="Konversi file mutasi BRI (Internet Banking / CMS NLedger) ke template upload massal"
    >

      {/* ── Upload Area ──────────────────────────────────────────────────────── */}
      {!hasRows && (
        <Card className="mb-4">
          <div className="p-6 space-y-4">

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={[
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                dragOver
                  ? 'border-[#6C48D1] bg-[#6C48D1]/10'
                  : 'border-white/20 hover:border-[#9B6DFF] hover:bg-white/5',
              ].join(' ')}
            >
              <span className="material-symbols-outlined text-5xl text-[#bfc8c4] block mb-3">
                upload_file
              </span>
              <p className="text-body-large text-[#e8eaf0] font-medium">
                Klik atau seret file mutasi bank ke sini
              </p>
              <p className="text-body-small text-[#bfc8c4] mt-1">
                Format didukung: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
              </p>
              <p className="text-[0.7rem] text-[#bfc8c4]/60 mt-1">
                Sumber: BRI Internet Banking (Account Statement) atau BRI CMS NLedger
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            {/* Saldo Awal */}
            <div className="rounded-xl p-4 border border-[#6C48D1]/30 bg-[#6C48D1]/5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                >
                  account_balance
                </span>
                <p className="text-[0.7rem] uppercase tracking-widest font-medium" style={{ color: '#9B6DFF' }}>
                  Saldo Awal Rekening
                </p>
              </div>
              <p className="text-[0.7rem] text-[#bfc8c4]/70 mb-3">
                Input saldo awal sebelum file dimuat. Digunakan untuk menghitung saldo akhir setelah parsing.
              </p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bfc8c4] text-body-small font-medium pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={saldoAwalStr}
                    onChange={e => {
                      const digits = e.target.value.replace(/[^0-9]/g, '')
                      setSaldoAwalStr(digits ? parseInt(digits, 10).toLocaleString('id-ID') : '')
                    }}
                    placeholder="0"
                    className="w-full rounded-lg pl-9 pr-3 py-2 text-body-small bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40 tabular-nums"
                  />
                </div>
                {saldoAwal > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#86efac]" style={{ fontSize: '0.9rem', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-[0.7rem] text-[#86efac] font-medium tabular-nums">{formatRupiah(saldoAwal)}</span>
                  </div>
                )}
              </div>
            </div>

            {parseErr && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#fca5a5]/10 border border-[#fca5a5]/30 text-[#fca5a5] text-body-small">
                <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '1rem' }}>error</span>
                <span>{parseErr}</span>
              </div>
            )}

            {/* Panduan format */}
            <details className="text-xs text-[#bfc8c4]">
              <summary className="cursor-pointer font-medium text-[#e8eaf0] hover:text-[#9B6DFF] transition-colors">
                Panduan Format File BRI NLedger
              </summary>
              <div className="mt-3 space-y-2 text-[#bfc8c4]">
                <p>File CSV/Excel dari BRI CMS (NLedger) memiliki 11 kolom dengan struktur:</p>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3 font-mono text-[0.65rem] leading-relaxed overflow-x-auto">
                  <div className="text-[#86efac]">Row 1 (header): textbox50;textbox88;textbox55;textbox74;textbox9;textbox56;textbox59;textbox18;textbox72;textbox104;textbox14</div>
                  <div className="text-[#e8eaf0] mt-1">Row data: TIME;REMARK;DEBET;CREDIT;TELLER ID;<strong>[tanggal]</strong>;<strong>[waktu]</strong>;<strong>[keterangan]</strong>;<strong>[debet]</strong>;<strong>[kredit]</strong>;<strong>[teller_id]</strong></div>
                </div>
                <p className="text-[0.7rem]">Kolom aktual yang dibaca: <code className="text-[#86efac]">textbox56</code> (tanggal), <code className="text-[#86efac]">textbox18</code> (keterangan), <code className="text-[#86efac]">textbox72</code> (debet), <code className="text-[#86efac]">textbox104</code> (kredit).</p>
              </div>
            </details>

          </div>
        </Card>
      )}

      {/* ── Setelah file diparsing ────────────────────────────────────────────── */}
      {hasRows && (
        <>

          {/* Header info file + reset */}
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-[#1e2430] border border-[#2a303c]">
            <span className="material-symbols-outlined text-[#86efac]">description</span>
            <div className="flex-1 min-w-0">
              <p className="text-body-medium text-[#e8eaf0] font-medium truncate">{fileName}</p>
              <p className="text-body-small text-[#bfc8c4]">
                {rows.length} baris ditemukan &bull;{' '}
                <span className="text-[#86efac]">{selectedVisible.length} dipilih</span>
              </p>
            </div>

            {/* Saldo Awal inline editor */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <span className="material-symbols-outlined text-[#9B6DFF]" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              <div>
                <p className="text-[0.6rem] uppercase tracking-widest text-[#bfc8c4]/50 leading-none mb-1">Saldo Awal</p>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[0.7rem] text-[#bfc8c4] pointer-events-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={saldoAwalStr}
                    onChange={e => {
                      const digits = e.target.value.replace(/[^0-9]/g, '')
                      setSaldoAwalStr(digits ? parseInt(digits, 10).toLocaleString('id-ID') : '')
                    }}
                    placeholder="0"
                    className="w-36 rounded-md pl-7 pr-2 py-1 text-[0.75rem] bg-[#0f1318] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40 tabular-nums"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => { setRows([]); setFileName(''); setParseErr('') }}
              className="p-1.5 rounded-full text-[#bfc8c4] hover:bg-white/10 transition-colors"
              title="Ganti file"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>close</span>
            </button>
          </div>

          {/* ── Kartu Ringkasan Validasi ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <SummaryCard
              icon="arrow_downward"
              label="Total Pendapatan (Kredit)"
              valueFile={stats.fileTotalKredit}
              valueExport={stats.exportTotalKredit}
              countFile={stats.fileCountKredit}
              countExport={stats.exportCountKredit}
              accent="green"
            />
            <SummaryCard
              icon="arrow_upward"
              label="Total Pengeluaran (Debet)"
              valueFile={stats.fileTotalDebet}
              valueExport={stats.exportTotalDebet}
              countFile={stats.fileCountDebet}
              countExport={stats.exportCountDebet}
              accent="red"
            />
            <SummaryCard
              icon="receipt_long"
              label="Jumlah Transaksi"
              valueFile={stats.fileCountAll}
              valueExport={stats.exportCountAll}
              countFile={stats.fileCountAll}
              countExport={stats.exportCountAll}
              accent="blue"
              format="count"
            />
            <SummaryCard
              icon="account_balance_wallet"
              label="Saldo Bersih (Kredit − Debet)"
              valueFile={stats.fileSaldo}
              valueExport={stats.exportSaldo}
              countFile={stats.fileCountAll}
              countExport={stats.exportCountAll}
              accent="purple"
            />
          </div>

          {/* ── Saldo Awal → Saldo Akhir ───────────────────────────────────── */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 px-5 py-4 rounded-xl"
            style={{ background: '#161a21', border: '1px solid rgba(108,72,209,0.25)' }}
          >
            {/* Saldo Awal */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(108,72,209,0.15)', border: '1px solid rgba(108,72,209,0.25)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              </div>
              <div>
                <p className="text-[0.6rem] uppercase tracking-widest text-[#bfc8c4]/50 mb-0.5">Saldo Awal</p>
                {saldoAwal > 0 ? (
                  <p className="text-base font-bold tabular-nums text-[#c4b5fd]">{formatRupiah(saldoAwal)}</p>
                ) : (
                  <p className="text-[0.75rem] text-[#bfc8c4]/50 italic">Belum diinput — edit di header atas</p>
                )}
              </div>
            </div>

            {/* Separator arrow */}
            <div className="flex items-center gap-2 text-[#bfc8c4]/30 flex-shrink-0 self-center">
              <span className="hidden sm:block text-[#86efac]/70 font-bold text-sm">+{formatRupiah(stats.exportTotalKredit)}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'rgba(232,234,240,0.25)' }}>arrow_forward</span>
              <span className="hidden sm:block text-[#fca5a5]/70 font-bold text-sm">−{formatRupiah(stats.exportTotalDebet)}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'rgba(232,234,240,0.25)' }}>arrow_forward</span>
            </div>

            {/* Saldo Akhir */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <div>
                <p className="text-[0.6rem] uppercase tracking-widest text-[#bfc8c4]/50 mb-0.5 text-right">Saldo Akhir (estimasi)</p>
                <p className="text-xl font-bold tabular-nums text-right" style={{ color: (saldoAwal + stats.exportSaldo) >= 0 ? '#86efac' : '#f87171' }}>
                  {formatRupiah(saldoAwal + stats.exportSaldo)}
                </p>
                <p className="text-[0.6rem] text-[#bfc8c4]/40 text-right mt-0.5">
                  {saldoAwal > 0 ? `${formatRupiah(saldoAwal)} + ${formatRupiah(stats.exportTotalKredit)} − ${formatRupiah(stats.exportTotalDebet)}` : `Kredit ${formatRupiah(stats.exportTotalKredit)} − Debet ${formatRupiah(stats.exportTotalDebet)}`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(134,239,172,0.1)', border: '1px solid rgba(134,239,172,0.2)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#86efac', fontVariationSettings: "'FILL' 1" }}>savings</span>
              </div>
            </div>
          </div>

          {/* Konfigurasi output */}
          <Card className="mb-4">
            <div className="p-4">
              <p className="text-body-small font-semibold text-[#e8eaf0] mb-3">Konfigurasi Output Template</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                {/* Tipe Transaksi */}
                <div>
                  <label className="block text-[0.7rem] text-[#bfc8c4] mb-1 font-medium uppercase tracking-wide">Tipe Transaksi</label>
                  <select
                    value={txType}
                    onChange={e => {
                      setTxType(e.target.value as TxType)
                      setFilterMode(e.target.value === 'IN' ? 'kredit' : 'debet')
                    }}
                    className="w-full rounded-lg px-3 py-2 text-body-small bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1]"
                  >
                    <option value="IN">BPN (Penerimaan)</option>
                    <option value="OUT">BPK (Pengeluaran)</option>
                  </select>
                </div>

                {/* Filter tampilan */}
                <div>
                  <label className="block text-[0.7rem] text-[#bfc8c4] mb-1 font-medium uppercase tracking-wide">Filter Baris</label>
                  <select
                    value={filterMode}
                    onChange={e => setFilterMode(e.target.value as 'all' | 'kredit' | 'debet')}
                    className="w-full rounded-lg px-3 py-2 text-body-small bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1]"
                  >
                    <option value="kredit">Hanya Kredit (masuk)</option>
                    <option value="debet">Hanya Debet (keluar)</option>
                    <option value="all">Semua (kredit + debet)</option>
                  </select>
                </div>

                {/* Rekening Bank */}
                <div>
                  <label className="block text-[0.7rem] text-[#bfc8c4] mb-1 font-medium uppercase tracking-wide">Rekening Bank</label>
                  {accounts.length > 0 ? (
                    <select
                      value={rekeningBank}
                      onChange={e => setRekeningBank(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-body-small bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1]"
                    >
                      <option value="">-- Pilih rekening --</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.account_number}>
                          {a.bank_name} – {a.account_number}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={rekeningBank}
                      onChange={e => setRekeningBank(e.target.value)}
                      placeholder="No. rekening atau nama bank"
                      className="w-full rounded-lg px-3 py-2 text-body-small bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40"
                    />
                  )}
                </div>

                {/* Kategori Default */}
                <div>
                  <label className="block text-[0.7rem] text-[#bfc8c4] mb-1 font-medium uppercase tracking-wide">Kategori Default</label>
                  {revCats.length > 0 ? (
                    <select
                      value={kategoriDefault}
                      onChange={e => setKategoriDefault(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-body-small bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1]"
                    >
                      <option value="">-- Pilih kategori --</option>
                      {revCats.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={kategoriDefault}
                      onChange={e => setKategoriDefault(e.target.value)}
                      placeholder="Nama kategori pendapatan"
                      className="w-full rounded-lg px-3 py-2 text-body-small bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40"
                    />
                  )}
                  <p className="text-[0.65rem] text-[#bfc8c4]/60 mt-1">
                    Dapat diubah di file Excel sebelum upload
                  </p>
                </div>

              </div>
            </div>
          </Card>

          {/* Summary bar + Search */}
          <div className="flex flex-wrap items-center gap-3 mb-3">

            {/* Kotak pencarian */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none"
                style={{ fontSize: '1rem', color: searchQuery ? '#9B6DFF' : 'rgba(191,200,196,0.4)' }}
              >
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari NIM, deskripsi, tanggal, kategori…"
                className="w-full pl-9 pr-8 py-1.5 rounded-lg text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] placeholder-[#bfc8c4]/35 focus:outline-none focus:border-[#6C48D1] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#bfc8c4]/50 hover:text-[#bfc8c4] transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span>
                </button>
              )}
            </div>

            {/* Info hasil pencarian */}
            {searchQuery && (
              <span className="text-[0.7rem] text-[#bfc8c4]/60 whitespace-nowrap">
                <span className="text-[#9B6DFF] font-semibold">{visibleRows.length}</span> dari {rows.length} baris
              </span>
            )}

            {/* Totals */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#86efac] inline-block" />
                <span className="text-[0.72rem] text-[#bfc8c4]">
                  Kredit: <strong className="text-[#86efac]">{formatRupiah(totalKredit)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#fca5a5] inline-block" />
                <span className="text-[0.72rem] text-[#bfc8c4]">
                  Debet: <strong className="text-[#fca5a5]">{formatRupiah(totalDebet)}</strong>
                </span>
              </div>
              <div className="border-l border-white/10 pl-3 flex items-center gap-2">
                <button onClick={() => toggleAll(true)}  className="text-[0.7rem] text-[#9B6DFF] hover:underline">Pilih Semua</button>
                <span className="text-[#bfc8c4]/30">|</span>
                <button onClick={() => toggleAll(false)} className="text-[0.7rem] text-[#bfc8c4] hover:underline">Batal</button>
              </div>
            </div>
          </div>

          {/* Statistik NIM */}
          {(() => {
            const nimCount = stats.nimCount
            return nimCount > 0 ? (
              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-[#86efac]/5 border border-[#86efac]/15">
                <span className="material-symbols-outlined text-[#86efac]" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>school</span>
                <p className="text-[0.72rem] text-[#86efac]">
                  <strong>{nimCount}</strong> transaksi UKT terdeteksi — kategori, jenis & sumber pendapatan diisi otomatis
                </p>
                <button
                  className="ml-auto text-[0.65rem] text-[#86efac]/70 hover:text-[#86efac] underline"
                  onClick={() => setRows(prev => prev.map(r => r.nim ? { ...r, ...buildUktFields(), isManualEdit: false } : r))}
                >
                  Reset semua ke auto
                </button>
              </div>
            ) : null
          })()}

          {/* Tabel Preview */}
          <Card className="mb-4">
            <div className="overflow-x-auto rounded-xl max-h-[520px]" style={{ colorScheme: 'dark' }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#10131a] border-b border-white/10">
                    <th className="px-3 py-2.5 text-left">
                      <input
                        type="checkbox"
                        checked={visibleRows.length > 0 && visibleRows.every(r => r.selected)}
                        onChange={e => toggleAll(e.target.checked)}
                        className="accent-[#6C48D1]"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-[#e8eaf0] font-medium whitespace-nowrap">#</th>
                    <th className="px-3 py-2.5 text-left text-[#e8eaf0] font-medium whitespace-nowrap">Tanggal</th>
                    <th className="px-3 py-2.5 text-left text-[#e8eaf0] font-medium">Keterangan / NIM</th>
                    <th className="px-3 py-2.5 text-left text-[#e8eaf0] font-medium whitespace-nowrap">Kategori & Mapping</th>
                    <th className="px-3 py-2.5 text-right text-[#e8eaf0] font-medium whitespace-nowrap">Debet</th>
                    <th className="px-3 py-2.5 text-right text-[#e8eaf0] font-medium whitespace-nowrap">Kredit</th>
                    <th className="px-3 py-2.5 text-center text-[#e8eaf0] font-medium whitespace-nowrap">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-[#bfc8c4]">
                        Tidak ada baris yang sesuai filter
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map(row => (
                      <Fragment key={row.idx}>
                        <tr
                          onClick={() => toggleRow(row.idx)}
                          className={[
                            'border-t border-white/5 cursor-pointer transition-colors',
                            editRowIdx === row.idx ? 'bg-[#6C48D1]/10' : row.selected ? 'hover:bg-white/5' : 'opacity-40 hover:opacity-60',
                          ].join(' ')}
                        >
                          <td className="px-3 py-2" onClick={e => { e.stopPropagation(); toggleRow(row.idx) }}>
                            <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.idx)} className="accent-[#6C48D1]" />
                          </td>
                          <td className="px-3 py-2 text-[#bfc8c4] font-mono">{row.idx + 1}</td>
                          <td className="px-3 py-2 text-[#e8eaf0] font-mono whitespace-nowrap">
                            <Highlight text={row.tanggal} query={searchQuery} />
                          </td>

                          {/* Keterangan + badge NIM */}
                          <td className="px-3 py-2 text-[#e8eaf0] max-w-[260px]">
                            <span className="block truncate"><Highlight text={row.deskripsi} query={searchQuery} /></span>
                            <span className="flex gap-1 mt-0.5 flex-wrap">
                              {row.isBriva && <span className="inline-block text-[0.6rem] px-1.5 py-0.5 rounded bg-[#6C48D1]/30 text-[#9B6DFF] font-medium">BRIVA</span>}
                              {row.isBfva  && <span className="inline-block text-[0.6rem] px-1.5 py-0.5 rounded bg-[#0891b2]/30 text-[#38bdf8] font-medium">BFVA</span>}
                              {row.nim && (
                                <span className="inline-block text-[0.6rem] px-1.5 py-0.5 rounded bg-[#86efac]/15 text-[#86efac] font-mono font-medium" title={`NIM: ${row.nim}`}>
                                  NIM {row.nim}
                                </span>
                              )}
                            </span>
                            {row.nim && (
                              <span className="flex gap-1 mt-0.5 flex-wrap">
                                <span className="text-[0.58rem] text-[#bfc8c4]/50">
                                  20{row.nimAngkatan} &bull; Fak.{row.nimFakultas} &bull; Prodi {row.nimProdi}
                                  {row.nimProdi && PRODI_NAMES[row.nimProdi] ? ` (${PRODI_NAMES[row.nimProdi]})` : ''}
                                </span>
                              </span>
                            )}
                          </td>

                          {/* Kategori & mapping */}
                          <td className="px-3 py-2 max-w-[200px]" onClick={e => e.stopPropagation()}>
                            {(row.kategori || row.jenis_pendapatan) ? (
                              <div className="space-y-0.5">
                                {row.kategori && (
                                  <p className="text-[0.62rem] text-[#c4b5fd] truncate" title={row.kategori}>
                                    <span className="text-[#bfc8c4]/40">Kat: </span>{row.kategori}
                                  </p>
                                )}
                                {row.jenis_pendapatan && (
                                  <p className="text-[0.62rem] text-[#bfc8c4]/60 truncate" title={row.jenis_pendapatan}>
                                    <span className="text-[#bfc8c4]/40">Jns: </span>{row.jenis_pendapatan}
                                  </p>
                                )}
                                {row.sumber_pendapatan && (
                                  <p className="text-[0.62rem] text-[#bfc8c4]/60 truncate" title={row.sumber_pendapatan}>
                                    <span className="text-[#bfc8c4]/40">Smb: </span>{row.sumber_pendapatan}
                                  </p>
                                )}
                                {row.unit_kerja && (
                                  <p className="text-[0.62rem] text-[#bfc8c4]/60 truncate">
                                    <span className="text-[#bfc8c4]/40">UK: </span>{row.unit_kerja}
                                  </p>
                                )}
                                {row.isManualEdit && (
                                  <span className="inline-block text-[0.55rem] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">manual</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[0.62rem] text-[#bfc8c4]/30 italic">— pakai default —</span>
                            )}
                          </td>

                          <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-[#fca5a5]">
                            {row.debet > 0 ? formatRupiah(row.debet) : <span className="text-[#bfc8c4]/30">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-[#86efac]">
                            {row.kredit > 0 ? formatRupiah(row.kredit) : <span className="text-[#bfc8c4]/30">—</span>}
                          </td>

                          {/* Tombol edit */}
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setEditRowIdx(editRowIdx === row.idx ? null : row.idx)}
                              className={[
                                'p-1 rounded-md transition-colors',
                                editRowIdx === row.idx
                                  ? 'bg-[#6C48D1]/40 text-[#c4b5fd]'
                                  : 'text-[#bfc8c4]/50 hover:text-[#9B6DFF] hover:bg-[#6C48D1]/15',
                              ].join(' ')}
                              title="Edit baris ini"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '0.95rem', fontVariationSettings: "'FILL' 1" }}>
                                {editRowIdx === row.idx ? 'expand_less' : 'edit'}
                              </span>
                            </button>
                          </td>
                        </tr>

                        {/* ── Panel Edit Inline ── */}
                        {editRowIdx === row.idx && (
                          <tr className="bg-[#0f1318]">
                            <td colSpan={8} className="px-4 py-4 border-t border-[#6C48D1]/20">
                              <div className="max-w-3xl space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="material-symbols-outlined text-[#9B6DFF]" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>edit_note</span>
                                  <p className="text-[0.7rem] font-semibold text-[#e8eaf0] uppercase tracking-wider">Edit Baris #{row.idx + 1}</p>
                                  {row.nim && (
                                    <span className="text-[0.65rem] text-[#86efac]/70 ml-1">NIM {row.nim}</span>
                                  )}
                                  <button
                                    onClick={closeEdit}
                                    className="ml-auto text-[#bfc8c4]/50 hover:text-[#bfc8c4] transition-colors"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Tanggal */}
                                  <div>
                                    <label className="block text-[0.65rem] uppercase tracking-wide text-[#bfc8c4]/60 mb-1">Tanggal</label>
                                    <input
                                      type="date"
                                      value={row.tanggal}
                                      onChange={e => updateRow(row.idx, { tanggal: e.target.value })}
                                      className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1]"
                                    />
                                  </div>

                                  {/* Nominal */}
                                  <div>
                                    <label className="block text-[0.65rem] uppercase tracking-wide text-[#bfc8c4]/60 mb-1">
                                      {txType === 'IN' ? 'Nominal Kredit' : 'Nominal Debet'}
                                    </label>
                                    <input
                                      type="number"
                                      value={txType === 'IN' ? row.kredit : row.debet}
                                      onChange={e => {
                                        const v = parseInt(e.target.value) || 0
                                        updateRow(row.idx, txType === 'IN' ? { kredit: v } : { debet: v })
                                      }}
                                      className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] tabular-nums"
                                    />
                                  </div>
                                </div>

                                {/* Deskripsi */}
                                <div>
                                  <label className="block text-[0.65rem] uppercase tracking-wide text-[#bfc8c4]/60 mb-1">Deskripsi / Keterangan</label>
                                  <input
                                    type="text"
                                    value={row.deskripsi}
                                    onChange={e => updateRow(row.idx, { deskripsi: e.target.value })}
                                    className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] font-mono"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Kategori */}
                                  <div>
                                    <label className="block text-[0.65rem] uppercase tracking-wide text-[#bfc8c4]/60 mb-1">Kategori Pendapatan</label>
                                    {revCats.length > 0 ? (
                                      <select
                                        value={row.kategori ?? ''}
                                        onChange={e => updateRow(row.idx, { kategori: e.target.value })}
                                        className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1]"
                                      >
                                        <option value="">— pakai default —</option>
                                        {revCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={row.kategori ?? ''}
                                        onChange={e => updateRow(row.idx, { kategori: e.target.value })}
                                        placeholder={kategoriDefault || 'Kategori pendapatan'}
                                        className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40"
                                      />
                                    )}
                                  </div>

                                  {/* Unit Kerja */}
                                  <div>
                                    <label className="block text-[0.65rem] uppercase tracking-wide text-[#bfc8c4]/60 mb-1">Unit Kerja</label>
                                    <input
                                      type="text"
                                      value={row.unit_kerja ?? ''}
                                      onChange={e => updateRow(row.idx, { unit_kerja: e.target.value })}
                                      placeholder="Unit kerja"
                                      className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40"
                                    />
                                  </div>

                                  {/* Jenis Pendapatan */}
                                  <div>
                                    <label className="block text-[0.65rem] uppercase tracking-wide text-[#bfc8c4]/60 mb-1">Jenis Pendapatan</label>
                                    <input
                                      type="text"
                                      value={row.jenis_pendapatan ?? ''}
                                      onChange={e => updateRow(row.idx, { jenis_pendapatan: e.target.value })}
                                      placeholder="Jenis pendapatan"
                                      className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40"
                                    />
                                  </div>

                                  {/* Sumber Pendapatan */}
                                  <div>
                                    <label className="block text-[0.65rem] uppercase tracking-wide text-[#bfc8c4]/60 mb-1">Sumber Pendapatan</label>
                                    <input
                                      type="text"
                                      value={row.sumber_pendapatan ?? ''}
                                      onChange={e => updateRow(row.idx, { sumber_pendapatan: e.target.value })}
                                      placeholder="Sumber pendapatan"
                                      className="w-full rounded-lg px-3 py-1.5 text-[0.75rem] bg-[#1e2430] border border-white/15 text-[#e8eaf0] focus:outline-none focus:border-[#6C48D1] placeholder-[#bfc8c4]/40"
                                    />
                                  </div>
                                </div>

                                {/* Aksi */}
                                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                                  {row.nim && (
                                    <button
                                      onClick={() => updateRow(row.idx, { ...buildUktFields(), isManualEdit: false })}
                                      className="text-[0.65rem] text-[#86efac]/70 hover:text-[#86efac] flex items-center gap-1 transition-colors"
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>refresh</span>
                                      Reset ke auto-UKT
                                    </button>
                                  )}
                                  <button
                                    onClick={closeEdit}
                                    className="ml-auto text-[0.7rem] px-3 py-1.5 rounded-lg bg-[#6C48D1]/20 text-[#9B6DFF] hover:bg-[#6C48D1]/30 transition-colors font-medium"
                                  >
                                    Selesai
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Panduan selanjutnya */}
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#6C48D1]/10 border border-[#6C48D1]/20 text-body-small text-[#bfc8c4] space-y-1">
            <p className="font-semibold text-[#e8eaf0]">Langkah selanjutnya:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[0.75rem]">
              <li>Atur konfigurasi di atas (tipe, rekening, kategori)</li>
              <li>Pilih baris yang ingin diexport (centang)</li>
              <li>Klik <strong>Unduh Template</strong> — file Excel siap diupload</li>
              <li>Buka halaman <strong>Penerimaan (BPN)</strong> atau <strong>Pengeluaran (BPK)</strong></li>
              <li>Klik <strong>Upload Massal</strong> dan pilih file yang baru diunduh</li>
              <li>Lengkapi kolom kosong (kategori, jenis pendapatan, dst.) di Excel sebelum upload jika perlu</li>
            </ol>
          </div>

          {/* Tombol aksi */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon="upload_file"
              onClick={() => fileRef.current?.click()}
            >
              Ganti File
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon="download"
              disabled={selectedVisible.length === 0}
              onClick={downloadTemplate}
            >
              Unduh Template ({selectedVisible.length} baris)
            </Button>
          </div>

          {/* Hidden file input untuk ganti file */}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onFileChange}
          />

        </>
      )}

    </PageContainer>
  )
}
