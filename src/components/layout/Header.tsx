import { useAppContext } from '../../context/AppContext'
import { USER_ROLE_LABELS } from '../../types'

export function Header() {
  const { currentUser, tahunAnggaran } = useAppContext()

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 11) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  return (
    <header className="relative flex items-center justify-between px-8 py-5 overflow-hidden">

      {/* Ambient emerald radial glow — decorative, slow 6s breathe cycle */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none z-0 animate-glow-drift"
        style={{
          background: 'radial-gradient(circle, rgba(0, 105, 92, 0.12) 0%, rgba(0, 105, 92, 0.04) 50%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <p className="text-xs text-on-surface-variant font-body mb-0.5">
          {greeting()},
        </p>
        <h1 className="text-lg font-bold text-on-surface font-headline leading-tight">
          {currentUser.nama}
        </h1>
        <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-fixed text-on-primary-fixed-variant font-body">
          {USER_ROLE_LABELS[currentUser.role]}
        </span>
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2">
          <span
            className="material-symbols-outlined text-[1rem] text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >
            calendar_today
          </span>
          <span className="text-sm font-medium text-on-surface font-body">
            TA {tahunAnggaran}
          </span>
        </div>

        <button className="relative w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
          <span
            className="material-symbols-outlined text-[1.1rem] text-on-surface-variant"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >
            notifications
          </span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
        </button>
      </div>
    </header>
  )
}
