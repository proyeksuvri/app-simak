import { useState } from 'react'
import type { ChartDataPoint } from '../../types'
import { formatRupiah, formatRupiahSingkat } from '../../lib/formatters'

interface CashFlowChartProps {
  data:             ChartDataPoint[]
  showPenerimaan?:  boolean
  showPengeluaran?: boolean
  xInterval?:       number | 'preserveStartEnd'
}

interface TooltipState {
  point:    ChartDataPoint
  barIndex: number
  barX:     number
}

// Layout constants (px)
const TOTAL_H = 280
const X_LABEL = 28
const Y_LABEL = 52
const PAD_TOP = 16
const BAR_H   = TOTAL_H - X_LABEL - PAD_TOP   // 236

export function CashFlowChart({
  data,
  showPenerimaan  = true,
  showPengeluaran = true,
}: CashFlowChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2" style={{ height: TOTAL_H }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '2rem', color: 'rgba(232,234,240,0.12)', fontVariationSettings: "'FILL' 1" }}
        >
          bar_chart
        </span>
        <p className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.28)' }}>
          Tidak ada data untuk periode ini
        </p>
      </div>
    )
  }

  // ── Y scale ───────────────────────────────────────────────────────────────
  const maxVal = Math.max(
    ...data.map(d =>
      Math.max(
        showPenerimaan  ? d.penerimaan  : 0,
        showPengeluaran ? d.pengeluaran : 0,
      )
    ),
    1,
  )
  const step   = Math.ceil(maxVal / 4 / 100000) * 100000 || 1
  const yMax   = step * 4
  const yTicks = [0, step, step * 2, step * 3, step * 4]
  const px     = (v: number) => Math.round((v / yMax) * BAR_H)

  // ── X label interval ──────────────────────────────────────────────────────
  const n          = data.length
  const labelEvery = n <= 8 ? 1 : n <= 16 ? 2 : n <= 31 ? 4 : Math.ceil(n / 8)
  const hasBoth    = showPenerimaan && showPengeluaran

  return (
    <div
      data-chart
      className="relative select-none w-full overflow-hidden"
      style={{ height: TOTAL_H }}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* ── Grid lines + Y labels ─────────────────────────────────────────── */}
      {yTicks.map((tick, i) => {
        const bottom = X_LABEL + px(tick)
        return (
          <div
            key={i}
            className="absolute flex items-center pointer-events-none"
            style={{ bottom, left: 0, right: 0, height: 0 }}
          >
            <span
              className="text-right text-[10px] font-body flex-shrink-0 -translate-y-1/2 tabular-nums"
              style={{ width: Y_LABEL - 6, paddingRight: 8, color: 'rgba(232,234,240,0.28)', letterSpacing: '-0.02em' }}
            >
              {formatRupiahSingkat(tick)}
            </span>
            {/* Baseline solid, lainnya dashed */}
            <div
              className="flex-1 -translate-y-px"
              style={{
                height:          1,
                background:      i === 0 ? 'rgba(255,255,255,0.15)' : 'none',
                backgroundImage: i === 0
                  ? 'none'
                  : 'repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 4px, transparent 4px, transparent 10px)',
              }}
            />
          </div>
        )
      })}

      {/* ── Bar area ──────────────────────────────────────────────────────── */}
      <div
        className="absolute flex items-end"
        style={{ left: Y_LABEL, right: 0, bottom: X_LABEL, top: PAD_TOP, gap: 1 }}
      >
        {data.map((d, i) => {
          const hIn      = showPenerimaan  ? Math.max(px(d.penerimaan),  d.penerimaan  > 0 ? 3 : 0) : 0
          const hOut     = showPengeluaran ? Math.max(px(d.pengeluaran), d.pengeluaran > 0 ? 3 : 0) : 0
          const isActive  = tooltip?.barIndex === i
          const showLabel = i % labelEvery === 0

          return (
            <div
              key={i}
              className="relative flex-1 flex flex-col items-center justify-end"
              style={{ height: '100%', minWidth: 0 }}
              onMouseEnter={(e) => {
                const rect   = e.currentTarget.getBoundingClientRect()
                const parent = e.currentTarget.closest('[data-chart]')!.getBoundingClientRect()
                setTooltip({ point: d, barIndex: i, barX: rect.left - parent.left + rect.width / 2 })
              }}
            >
              {/* Column hover highlight */}
              {isActive && (
                <div
                  className="absolute inset-x-0 rounded-lg pointer-events-none"
                  style={{
                    top: 0, bottom: 0,
                    background: 'rgba(155,109,255,0.05)',
                    border:     '1px solid rgba(155,109,255,0.11)',
                  }}
                />
              )}

              {/* Bars */}
              <div
                className="relative flex items-end justify-center w-full"
                style={{ gap: hasBoth ? 2 : 0, paddingInline: hasBoth ? '8%' : '18%' }}
              >
                {showPenerimaan && (
                  <div
                    className="flex-1 rounded-t-[3px] transition-all duration-150"
                    style={{
                      height:    hIn,
                      background: isActive
                        ? 'linear-gradient(to bottom, #c4b5fd 0%, #7c3aed 100%)'
                        : 'linear-gradient(to bottom, rgba(180,157,255,0.85) 0%, rgba(124,58,237,0.4) 100%)',
                      boxShadow: isActive ? '0 0 12px rgba(155,109,255,0.5)' : 'none',
                    }}
                  />
                )}
                {showPengeluaran && (
                  <div
                    className="flex-1 rounded-t-[3px] transition-all duration-150"
                    style={{
                      height:    hOut,
                      background: isActive
                        ? 'linear-gradient(to bottom, #fda4af 0%, #be185d 100%)'
                        : 'linear-gradient(to bottom, rgba(249,168,212,0.8) 0%, rgba(190,24,93,0.32) 100%)',
                      boxShadow: isActive ? '0 0 12px rgba(244,114,182,0.45)' : 'none',
                    }}
                  />
                )}
              </div>

              {/* X label */}
              {showLabel && (
                <span
                  className="absolute text-[9px] font-body text-center whitespace-nowrap pointer-events-none transition-colors duration-150"
                  style={{
                    bottom:     -(X_LABEL - 4),
                    left:       '50%',
                    transform:  'translateX(-50%)',
                    color:      isActive ? 'rgba(232,234,240,0.9)' : 'rgba(232,234,240,0.32)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {d.label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Tooltip ───────────────────────────────────────────────────────── */}
      {tooltip && (() => {
        const net     = tooltip.point.penerimaan - tooltip.point.pengeluaran
        const rawLeft = tooltip.barX + Y_LABEL - 92
        const left    = Math.max(Y_LABEL, rawLeft)
        return (
          <div
            className="absolute z-20 pointer-events-none rounded-xl text-xs font-body"
            style={{
              top:            PAD_TOP + 4,
              left,
              minWidth:       188,
              padding:        '10px 12px',
              background:     'rgba(12,16,24,0.97)',
              border:         '1px solid rgba(155,109,255,0.22)',
              boxShadow:      '0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header tanggal */}
            <p
              className="font-semibold mb-2 pb-1.5"
              style={{
                color:         '#e8eaf0',
                fontSize:      '0.68rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                borderBottom:  '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {tooltip.point.label}
            </p>

            {showPenerimaan && (
              <div className="flex items-center justify-between gap-4 mb-1.5">
                <span className="flex items-center gap-1.5" style={{ color: 'rgba(232,234,240,0.45)' }}>
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(to bottom, #c4b5fd, #7c3aed)' }}
                  />
                  Penerimaan
                </span>
                <span className="font-semibold tabular-nums" style={{ color: '#c4b5fd' }}>
                  {formatRupiah(tooltip.point.penerimaan)}
                </span>
              </div>
            )}

            {showPengeluaran && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5" style={{ color: 'rgba(232,234,240,0.45)' }}>
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(to bottom, #fda4af, #be185d)' }}
                  />
                  Pengeluaran
                </span>
                <span className="font-semibold tabular-nums" style={{ color: '#fda4af' }}>
                  {formatRupiah(tooltip.point.pengeluaran)}
                </span>
              </div>
            )}

            {hasBoth && (
              <div
                className="flex items-center justify-between gap-4 mt-2 pt-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="flex items-center gap-1" style={{ color: 'rgba(232,234,240,0.38)' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize:              '0.85rem',
                      color:                 net >= 0 ? '#4ade80' : '#f87171',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {net >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  Net
                </span>
                <span className="font-bold tabular-nums" style={{ color: net >= 0 ? '#4ade80' : '#f87171' }}>
                  {net >= 0 ? '+' : ''}{formatRupiah(net)}
                </span>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
