import { formatTanggalPanjang } from '../../lib/formatters'

interface AlertBannerProps {
  deadline: string
}

export function AlertBanner({ deadline }: AlertBannerProps) {
  if (!deadline) return null

  const deadlineDate = new Date(deadline)
  if (isNaN(deadlineDate.getTime())) return null

  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isUrgent = daysLeft <= 5

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl"
      style={{
        background: isUrgent ? 'rgba(186,26,26,0.12)' : 'rgba(108,72,209,0.1)',
        border: `1px solid ${isUrgent ? 'rgba(248,113,113,0.35)' : 'rgba(108,72,209,0.3)'}`,
      }}
    >
      <span
        className="material-symbols-outlined flex-shrink-0"
        style={{
          fontSize: '1.3rem',
          color: isUrgent ? '#f87171' : '#9B6DFF',
          fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        }}
      >
        {isUrgent ? 'warning' : 'event_upcoming'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-body" style={{ color: '#e8eaf0' }}>
          {isUrgent ? 'Segera! ' : ''}Deadline Tutup Buku
        </p>
        <p className="text-xs font-body mt-0.5" style={{ color: 'rgba(232,234,240,0.55)' }}>
          Selesaikan seluruh verifikasi transaksi sebelum {formatTanggalPanjang(deadline)} pukul 23:59 WITA.
        </p>
      </div>

      <button
        className="flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold font-body text-white transition-opacity hover:opacity-90"
        style={{ background: isUrgent ? '#dc2626' : 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
      >
        Selesaikan Sekarang
      </button>
    </div>
  )
}
