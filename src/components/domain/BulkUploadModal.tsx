/**
 * BulkUploadModal — Upload massal transaksi via file Excel (.xlsx) atau CSV (.csv)
 *
 * Format kolom yang didukung (sesuai urutan di template):
 *   BPN (type=IN):
 *     tanggal | no_bukti | deskripsi | kategori_pendapatan | nominal | rekening_bank | jenis_pendapatan | sumber_pendapatan | unit_kerja
 *
 *   BPK (type=OUT):
 *     tanggal | no_bukti | deskripsi | kategori_pendapatan | nominal | rekening_bank | unit_kerja
 *
 * - tanggal               : YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, atau DD/MM/YY (tahun 2 digit)
 * - no_bukti              : opsional, diisi otomatis jika kosong
 * - deskripsi             : teks bebas
 * - kategori_pendapatan   : nama kategori (case-insensitive match)
 * - nominal            : angka (boleh pakai titik/koma sebagai pemisah ribuan)
 * - rekening_bank      : nomor rekening atau nama bank (partial match)
 * - jenis_pendapatan   : nama jenis pendapatan (BPN only, opsional)
 * - sumber_pendapatan  : nama sumber pendapatan bisnis (BPN only, opsional)
 * - unit_kerja         : nama unit kerja (opsional, partial match)
 */

import { useRef, useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Modal }               from '../ui/Modal'
import { Button }              from '../ui/Button'
import { useMutateTransaction, type TransactionInput } from '../../hooks/useMutateTransaction'
import { useBankAccounts }          from '../../hooks/useBankAccounts'
import { useWorkUnits }             from '../../hooks/useWorkUnits'
import { useFundingSources }        from '../../hooks/useFundingSources'
import { useSumberPendapatanBisnis } from '../../hooks/useSumberPendapatanBisnis'
import { useRevenueCategories }     from '../../hooks/useRevenueCategories'
import { useAppContext }             from '../../context/AppContext'
import { usePeriods }               from '../../hooks/usePeriods'
import { formatRupiah }             from '../../lib/formatters'

// ─── Tipe Internal ────────────────────────────────────────────────────────────

type TxType = 'IN' | 'OUT'

interface ParsedRow {
  rowNum:            number
  tanggal:           string        // YYYY-MM-DD
  no_bukti:          string
  deskripsi:         string
  kode_rekening:     string
  nominal:           number
  rekening_bank_raw:   string        // input asli dari user
  jenis_pendapatan:    string        // nama, BPN only
  sumber_pendapatan:   string        // nama, BPN only
  unit_kerja:          string        // nama, opsional
  errors:            string[]
}

interface UploadModalProps {
  open:     boolean
  onClose:  () => void
  txType:   TxType
  onSuccess: () => void
}

// ─── Konstanta Kategori BPK (pengeluaran — belum ada tabel DB) ───────────────

const KATEGORI_BPK = [
  'Honorarium', 'Belanja ATK', 'Perjalanan Dinas', 'Langganan Jurnal',
  'Pemeliharaan', 'Pencairan UP', 'Pencairan TUP',
]

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Normalisasi tanggal ke YYYY-MM-DD; return null jika tidak valid */
function parseDate(raw: string): string | null {
  if (!raw) return null
  const s = String(raw).trim()

  // Excel serial date number
  if (/^\d{4,5}$/.test(s)) {
    const d = XLSX.SSF.parse_date_code(Number(s))
    if (d) {
      const mm = String(d.m).padStart(2, '0')
      const dd = String(d.d).padStart(2, '0')
      return `${d.y}-${mm}-${dd}`
    }
  }

  // DD/MM/YY atau DD-MM-YY (tahun 2 digit → tambah 2000)
  const dmy2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
  if (dmy2) {
    const yr = 2000 + Number(dmy2[3])
    return `${yr}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`
  }

  // DD/MM/YYYY atau DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // Coba native Date
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)

  return null
}

/** Hapus pemisah ribuan dan konversi ke angka */
function parseNominal(raw: string | number): number {
  if (typeof raw === 'number') return Math.round(raw)
  const cleaned = String(raw).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return Math.round(parseFloat(cleaned) || 0)
}

/** Ambil nilai sel — XLSX bisa kembalikan string/number/undefined */
function cellVal(row: Record<string, unknown>, key: string): string {
  const v = row[key]
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

/** Case-insensitive partial match */
function fuzzyMatch(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  return h.includes(n) || n.includes(h)
}

/** Cocokkan nomor rekening: normalisasi digit-only, cek kesamaan atau substring */
function matchAccountNumber(accountNumber: string, raw: string): boolean {
  const normalize = (s: string) => s.replace(/\D/g, '').replace(/^0+/, '')
  const a = normalize(accountNumber)
  const b = normalize(raw)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export function BulkUploadModal({ open, onClose, txType, onSuccess }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const { currentUser }           = useAppContext()
  const { insertTransaction }     = useMutateTransaction()
  const { accounts }              = useBankAccounts(true)
  const { workUnits }             = useWorkUnits()
  const { fundingSources }        = useFundingSources()
  const { items: sumberItems }    = useSumberPendapatanBisnis()
  const { categories: revCats }   = useRevenueCategories()
  const { activePeriod }          = usePeriods()

  // Bendahara Pembantu: unit kerja dikunci ke unit milik user
  const lockedUnitId   = currentUser?.role === 'bendahara_pembantu' ? (currentUser.unitId ?? null) : null
  const lockedUnitName = lockedUnitId ? (workUnits.find(u => u.id === lockedUnitId)?.name ?? '') : null

  const [rows,      setRows]      = useState<ParsedRow[]>([])
  const [fileName,  setFileName]  = useState('')
  const [uploading, setUploading] = useState(false)
  const [results,   setResults]   = useState<{ success: number; failed: number } | null>(null)
  const [dragOver,  setDragOver]  = useState(false)
  const lastWbRef = useRef<XLSX.WorkBook | null>(null)

  // Kategori BPN dari DB (revenue_categories aktif); BPK dari konstanta (belum ada tabel DB)
  const validKategori = txType === 'IN' ? revCats.map(c => c.name) : KATEGORI_BPK
  const typLabel      = txType === 'IN' ? 'BPN' : 'BPK'

  // ── Reset state saat tutup ──────────────────────────────────────────────────
  function handleClose() {
    setRows([])
    setFileName('')
    setResults(null)
    setUploading(false)
    onClose()
  }

  // ── Parse sheet → ParsedRow[] ───────────────────────────────────────────────
  function parseSheet(wb: XLSX.WorkBook, validKat: string[], validAccounts = accounts): ParsedRow[] {
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: '',
      raw:    true,
    })

    return data.map((raw, idx) => {
      const rowNum   = idx + 2
      const errors: string[] = []

      // Normalisasi kunci kolom (tolower, trim spasi → underscore)
      const norm: Record<string, string> = {}
      for (const k of Object.keys(raw)) {
        norm[k.toLowerCase().trim().replace(/\s+/g, '_')] = cellVal(raw, k)
      }

      // Tanggal
      const tanggalRaw = norm['tanggal'] || norm['transaction_date'] || norm['tgl'] || ''
      const tanggal    = parseDate(tanggalRaw)
      if (!tanggal) errors.push('Kolom tanggal tidak valid (gunakan YYYY-MM-DD atau DD/MM/YYYY)')

      // Deskripsi
      const deskripsi = norm['deskripsi'] || norm['description'] || norm['keterangan'] || ''
      if (!deskripsi) errors.push('Kolom deskripsi wajib diisi')

      // Kategori pendapatan
      const kode_rekening = norm['kategori_pendapatan'] || norm['kode_rekening'] || norm['kategori'] || norm['category'] || ''
      const katMatch = validKat.find(k => k.toLowerCase() === kode_rekening.toLowerCase())
      if (!kode_rekening) {
        errors.push('Kolom kategori_pendapatan wajib diisi')
      } else if (!katMatch) {
        errors.push(`kategori_pendapatan tidak valid. Pilihan: ${validKat.join(', ')}`)
      }

      // Nominal
      const nominalRaw = norm['nominal'] || norm['amount'] || norm['jumlah'] || raw['nominal'] as string || '0'
      const nominal    = parseNominal(nominalRaw)
      if (!nominal || nominal <= 0) errors.push('Kolom nominal harus lebih dari 0')

      // Rekening bank
      const rekening_bank_raw = norm['rekening_bank'] || norm['account_number'] || norm['bank'] || ''
      if (!rekening_bank_raw) {
        errors.push('Kolom rekening_bank wajib diisi')
      } else {
        const acctMatch = validAccounts.find(a =>
          matchAccountNumber(a.account_number, rekening_bank_raw) ||
          fuzzyMatch(a.bank_name,   rekening_bank_raw) ||
          fuzzyMatch(a.account_name, rekening_bank_raw)
        )
        if (!acctMatch) {
          errors.push(`rekening_bank tidak ditemukan: "${rekening_bank_raw}". Pastikan sesuai rekening aktif.`)
        }
      }

      // Jenis pendapatan (BPN only)
      const jenis_pendapatan = txType === 'IN'
        ? (norm['jenis_pendapatan'] || norm['funding_source'] || norm['sumber_dana'] || '')
        : ''

      // Sumber pendapatan (BPN only)
      const sumber_pendapatan = txType === 'IN'
        ? (norm['sumber_pendapatan'] || norm['sumber_pendapatan_bisnis'] || '')
        : ''

      // Unit kerja (opsional)
      const unit_kerja = norm['unit_kerja'] || norm['work_unit'] || norm['satker'] || ''

      // No bukti (opsional)
      const no_bukti = norm['no_bukti'] || norm['nomor_bukti'] || norm['no._bukti'] || ''

      return {
        rowNum,
        tanggal:           tanggal ?? '',
        no_bukti,
        deskripsi,
        kode_rekening:     katMatch ?? kode_rekening,
        nominal,
        rekening_bank_raw,
        jenis_pendapatan,
        sumber_pendapatan,
        unit_kerja,
        errors,
      } satisfies ParsedRow
    }).filter(r => r.deskripsi || r.nominal || r.rekening_bank_raw || r.tanggal)
  }

  // Re-parse saat revCats atau accounts selesai load (fix race condition)
  useEffect(() => {
    if (lastWbRef.current && (revCats.length > 0 || accounts.length > 0)) {
      setRows(parseSheet(lastWbRef.current, revCats.map(c => c.name), accounts))
    }
  }, [revCats, accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Proses file ─────────────────────────────────────────────────────────────
  const processFile = (file: File) => {
    setResults(null)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb   = XLSX.read(data, { type: 'array' })
        lastWbRef.current = wb
        const parsed = parseSheet(wb, validKategori, accounts)
        setRows(parsed)
      } catch {
        setRows([])
        alert('File tidak dapat dibaca. Pastikan format file benar (.xlsx atau .csv).')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // ── Submit semua baris valid ─────────────────────────────────────────────────
  async function handleUpload() {
    const validRows = rows.filter(r => r.errors.length === 0)
    if (!validRows.length) return

    setUploading(true)
    let success = 0
    let failed  = 0

    for (const row of validRows) {
      // Resolve rekening bank
      const acct = accounts.find(a =>
        matchAccountNumber(a.account_number, row.rekening_bank_raw) ||
        fuzzyMatch(a.bank_name,   row.rekening_bank_raw) ||
        fuzzyMatch(a.account_name, row.rekening_bank_raw)
      )

      // Resolve unit kerja — jika bendahara_pembantu, pakai unit milik user
      const wu = lockedUnitId
        ? workUnits.find(u => u.id === lockedUnitId)
        : row.unit_kerja
          ? workUnits.find(u => fuzzyMatch(u.name, row.unit_kerja))
          : undefined

      // Resolve jenis pendapatan
      const fs = row.jenis_pendapatan
        ? fundingSources.find(f => fuzzyMatch(f.name, row.jenis_pendapatan))
        : undefined

      // Resolve sumber pendapatan
      const sp = row.sumber_pendapatan
        ? sumberItems.find(s => fuzzyMatch(s.name, row.sumber_pendapatan))
        : undefined

      const input: TransactionInput = {
        type:                  txType,
        transaction_date:      row.tanggal,
        no_bukti:              row.no_bukti,
        description:           row.deskripsi,
        kode_rekening:         row.kode_rekening,
        amount:                row.nominal,
        work_unit_id:          wu?.id ?? null,
        period_id:             activePeriod?.id ?? null,
        source_account_id:     acct?.id ?? null,
        jenis_pendapatan_id:   txType === 'IN' ? (fs?.id ?? null) : null,
        sumber_pendapatan_id:  txType === 'IN' ? (sp?.id ?? null) : null,
      }

      const ok = await insertTransaction(input)
      if (ok) success++; else failed++
    }

    setUploading(false)
    setResults({ success, failed })
    if (success > 0) onSuccess()
  }

  // ── Download template ────────────────────────────────────────────────────────
  function downloadTemplate() {
    const withUnit = !lockedUnitId
    const headers = txType === 'IN'
      ? ['tanggal', 'no_bukti', 'deskripsi', 'kategori_pendapatan', 'nominal', 'rekening_bank', 'jenis_pendapatan', 'sumber_pendapatan', ...(withUnit ? ['unit_kerja'] : [])]
      : ['tanggal', 'no_bukti', 'deskripsi', 'kategori_pendapatan', 'nominal', 'rekening_bank', ...(withUnit ? ['unit_kerja'] : [])]

    const firstBPN = revCats[0]?.name ?? 'UKT'
    const firstFS  = fundingSources[0]?.name ?? ''
    const firstSP  = sumberItems[0]?.name ?? ''
    const firstWU  = workUnits[0]?.name ?? 'Nama Unit Kerja'
    const exampleRow = txType === 'IN'
      ? ['2026-01-15', 'BPN-001', 'Contoh penerimaan', firstBPN, 5000000, '1234567890', firstFS, firstSP, ...(withUnit ? [firstWU] : [])]
      : ['2026-01-15', 'BPK-001', 'Contoh pengeluaran', 'Belanja ATK', 250000, '1234567890', ...(withUnit ? [firstWU] : [])]

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow])

    // Lebar kolom
    ws['!cols'] = headers.map(() => ({ wch: 22 }))

    // Catatan validasi di baris 3
    const notes = txType === 'IN'
      ? [
          'Format: YYYY-MM-DD',
          'Opsional',
          'Wajib',
          `Pilihan: ${validKategori.join(' | ') || 'sesuai data'}`,
          'Angka tanpa Rp',
          `No.Rek/Nama Bank (${accounts.map(a => a.account_number).join(', ') || 'sesuai data'})`,
          `Pilihan: ${fundingSources.map(f => f.name).join(' | ') || 'sesuai data'}`,
          `Pilihan: ${sumberItems.map(s => s.name).join(' | ') || 'sesuai data'}`,
          ...(withUnit ? [`Pilihan: ${workUnits.map(u => u.name).join(' | ') || 'sesuai data'}`] : []),
        ]
      : [
          'Format: YYYY-MM-DD',
          'Opsional',
          'Wajib',
          `Pilihan: ${KATEGORI_BPK.join(' | ')}`,
          'Angka tanpa Rp',
          `No.Rek/Nama Bank (${accounts.map(a => a.account_number).join(', ') || 'sesuai data'})`,
          ...(withUnit ? [`Pilihan: ${workUnits.map(u => u.name).join(' | ') || 'sesuai data'}`] : []),
        ]
    XLSX.utils.sheet_add_aoa(ws, [notes], { origin: 'A3' })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Template ${typLabel}`)
    XLSX.writeFile(wb, `template_upload_${typLabel.toLowerCase()}.xlsx`)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const validCount   = rows.filter(r => r.errors.length === 0).length
  const invalidCount = rows.filter(r => r.errors.length > 0).length
  const hasRows      = rows.length > 0

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Upload Massal ${typLabel}`}
      maxWidth="lg"
    >
      <div className="p-6 space-y-5">

        {/* ── Info Unit Terkunci ───────────────────────────────────────────── */}
        {lockedUnitId && lockedUnitName && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-body-small">
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>lock</span>
            <span>Unit kerja otomatis: <strong>{lockedUnitName}</strong></span>
          </div>
        )}

        {/* ── Zona Drop / Pilih File ───────────────────────────────────────── */}
        {!hasRows && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              dragOver
                ? 'border-primary bg-primary/10'
                : 'border-white/20 hover:border-[#86efac] hover:bg-white/5',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-5xl text-[#bfc8c4] block mb-3">
              upload_file
            </span>
            <p className="text-body-large text-[#e8eaf0] font-medium">
              Klik atau seret file ke sini
            </p>
            <p className="text-body-small text-[#bfc8c4] mt-1">
              Format yang didukung: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        )}

        {/* ── Ringkasan File ───────────────────────────────────────────────── */}
        {hasRows && !results && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1e2430] border border-[#2a303c]">
            <span className="material-symbols-outlined text-[#86efac]">description</span>
            <div className="flex-1 min-w-0">
              <p className="text-body-medium text-[#e8eaf0] font-medium truncate">{fileName}</p>
              <p className="text-body-small text-[#bfc8c4]">
                {rows.length} baris ditemukan &bull;{' '}
                <span className="text-[#86efac]">{validCount} valid</span>
                {invalidCount > 0 && (
                  <span className="text-[#fca5a5]"> &bull; {invalidCount} error</span>
                )}
              </p>
            </div>
            <button
              onClick={() => { setRows([]); setFileName('') }}
              className="p-1 rounded-full text-[#bfc8c4] hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>close</span>
            </button>
          </div>
        )}

        {/* ── Tabel Preview ────────────────────────────────────────────────── */}
        {hasRows && !results && (
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-72" style={{ colorScheme: 'dark' }}>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1e2430] border-b border-white/10">
                  <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">#</th>
                  <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Tanggal</th>
                  <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">No Bukti</th>
                  <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Deskripsi</th>
                  <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Kategori</th>
                  <th className="px-3 py-2 text-right text-[#e8eaf0] font-medium">Nominal</th>
                  <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Rekening</th>
                  {txType === 'IN' && (
                    <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Jenis Pend.</th>
                  )}
                  {txType === 'IN' && (
                    <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Sumber Pend.</th>
                  )}
                  {!lockedUnitId && (
                    <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Unit Kerja</th>
                  )}
                  <th className="px-3 py-2 text-left text-[#e8eaf0] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isValid = row.errors.length === 0
                  return (
                    <tr
                      key={row.rowNum}
                      className={isValid ? 'border-t border-white/5' : 'border-t border-white/5 bg-[#fca5a5]/10'}
                    >
                      <td className="px-3 py-1.5 text-[#bfc8c4]">{row.rowNum}</td>
                      <td className="px-3 py-1.5 text-[#e8eaf0] font-mono">{row.tanggal || <span className="text-[#fca5a5]">—</span>}</td>
                      <td className="px-3 py-1.5 text-[#bfc8c4]">{row.no_bukti || '—'}</td>
                      <td className="px-3 py-1.5 text-[#e8eaf0] max-w-[160px] truncate">{row.deskripsi}</td>
                      <td className="px-3 py-1.5 text-[#e8eaf0]">{row.kode_rekening}</td>
                      <td className="px-3 py-1.5 text-right text-[#e8eaf0] font-mono">{formatRupiah(row.nominal)}</td>
                      <td className="px-3 py-1.5 text-[#bfc8c4] max-w-[120px] truncate">{row.rekening_bank_raw}</td>
                      {txType === 'IN' && (
                        <td className="px-3 py-1.5 text-[#bfc8c4]">{row.jenis_pendapatan || '—'}</td>
                      )}
                      {txType === 'IN' && (
                        <td className="px-3 py-1.5 text-[#bfc8c4]">{row.sumber_pendapatan || '—'}</td>
                      )}
                      {!lockedUnitId && (
                        <td className="px-3 py-1.5 text-[#bfc8c4]">{row.unit_kerja || '—'}</td>
                      )}
                      <td className="px-3 py-1.5">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 text-[#86efac]">
                            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>check_circle</span>
                            Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[#fca5a5] cursor-help"
                            title={row.errors.join('\n')}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>error</span>
                            {row.errors.length} error
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Daftar Error ─────────────────────────────────────────────────── */}
        {hasRows && !results && invalidCount > 0 && (
          <div className="rounded-xl bg-[#fca5a5]/10 border border-[#fca5a5]/30 p-4 space-y-2 max-h-40 overflow-y-auto">
            <p className="text-body-small font-semibold text-[#fca5a5]">Detail Error:</p>
            {rows.filter(r => r.errors.length > 0).map(row => (
              <div key={row.rowNum} className="text-xs text-[#bfc8c4]">
                <span className="font-mono text-[#fca5a5]">Baris {row.rowNum}:</span>{' '}
                {row.errors.join(' • ')}
              </div>
            ))}
          </div>
        )}

        {/* ── Hasil Upload ─────────────────────────────────────────────────── */}
        {results && (
          <div className="rounded-xl bg-[#1e2430] border border-[#2a303c] p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-[#86efac] block">task_alt</span>
            <p className="text-title-medium font-semibold text-[#e8eaf0]">Upload Selesai</p>
            <div className="flex justify-center gap-6 text-body-medium">
              <span className="text-[#86efac]">
                <span className="font-bold text-lg">{results.success}</span> berhasil
              </span>
              {results.failed > 0 && (
                <span className="text-[#fca5a5]">
                  <span className="font-bold text-lg">{results.failed}</span> gagal
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Panduan Kolom ────────────────────────────────────────────────── */}
        {!hasRows && (
          <details className="text-xs text-[#bfc8c4]">
            <summary className="cursor-pointer font-medium text-[#e8eaf0] hover:text-[#86efac] transition-colors">
              Panduan Format Kolom
            </summary>
            <div className="mt-3 rounded-xl border border-white/20 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/20">
                    <th className="px-3 py-2 text-left font-medium text-[#e8eaf0]">Nama Kolom</th>
                    <th className="px-3 py-2 text-left font-medium text-[#e8eaf0]">Wajib</th>
                    <th className="px-3 py-2 text-left font-medium text-[#e8eaf0]">Format / Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[
                    ['tanggal',          'Ya',  'YYYY-MM-DD, DD/MM/YYYY, atau DD/MM/YY'],
                    ['no_bukti',         'Tidak','Diisi otomatis jika kosong'],
                    ['deskripsi',        'Ya',  'Teks bebas'],
                    ['kategori_pendapatan', 'Ya',  validKategori.join(', ') || 'sesuai data aktif'],
                    ['nominal',          'Ya',  'Angka (contoh: 5000000)'],
                    ['rekening_bank',    'Ya',  accounts.length ? accounts.map(a => `${a.bank_name} (${a.account_number})`).join(', ') : 'Nomor rekening / nama bank'],
                    ...(txType === 'IN' ? [['jenis_pendapatan','Tidak', fundingSources.length ? fundingSources.map(f => f.name).join(', ') : 'Nama jenis pendapatan']] : []),
                    ...(txType === 'IN' ? [['sumber_pendapatan','Tidak', sumberItems.length ? sumberItems.map(s => s.name).join(', ') : 'Nama sumber pendapatan bisnis']] : []),
                    ...(!lockedUnitId ? [['unit_kerja','Tidak', workUnits.length ? workUnits.map(u => u.name).join(', ') : 'Nama unit kerja']] : []),
                  ].map(([col, wajib, fmt]) => (
                    <tr key={col}>
                      <td className="px-3 py-2 font-mono text-[#86efac]">{col}</td>
                      <td className="px-3 py-2 text-[#e8eaf0]">{wajib}</td>
                      <td className="px-3 py-2 text-[#bfc8c4]">{fmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* ── Tombol Aksi ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            icon="download"
            className="!text-[#86efac] hover:!bg-white/5"
            onClick={downloadTemplate}
          >
            Unduh Template
          </Button>

          <div className="flex gap-2">
            {results ? (
              <Button variant="primary" size="sm" onClick={handleClose}>
                Tutup
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="!text-[#bfc8c4] hover:!bg-white/5" onClick={handleClose}>
                  Batal
                </Button>
                {!hasRows ? (
                  <Button
                    variant="primary"
                    size="sm"
                    icon="upload"
                    onClick={() => fileRef.current?.click()}
                  >
                    Pilih File
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon="cloud_upload"
                    disabled={validCount === 0 || uploading}
                    onClick={handleUpload}
                  >
                    {uploading ? 'Mengupload...' : `Upload ${validCount} Transaksi`}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </Modal>
  )
}
