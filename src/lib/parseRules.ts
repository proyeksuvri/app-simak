/**
 * parseRules.ts — Daftar referensi aturan parsing mutasi bank UIN Palopo
 *
 * Setiap aturan mendefinisikan:
 *   matchKeywords — kata kunci di kolom Remark yang memicu aturan ini
 *   matchRegex    — pola regex opsional untuk pencocokan lebih spesifik
 *   fill          — nilai yang otomatis diisi jika aturan cocok
 *   requireFields — field yang wajib ada agar baris dianggap SIAP (warning jika kosong)
 *   criticalCheck — kondisi KRITIS: baris tidak boleh diunduh jika gagal (error)
 *
 * Urutan sangat penting: aturan pertama yang match() = true yang digunakan.
 * Aturan terakhir adalah catch-all (selalu cocok) untuk transaksi umum.
 */

// ── Snapshot baris (minimal, tanpa import sikular) ─────────────────────────

export interface RowSnapshot {
  kredit:            number
  debet:             number
  deskripsi:         string   // ← kolom Remark dari mutasi bank
  tanggal:           string
  isBriva:           boolean
  isBfva:            boolean
  nim?:              string
  kategori?:         string
  jenis_pendapatan?: string
  sumber_pendapatan?:string
  unit_kerja?:       string
  isManualEdit?:     boolean
}

// ── Definisi aturan ────────────────────────────────────────────────────────

export interface ParseRule {
  id:          string
  label:       string
  description: string
  icon:        string
  color:       string

  /**
   * Kata kunci yang dicari di kolom Remark (case-insensitive).
   * Cukup satu kata kunci cocok untuk memicu aturan ini.
   */
  matchKeywords?: string[]

  /**
   * Pola regex tambahan (dievaluasi pada deskripsi setelah matchKeywords).
   * Digunakan untuk pattern yang membutuhkan struktur lebih spesifik.
   */
  matchRegex?: RegExp

  /**
   * Kondisi struktural tambahan di luar Remark.
   * Dievaluasi setelah matchKeywords / matchRegex.
   */
  matchExtra?: (row: RowSnapshot) => boolean

  /**
   * Nilai yang otomatis diisi jika aturan cocok.
   * Tidak menimpa field yang sudah diisi manual (isManualEdit).
   */
  fill: Partial<Pick<RowSnapshot,
    'kategori' | 'jenis_pendapatan' | 'sumber_pendapatan' | 'unit_kerja'
  >>

  /** Field yang wajib terisi → WARNING jika kosong */
  requireFields: Array<{ field: keyof RowSnapshot; label: string }>

  /**
   * Kondisi kritis → ERROR jika gagal (baris tidak boleh diunduh).
   * Kembalikan null jika OK, atau string pesan error.
   */
  criticalCheck?: (row: RowSnapshot, txType: 'IN' | 'OUT') => string | null
}

// ── Helper: cek kata kunci di Remark ──────────────────────────────────────

function remarkContains(row: RowSnapshot, keywords: string[]): boolean {
  const desc = row.deskripsi.toLowerCase()
  return keywords.some(kw => desc.includes(kw.toLowerCase()))
}

function remarkMatches(row: RowSnapshot, regex: RegExp): boolean {
  return regex.test(row.deskripsi)
}

// ── Fungsi pencocokan aturan ───────────────────────────────────────────────

function buildMatchFn(rule: Pick<ParseRule, 'matchKeywords' | 'matchRegex' | 'matchExtra'>):
  (row: RowSnapshot) => boolean {
  return (row) => {
    if (rule.matchKeywords?.length) {
      if (!remarkContains(row, rule.matchKeywords)) return false
    }
    if (rule.matchRegex) {
      if (!remarkMatches(row, rule.matchRegex)) return false
    }
    if (rule.matchExtra) {
      if (!rule.matchExtra(row)) return false
    }
    return true
  }
}

// ── Validasi nominal wajib > 0 ─────────────────────────────────────────────

const requireNominalPositive = (row: RowSnapshot, txType: 'IN' | 'OUT'): string | null => {
  const nominal = txType === 'IN' ? row.kredit : row.debet
  if (nominal <= 0) return `Nominal ${txType === 'IN' ? 'kredit' : 'debet'} harus lebih dari 0`
  return null
}

// ── DAFTAR ATURAN REFERENSI ────────────────────────────────────────────────

const _rules: Omit<ParseRule, never>[] = [

  // ─── 1. UKT via BRIVA + NIM terdeteksi ──────────────────────────────────
  {
    id:          'ukt-briva-nim',
    label:       'UKT via BRIVA (NIM Mahasiswa)',
    description: 'Remark mengandung BRIVA dan pola NIM "71998XXXXXXXXXX". Pembayaran Uang Kuliah Tunggal.',
    icon:        'school',
    color:       '#4ade80',
    matchKeywords: ['BRIVA'],
    matchRegex:    /71998\d{10}/i,
    matchExtra:    (row) => !!row.nim,
    fill: {
      kategori:          'Pendapatan Akademik',
      jenis_pendapatan:  'Pendapatan jasa pelayanan pendidikan',
      sumber_pendapatan: 'Pendapatan Uang Kuliah Tunggal (UKT)',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',  label: 'Tanggal' },
      { field: 'kategori', label: 'Kategori' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 2. Wisuda ───────────────────────────────────────────────────────────
  {
    id:          'wisuda',
    label:       'Biaya Wisuda',
    description: 'Remark mengandung kata WISUDA. Penerimaan biaya pelaksanaan wisuda.',
    icon:        'workspace_premium',
    color:       '#f472b6',
    matchKeywords: ['WISUDA'],
    fill: {
      kategori:          'Pendapatan Akademik',
      jenis_pendapatan:  'Pendapatan jasa pelayanan pendidikan',
      sumber_pendapatan: 'Pendapatan Jasa Layanan Wisuda',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',  label: 'Tanggal' },
      { field: 'kategori', label: 'Kategori' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 3. Sewa aset / ruangan ──────────────────────────────────────────────
  {
    id:          'sewa',
    label:       'Sewa Aset / Ruangan',
    description: 'Remark mengandung SEWA atau RUSUNAWA. Penerimaan dari sewa fasilitas kampus.',
    icon:        'meeting_room',
    color:       '#fb923c',
    matchKeywords: ['SEWA', 'RUSUNAWA', 'ASRAMA'],
    fill: {
      kategori:          'Pendapatan BLU',
      jenis_pendapatan:  'Pendapatan jasa layanan perbankan BLU',
      sumber_pendapatan: 'Sewa Ruangan',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',           label: 'Tanggal' },
      { field: 'kategori',          label: 'Kategori' },
      { field: 'sumber_pendapatan', label: 'Sumber Pendapatan' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 4. Kerja Sama Lembaga / Badan Usaha ─────────────────────────────────
  {
    id:          'kerjasama',
    label:       'Kerja Sama Lembaga / Badan Usaha',
    description: 'Remark mengandung KERJASAMA, KERMA, MOU, atau KONTRAK. Penerimaan dari perjanjian kerja sama.',
    icon:        'handshake',
    color:       '#a78bfa',
    matchKeywords: ['KERJASAMA', 'KERMA', 'MOU', 'KONTRAK', 'HIBAH'],
    fill: {
      kategori:          'Pendapatan BLU',
      jenis_pendapatan:  'Pendapatan hasil kerja sama lembaga/badan usaha',
      sumber_pendapatan: 'Pendapatan Hasil Kerja Sama Lembaga/Badan Usaha',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',          label: 'Tanggal' },
      { field: 'kategori',         label: 'Kategori' },
      { field: 'jenis_pendapatan', label: 'Jenis Pendapatan' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 5. Praktikum / Laboratorium ─────────────────────────────────────────
  {
    id:          'praktikum',
    label:       'Praktikum / Laboratorium',
    description: 'Remark mengandung PRAKTIKUM atau LAB. Penerimaan dari kegiatan praktikum.',
    icon:        'science',
    color:       '#34d399',
    matchKeywords: ['PRAKTIKUM', 'LAB', 'LABORATORIUM'],
    fill: {
      kategori:          'Pendapatan Akademik',
      jenis_pendapatan:  'Pendapatan jasa pelayanan pendidikan',
      sumber_pendapatan: 'Pendapatan Praktikum',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',  label: 'Tanggal' },
      { field: 'kategori', label: 'Kategori' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 6. Poliklinik / Klinik ──────────────────────────────────────────────
  {
    id:          'klinik',
    label:       'Layanan Poliklinik / Klinik',
    description: 'Remark mengandung POLIKLINIK, KLINIK, atau KESEHATAN. Penerimaan layanan kesehatan kampus.',
    icon:        'local_hospital',
    color:       '#f87171',
    matchKeywords: ['POLIKLINIK', 'KLINIK', 'KESEHATAN', 'MEDIS'],
    fill: {
      kategori:          'Pendapatan BLU',
      jenis_pendapatan:  'Pendapatan jasa layanan perbankan BLU',
      sumber_pendapatan: 'Pendapatan Jasa Layanan Perbankan BLU',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',           label: 'Tanggal' },
      { field: 'kategori',          label: 'Kategori' },
      { field: 'sumber_pendapatan', label: 'Sumber Pendapatan' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 7. Pendaftaran mahasiswa baru ───────────────────────────────────────
  {
    id:          'pendaftaran',
    label:       'Pendaftaran Mahasiswa Baru',
    description: 'Remark mengandung PENDAFTARAN, PMB, atau SELEKSI. Penerimaan biaya pendaftaran.',
    icon:        'how_to_reg',
    color:       '#38bdf8',
    matchKeywords: ['PENDAFTARAN', 'PMB', 'SELEKSI', 'DAFTAR ULANG'],
    fill: {
      kategori:          'Pendapatan Akademik',
      jenis_pendapatan:  'Pendapatan jasa pelayanan pendidikan',
      sumber_pendapatan: 'Pendapatan Jasa Pelayanan Pendidikan',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',  label: 'Tanggal' },
      { field: 'kategori', label: 'Kategori' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 8. PNBP / Pendapatan Negara Bukan Pajak ─────────────────────────────
  {
    id:          'pnbp',
    label:       'PNBP Lainnya',
    description: 'Remark mengandung PNBP atau PENDAPATAN NEGARA. Dikategorikan sebagai PNBP Lainnya.',
    icon:        'account_balance',
    color:       '#fbbf24',
    matchKeywords: ['PNBP', 'PENDAPATAN NEGARA', 'PENERIMAAN NEGARA'],
    fill: {
      kategori:          'Pendapatan Lain-lain BLU',
      jenis_pendapatan:  'Pendapatan Lain-lain BLU',
      sumber_pendapatan: 'Pendapatan Lain-lain BLU',
      unit_kerja:        'Rektorat',
    },
    requireFields: [
      { field: 'tanggal',          label: 'Tanggal' },
      { field: 'kategori',         label: 'Kategori' },
      { field: 'jenis_pendapatan', label: 'Jenis Pendapatan' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 9. BFVA (BRI Flexi Virtual Account) ─────────────────────────────────
  {
    id:          'bfva',
    label:       'BFVA (BRI Flexi VA)',
    description: 'Remark mengandung BFVA. Penerimaan via BRI Flexible Virtual Account, biasanya non-akademik.',
    icon:        'credit_card',
    color:       '#67e8f9',
    matchKeywords: ['BFVA'],
    fill: {
      kategori: 'Pendapatan Lain-lain BLU',
    },
    requireFields: [
      { field: 'tanggal',          label: 'Tanggal' },
      { field: 'kategori',         label: 'Kategori' },
      { field: 'jenis_pendapatan', label: 'Jenis Pendapatan' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 10. BRIVA tanpa NIM (non-UKT) ───────────────────────────────────────
  {
    id:          'briva-no-nim',
    label:       'BRIVA (Non-UKT)',
    description: 'Remark mengandung BRIVA namun tidak terdeteksi NIM mahasiswa. Perlu diisi kategori manual.',
    icon:        'payment',
    color:       '#60a5fa',
    matchKeywords: ['BRIVA'],
    matchExtra:    (row) => !row.nim,
    fill: {},
    requireFields: [
      { field: 'tanggal',          label: 'Tanggal' },
      { field: 'kategori',         label: 'Kategori' },
      { field: 'jenis_pendapatan', label: 'Jenis Pendapatan' },
    ],
    criticalCheck: requireNominalPositive,
  },

  // ─── 11. Catch-all: transaksi umum ───────────────────────────────────────
  {
    id:          'manual',
    label:       'Transaksi Umum (Perlu Edit Manual)',
    description: 'Remark tidak cocok dengan pola manapun. Semua field harus diisi manual sebelum diunduh.',
    icon:        'edit_note',
    color:       '#fbbf24',
    matchKeywords: undefined,
    fill: {},
    requireFields: [
      { field: 'tanggal',           label: 'Tanggal' },
      { field: 'kategori',          label: 'Kategori' },
      { field: 'jenis_pendapatan',  label: 'Jenis Pendapatan' },
      { field: 'sumber_pendapatan', label: 'Sumber Pendapatan' },
      { field: 'unit_kerja',        label: 'Unit Kerja' },
    ],
    criticalCheck: requireNominalPositive,
  },
]

// ── Tambahkan fungsi match() ke setiap aturan ──────────────────────────────

export const PARSE_RULES: ParseRule[] = _rules.map((r, idx) => ({
  ...r,
  // Catch-all rule (last) selalu true
  match: idx === _rules.length - 1
    ? (_row: RowSnapshot) => true
    : buildMatchFn(r),
}))

// ── Tipe hasil evaluasi ────────────────────────────────────────────────────

export type RowStatus = 'ok' | 'warning' | 'error'

export interface RowEvalResult {
  status:        RowStatus
  rule:          ParseRule
  criticalMsg:   string | null
  missingFields: string[]
}

/**
 * Temukan aturan pertama yang cocok, evaluasi status, kembalikan hasilnya.
 */
export function evaluateRow(
  row:    RowSnapshot,
  txType: 'IN' | 'OUT',
  rules:  ParseRule[] = PARSE_RULES,
): RowEvalResult {
  const rule = rules.find(r => r.match(row)) ?? rules[rules.length - 1]!

  const criticalMsg = rule.criticalCheck?.(row, txType) ?? null
  if (criticalMsg) {
    return { status: 'error', rule, criticalMsg, missingFields: [] }
  }

  const missingFields = rule.requireFields
    .filter(rf => {
      const val = row[rf.field]
      return val === undefined || val === null || String(val).trim() === '' || val === 0
    })
    .map(rf => rf.label)

  return {
    status:        missingFields.length > 0 ? 'warning' : 'ok',
    rule,
    criticalMsg:   null,
    missingFields,
  }
}

/**
 * Terapkan auto-fill aturan ke baris.
 * Tidak menimpa field yang sudah diisi manual.
 */
export function applyRuleFill(
  row:  RowSnapshot,
  rule: ParseRule,
): Partial<RowSnapshot> {
  if (row.isManualEdit) return {}
  const patch: Partial<RowSnapshot> = {}
  for (const [key, val] of Object.entries(rule.fill)) {
    const k = key as keyof typeof rule.fill
    if (!row[k]) (patch as Record<string, unknown>)[k] = val
  }
  return patch
}
