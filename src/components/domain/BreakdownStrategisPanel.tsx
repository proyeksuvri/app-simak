import type { RevenueBreakdownRow } from '../../hooks/useRevenueBreakdown'
import { formatRupiah, formatRupiahSingkat } from '../../lib/formatters'

const PALETTE = [
  { bar: '#9B6DFF', bg: 'rgba(155,109,255,0.15)', text: '#c4b5fd' },
  { bar: '#f472b6', bg: 'rgba(244,114,182,0.15)', text: '#f9a8d4' },
  { bar: '#67e8f9', bg: 'rgba(103,232,249,0.15)', text: '#a5f3fc' },
  { bar: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  text: '#fde68a' },
  { bar: '#4ade80', bg: 'rgba(74,222,128,0.15)',  text: '#86efac' },
  { bar: '#fb923c', bg: 'rgba(251,146,60,0.15)',  text: '#fdba74' },
]
const FALLBACK_COLOR = { bar: '#64748b', bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' }
function getColor(i: number) { return PALETTE[i % PALETTE.length] ?? FALLBACK_COLOR }

function SkeletonBar() {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="h-3 rounded w-36" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>
        <div className="h-3 rounded w-12" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

interface BreakdownRowProps {
  row:        RevenueBreakdownRow
  index:      number
  grandTotal: number
}

function BreakdownRow({ row, index }: BreakdownRowProps) {
  const col = getColor(index)

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: icon + kode + label */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
            style={{ background: col.bg }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.bar }} />
          </div>
          {row.kode && (
            <span className="text-[10px] font-bold font-body tabular-nums flex-shrink-0" style={{ color: col.text }}>
              {row.kode}
            </span>
          )}
          <span className="text-xs font-medium font-headline truncate" style={{ color: '#e8eaf0' }} title={row.label}>
            {row.label}
          </span>
        </div>

        {/* Right: pct + amount */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-body tabular-nums" style={{ color: 'rgba(232,234,240,0.38)' }}>
            {row.pct}%
          </span>
          <span className="text-xs font-bold font-body tabular-nums" style={{ color: col.text }}>
            {formatRupiahSingkat(row.total)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width:      `${row.pct}%`,
            background: `linear-gradient(90deg, ${col.bar}99, ${col.bar})`,
            minWidth:   row.pct > 0 ? '4px' : '0',
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  )
}

interface BreakdownStrategisPanelProps {
  rows:    RevenueBreakdownRow[]
  loading: boolean
}

export function BreakdownStrategisPanel({ rows, loading }: BreakdownStrategisPanelProps) {
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const totalTx    = rows.reduce((s, r) => s + r.count, 0)

  return (
    <div className="rounded-2xl" style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
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
          <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>
            Breakdown Penerimaan
          </h3>
        </div>

        {!loading && grandTotal > 0 && (
          <span className="text-sm font-bold font-body tabular-nums" style={{ color: '#c4b5fd' }}>
            {formatRupiahSingkat(grandTotal)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4">
        {loading ? (
          <>
            <SkeletonBar />
            <SkeletonBar />
            <SkeletonBar />
            <SkeletonBar />
          </>
        ) : rows.length === 0 ? (
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
            <p className="text-sm font-semibold font-headline" style={{ color: 'rgba(232,234,240,0.5)' }}>
              Belum ada data
            </p>
          </div>
        ) : (
          <>
            {rows.map((row, i) => (
              <BreakdownRow key={row.id} row={row} index={i} grandTotal={grandTotal} />
            ))}

            {/* Footer */}
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[10px] font-body uppercase tracking-wider" style={{ color: 'rgba(232,234,240,0.3)' }}>
                {rows.length} jenis · {totalTx.toLocaleString('id-ID')} transaksi
              </span>
              <span className="text-sm font-bold font-body tabular-nums" style={{ color: '#e8eaf0' }}>
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
