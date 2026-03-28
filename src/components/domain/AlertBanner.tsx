import { formatTanggalPanjang } from '../../lib/formatters'

interface AlertBannerProps {
  deadline: string  // ISO date
}

export function AlertBanner({ deadline }: AlertBannerProps) {
  if (!deadline) return null

  const deadlineDate = new Date(deadline)
  if (isNaN(deadlineDate.getTime())) return null

  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isUrgent = daysLeft <= 5

  return (
    <div
      className={[
        'rounded-xl px-5 py-4 flex items-center gap-4',
        isUrgent
          ? 'bg-error-container animate-pulse-glow'
          : 'bg-primary-fixed/30',
      ].join(' ')}
    >
      <span
        className={[
          'material-symbols-outlined text-[1.4rem] flex-shrink-0',
          isUrgent ? 'text-error' : 'text-primary',
        ].join(' ')}
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        {isUrgent ? 'warning' : 'event_upcoming'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={['text-sm font-semibold font-body', isUrgent ? 'text-on-error-container' : 'text-primary'].join(' ')}>
          {isUrgent ? 'Segera! ' : ''}Deadline Tutup Buku
        </p>
        <p className={['text-xs font-body mt-0.5', isUrgent ? 'text-on-error-container/80' : 'text-on-primary-fixed-variant'].join(' ')}>
          {formatTanggalPanjang(deadline)} — {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Hari ini!'}
        </p>
      </div>
      <span
        className={[
          'text-xs font-medium px-3 py-1 rounded-full font-body flex-shrink-0',
          isUrgent ? 'bg-error text-on-error' : 'bg-primary text-on-primary',
        ].join(' ')}
      >
        {daysLeft > 0 ? `H-${daysLeft}` : 'Hari ini'}
      </span>
    </div>
  )
}
