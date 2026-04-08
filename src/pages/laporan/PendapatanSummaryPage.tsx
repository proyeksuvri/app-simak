import { useMemo, useState } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { formatRupiah } from '../../lib/formatters'
import { usePendapatanSummary } from '../../hooks/usePendapatanSummary'
import { useAppContext } from '../../context/AppContext'

const NAMA_BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

export function PendapatanSummaryPage() {
  const { tahunAnggaran } = useAppContext()

  const [filterYear,  setFilterYear]  = useState<number | null>(tahunAnggaran)
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const [filterJenis, setFilterJenis] = useState<string | null>(null)
  const [filterUnit,  setFilterUnit]  = useState<string | null>(null)

  const { rows, loading, error } = usePendapatanSummary({
    year:              filterYear,
    month:             filterMonth,
    jenisPendapatanId: filterJenis,
    unitKerja:         filterUnit,
  })

  // Derive filter options from all data without jenis/unit filter
  const { rows: allRows } = usePendapatanSummary({ year: filterYear, month: filterMonth })

  const jenisOptions = useMemo(() => {
    const map = new Map<string, string>()
    allRows.forEach(r => map.set(r.jenis_pendapatan_id, r.jenis_pendapatan))
    return [...map.entries()].sort((a, b) => (a[1] ?? '').localeCompare(b[1] ?? ''))
  }, [allRows])

  const unitOptions = useMemo(() => {
    const set = new Set<string>()
    allRows.forEach(r => { if (r.unit_kerja) set.add(r.unit_kerja) })
    return [...set].sort()
  }, [allRows])

  const totalPendapatan  = rows.reduce((s, r) => s + r.total_pendapatan, 0)
  const totalTransaksi   = rows.reduce((s, r) => s + r.jumlah_transaksi, 0)

  return (
    <PageContainer title="Ringkasan Pendapatan">

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Tahun */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#e8eaf0] font-body whitespace-nowrap">Tahun:</span>
          <select
            value={filterYear ?? ''}
            onChange={e => setFilterYear(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
          >
            <option value="" style={{ background: '#1e2430' }}>Semua Tahun</option>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} style={{ background: '#1e2430' }}>{y}</option>
            ))}
          </select>
        </div>

        {/* Bulan */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#e8eaf0] font-body whitespace-nowrap">Bulan:</span>
          <select
            value={filterMonth ?? ''}
            onChange={e => setFilterMonth(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
          >
            <option value="" style={{ background: '#1e2430' }}>Semua Bulan</option>
            {NAMA_BULAN.map((nama, idx) => (
              <option key={idx + 1} value={idx + 1} style={{ background: '#1e2430' }}>{nama}</option>
            ))}
          </select>
        </div>

        {/* Jenis Pendapatan */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#e8eaf0] font-body whitespace-nowrap">Jenis:</span>
          <select
            value={filterJenis ?? ''}
            onChange={e => setFilterJenis(e.target.value || null)}
            className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
          >
            <option value="" style={{ background: '#1e2430' }}>Semua Jenis</option>
            {jenisOptions.map(([id, nama]) => (
              <option key={id} value={id} style={{ background: '#1e2430' }}>{nama}</option>
            ))}
          </select>
        </div>

        {/* Unit Kerja */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#e8eaf0] font-body whitespace-nowrap">Unit:</span>
          <select
            value={filterUnit ?? ''}
            onChange={e => setFilterUnit(e.target.value || null)}
            className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
          >
            <option value="" style={{ background: '#1e2430' }}>Semua Unit</option>
            {unitOptions.map(u => (
              <option key={u} value={u} style={{ background: '#1e2430' }}>{u}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {(filterMonth || filterJenis || filterUnit) && (
          <button
            onClick={() => { setFilterMonth(null); setFilterJenis(null); setFilterUnit(null) }}
            className="px-3 py-2 rounded-xl text-xs font-medium font-body transition-colors bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon="payments" label="Total Pendapatan" value={formatRupiah(totalPendapatan)} accent="green" loading={loading} />
        <SummaryCard icon="receipt_long" label="Jumlah Transaksi" value={`${totalTransaksi} dok`} accent="blue" loading={loading} />
        <SummaryCard icon="category" label="Baris Data" value={`${rows.length} baris`} accent="purple" loading={loading} />
      </div>

      {/* Table */}
      <Card padding="sm">
        {error ? (
          <p className="px-4 py-8 text-sm text-red-400 font-body text-center">{error}</p>
        ) : loading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: '#2a3040' }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-12 text-sm text-on-surface-variant font-body text-center">
            Tidak ada data untuk filter yang dipilih.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['No','Bulan','Kode','Jenis Pendapatan','Bank','No. Rekening','Unit Kerja','Jml Transaksi','Total Pendapatan'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(232,234,240,0.4)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={`${r.jenis_pendapatan_id}-${r.account_id}-${r.year}-${r.month}-${idx}`}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(232,234,240,0.4)' }}>{idx + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#e8eaf0' }}>
                      {NAMA_BULAN[r.month - 1]} {r.year}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: 'rgba(232,234,240,0.5)' }}>
                      {r.kode_jenis_pendapatan ?? '-'}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#e8eaf0' }}>{r.jenis_pendapatan}</td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#e8eaf0' }}>{r.bank_name}</td>
                    <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: 'rgba(232,234,240,0.6)' }}>
                      {r.account_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'rgba(232,234,240,0.7)' }}>
                      {r.unit_kerja ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: '#93c5fd' }}>
                      {r.jumlah_transaksi}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: '#86efac' }}>
                      {formatRupiah(r.total_pendapatan)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  <td colSpan={7} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(232,234,240,0.5)' }}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: '#93c5fd' }}>
                    {totalTransaksi}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: '#86efac' }}>
                    {formatRupiah(totalPendapatan)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}

// ── internal summary card ──────────────────────────────────────────────────
interface SummaryCardProps {
  icon:    string
  label:   string
  value:   string
  accent:  'green' | 'blue' | 'purple'
  loading: boolean
}

const accentMap = {
  green:  { iconBg: 'rgba(74,222,128,0.12)',  iconBorder: 'rgba(74,222,128,0.2)',  iconColor: '#4ade80',  valueColor: '#86efac' },
  blue:   { iconBg: 'rgba(96,165,250,0.12)',  iconBorder: 'rgba(96,165,250,0.2)',  iconColor: '#60a5fa',  valueColor: '#93c5fd' },
  purple: { iconBg: 'rgba(108,72,209,0.15)',  iconBorder: 'rgba(108,72,209,0.25)', iconColor: '#9B6DFF',  valueColor: '#c4b5fd' },
}

function SummaryCard({ icon, label, value, accent, loading }: SummaryCardProps) {
  const c = accentMap[accent]
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-5 rounded-xl animate-pulse" style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-10 h-10 rounded-xl" style={{ background: '#2a3040' }} />
        <div className="space-y-2">
          <div className="h-2.5 rounded w-24" style={{ background: '#2a3040' }} />
          <div className="h-7 rounded w-36"   style={{ background: '#2a3040' }} />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl" style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.iconBg, border: `1px solid ${c.iconBorder}` }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: c.iconColor, fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest font-body mb-1.5" style={{ color: 'rgba(232,234,240,0.4)' }}>{label}</p>
        <p className="text-2xl font-bold font-headline leading-tight tabular-nums" style={{ color: c.valueColor }}>{value}</p>
      </div>
    </div>
  )
}
