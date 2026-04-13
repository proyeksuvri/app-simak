import type { RevenueBreakdownRow } from '../../hooks/useRevenueBreakdown'
import { formatRupiah, formatRupiahSingkat } from '../../lib/formatters'

// ── Colour palette — satu warna per baris (wrap setelah 6) ───────────────────

const PALETTE = [
  { bar: '#9B6DFF', bg: 'rgba(155,109,255,0.15)', text: '#c4b5fd' },  // violet
  { bar: '#f472b6', bg: 'rgba(244,114,182,0.15)', text: '#f9a8d4' },  // pink
  { bar: '#67e8f9', bg: 'rgba(103,232,249,0.15)', text: '#a5f3fc' },  // cyan
  { bar: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  text: '#fde68a' },  // amber
  { bar: '#4ade80', bg: 'rgba(74,222,128,0.15)',  text: '#86efac' },  // green
  { bar: '#fb923c', bg: 'rgba(251,146,60,0.15)',  text: '#fdba74' },  // orange
]

const FALLBACK_COLOR = { bar: '#64748b', bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' }

function getColor(index: number) {
  return PALETTE[index % PALETTE.length] ?? FALLBACK_COLOR
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBar() {
  return (
    <div className="animate-pulse">
      {/* Label row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="h-3 rounded w-32" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>
        <div className="h-3 rounded w-16" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      {/* Bar */}
      <div className="h-2 rounded-full w-full mb-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-2 rounded-full w-1/2" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
      {/* Sub-row */}
      <div className="flex items-center justify-between">
        <div className="h-2.5 rounded w-20" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-2.5 rounded w-10" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  )
}

// ── Single breakdown row ─────────────────────────────────────────────────────

interface BreakdownRowProps {
  row:        RevenueBreakdownRow
  index:      number
  grandTotal: number
}

function BreakdownRow({ row, index, grandTotal }: BreakdownRowProps) {
  const col = getColor(index)

  // Formatted share label for tooltip-like sub-text
  const shareLabel = grandTotal > 0
    ? `${row.pct}% dari total penerimaan`
    : '—'

  return (
    <div>
      {/* ── Top row: kode+label / nominal ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {/* Left: colour dot + label */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: col.bg }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.7rem', color: col.bar, fontVariationSettings: "'FILL' 1" }}
            >
              payments
            </span>
          </div>
          <div className="min-w-0">
            {row.kode && (
              <span
                className="text-[10px] font-bold font-body uppercase tracking-wider mr-1.5"
                style={{ color: col.text }}
              >
                {row.kode}
              </span>
            )}
            <span
              className="text-xs font-semibold font-headline"
              style={{ color: '#e8eaf0' }}
              title={row.label}
            >
              {row.label}
            </span>
          </div>
        </div>

        {/* Right: nominal */}
        <span
          className="text-xs font-bold font-body flex-shrink-0 tabular-nums"
          style={{ color: col.text }}
        >
          {formatRupiahSingkat(row.total)}
        </span>
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <div
        className="h-1.5 rounded-full w-full mb-1.5 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width:      `${row.pct}%`,
            background: `linear-gradient(90deg, ${col.bar}cc, ${col.bar})`,
            minWidth:   row.pct > 0 ? '4px' : '0',
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>

      {/* ── Bottom row: share % + count ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10.5px] font-body"
          style={{ color: 'rgba(232,234,240,0.4)' }}
        >
          {shareLabel}
        </span>
        <span
          className="text-[10.5px] font-body tabular-nums"
          style={{ color: 'rgba(232,234,240,0.35)' }}
        >
          {row.count.toLocaleString('id-ID')} transaksi
        </span>
      </div>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface BreakdownStrategisPanelProps {
  rows:    RevenueBreakdownRow[]
  loading: boolean
}

export function BreakdownStrategisPanel({ rows, loading }: BreakdownStrategisPanelProps) {
  const grandTotal   = rows.reduce((s, r) => s + r.total, 0)
  const totalTx      = rows.reduce((s, r) => s + r.count, 0)
  const topRow       = rows[0]
  const dominanLabel = topRow ? topRow.label : null

  return (
    <div
      className="rounded-2xl"
      style={{
        background: '#161a21',
        border:     '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(155,109,255,0.12)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.9rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}
            >
              donut_large
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>
              Breakdown Strategis Penerimaan
            </h3>
            <p className="text-[11px] font-body mt-px" style={{ color: 'rgba(232,234,240,0.38)' }}>
              Komposisi aliran pendapatan berdasarkan jenis penerimaan
            </p>
          </div>
        </div>

        {/* Summary badge — total + dominan */}
        {!loading && grandTotal > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            <span
              className="text-sm font-bold font-body tabular-nums"
              style={{ color: '#c4b5fd' }}
            >
              {formatRupiahSingkat(grandTotal)}
            </span>
            {dominanLabel && (
              <span
                className="text-[10px] font-body"
                style={{ color: 'rgba(232,234,240,0.38)' }}
              >
                {totalTx.toLocaleString('id-ID')} transaksi · dominan: {dominanLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="p-5 flex flex-col gap-5">

        {loading ? (
          /* Loading skeletons */
          <>
            <SkeletonBar />
            <SkeletonBar />
            <SkeletonBar />
            <SkeletonBar />
          </>
        ) : rows.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(155,109,255,0.08)', border: '1px solid rgba(155,109,255,0.15)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.5rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 0" }}
              >
                bar_chart
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold font-headline" style={{ color: 'rgba(232,234,240,0.5)' }}>
                Belum ada data penerimaan
              </p>
              <p className="text-xs font-body mt-1" style={{ color: 'rgba(232,234,240,0.3)' }}>
                Tidak ada transaksi terverifikasi dalam periode ini
              </p>
            </div>
          </div>
        ) : (
          /* Breakdown rows */
          <>
            {rows.map((row, i) => (
              <BreakdownRow
                key={row.id}
                row={row}
                index={i}
                grandTotal={grandTotal}
              />
            ))}

            {/* ── Ringkasan bawah: total + breakdown */}
            <div
              className="flex items-center justify-between pt-3 mt-1"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[11px] font-body uppercase tracking-wider" style={{ color: 'rgba(232,234,240,0.35)' }}>
                Total Terverifikasi
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10.5px] font-body" style={{ color: 'rgba(232,234,240,0.38)' }}>
                  {rows.length} jenis · {totalTx.toLocaleString('id-ID')} transaksi
                </span>
                <span className="text-sm font-bold font-body tabular-nums" style={{ color: '#e8eaf0' }}>
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
