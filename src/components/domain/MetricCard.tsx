import type { MetricCardData } from '../../types'
import { formatRupiah, formatPersen } from '../../lib/formatters'

interface MetricCardProps {
  data:       MetricCardData
  animDelay?: string   // e.g. 'animate-delay-75'
}

export function MetricCard({ data, animDelay = 'animate-delay-0' }: MetricCardProps) {
  const trendColor =
    data.trendDir === 'up'   ? 'text-primary bg-primary-fixed' :
    data.trendDir === 'down' ? 'text-on-error-container bg-error-container' :
    'text-on-surface-variant bg-surface-container-high'

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-card p-5 flex flex-col gap-4 card-lift">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-emerald-gradient flex items-center justify-center flex-shrink-0">
          <span
            className="material-symbols-outlined text-on-primary text-[1.1rem]"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >
            {data.icon}
          </span>
        </div>
        {data.trendDir !== 'neutral' && (
          <span className={['text-xs font-medium px-2 py-0.5 rounded-full font-body', trendColor].join(' ')}>
            {formatPersen(data.trend)}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs text-on-surface-variant font-body mb-1">{data.label}</p>
        <p className={[
          'text-2xl font-bold text-on-surface font-headline leading-tight tabular-nums tracking-financial',
          'animate-count-up',
          animDelay,
        ].join(' ')}>
          {formatRupiah(data.value)}
        </p>
        <p className="text-xs text-on-surface-variant/60 font-body mt-1">{data.subtitle}</p>
      </div>
    </div>
  )
}
