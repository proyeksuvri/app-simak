import { useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { USER_ROLE_LABELS } from '../../types'

const NAV_TABS = [
  { label: 'OVERVIEW',  path: '/dashboard'  },
  { label: 'LAPORAN',   path: '/laporan'    },
  { label: 'APPROVAL',  path: '/approval'   },
]

export function Header() {
  const { currentUser, tahunAnggaran } = useAppContext()
  const location = useLocation()

  const activeTab = NAV_TABS.find(t => location.pathname.startsWith(t.path)) ?? NAV_TABS[0]

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-6 h-14 gap-4"
      style={{
        background: '#10131a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          width: '220px',
        }}
      >
        <span
          className="material-symbols-outlined flex-shrink-0"
          style={{ fontSize: '0.95rem', color: 'rgba(232,234,240,0.35)', fontVariationSettings: "'FILL' 0" }}
        >search</span>
        <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.3)' }}>
          Cari laporan atau unit...
        </span>
      </div>

      {/* Center tabs */}
      <nav className="flex items-center gap-1 flex-1 justify-center">
        {NAV_TABS.map(tab => {
          const isActive = tab.label === activeTab.label
          return (
            <a
              key={tab.label}
              href={tab.path}
              className="px-4 py-1.5 text-xs font-semibold font-body tracking-widest transition-colors"
              style={{
                color: isActive ? '#e8eaf0' : 'rgba(232,234,240,0.35)',
                borderBottom: isActive ? '2px solid #9B6DFF' : '2px solid transparent',
                paddingBottom: isActive ? 'calc(0.375rem - 2px)' : '0.375rem',
              }}
            >{tab.label}</a>
          )
        })}
      </nav>

      {/* Right: TA badge + notif + user */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* TA badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(232,234,240,0.6)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', fontVariationSettings: "'FILL' 0" }}>calendar_today</span>
          TA {tahunAnggaran}
        </div>

        {/* Notification */}
        <button
          className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1rem', color: 'rgba(232,234,240,0.6)', fontVariationSettings: "'FILL' 0" }}
          >notifications</span>
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: '#f87171' }}
          />
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold font-body leading-tight" style={{ color: '#e8eaf0' }}>
              {currentUser.nama}
            </p>
            <p className="text-[0.6rem] font-body leading-tight" style={{ color: 'rgba(232,234,240,0.4)' }}>
              {USER_ROLE_LABELS[currentUser.role]}
            </p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
          >
            {currentUser.nama.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  )
}
