import type { MetricCardData } from '../../types'
import { formatRupiah, formatPersen } from '../../lib/formatters'

interface MetricCardProps {
  data: MetricCardData
}

export function MetricCard({ data }: MetricCardProps) {
  const isUp   = data.trendDir === 'up'
  const isDown = data.trendDir === 'down'

  const trendStyle = isUp
    ? { color: '#4ade80', background: 'rgba(74,222,128,0.12)' }
    : isDown
    ? { color: '#f87171', background: 'rgba(248,113,113,0.12)' }
    : { color: 'rgba(232,234,240,0.5)', background: 'rgba(255,255,255,0.06)' }

  // Saldo Kas mendapat warna purple khusus seperti screenshot
  const isBalance = data.id === 'saldo'
  const valueColor = isBalance ? '#c4b5fd' : '#e8eaf0'

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-xl"
      style={{
        background: '#161a21',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(108,72,209,0.15)', border: '1px solid rgba(108,72,209,0.25)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1.1rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >
            {data.icon}
          </span>
        </div>

        {/* Trend badge */}
        {data.trendDir !== 'neutral' && (
          <span
            className="text-xs font-semibold font-body px-2 py-0.5 rounded-full"
            style={trendStyle}
          >
            {isDown ? '-' : '+'}{formatPersen(Math.abs(data.trend))}
          </span>
        )}
      </div>

      <div>
        <p
          className="text-xs uppercase tracking-widest font-body mb-1.5"
          style={{ color: 'rgba(232,234,240,0.4)' }}
        >{data.label}</p>
        <p
          className="text-2xl font-bold font-headline leading-tight tabular-nums"
          style={{ color: valueColor }}
        >
          {data.format === 'count' ? `${data.value} dok` : formatRupiah(data.value)}
        </p>
        {data.subtitle && (
          <p className="text-xs font-body mt-1" style={{ color: 'rgba(232,234,240,0.35)' }}>
            {data.subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
