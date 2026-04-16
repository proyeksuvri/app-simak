import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { type UserRole } from '../../types'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationDropdown } from './NotificationDropdown'
import { SearchDropdown } from './SearchDropdown'

interface NavTab {
  label: string
  path:  string
  roles: UserRole[] | 'all'
}

const NAV_TABS: NavTab[] = [
  { label: 'OVERVIEW', path: '/dashboard', roles: 'all' },
  { label: 'LAPORAN',  path: '/laporan',   roles: 'all' },
  { label: 'APPROVAL', path: '/approval',  roles: ['admin', 'pimpinan'] },
]

export function Header() {
  const { currentUser, tahunAnggaran } = useAppContext()
  const location = useLocation()
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const { items, count, loading } = useNotifications(currentUser.role, currentUser.unitId)

  const visibleTabs = NAV_TABS.filter(t =>
    t.roles === 'all' || t.roles.includes(currentUser.role)
  )

  const activeTab = visibleTabs.find(t => location.pathname.startsWith(t.path)) ?? visibleTabs[0]

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-6 h-14 gap-4"
      style={{
        background: '#10131a',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Search */}
      <div className="relative flex-shrink-0" style={{ width: '220px' }}>
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-colors"
          style={{
            background: searchOpen ? 'rgba(155,109,255,0.08)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${searchOpen ? 'rgba(155,109,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          <span
            className="material-symbols-outlined flex-shrink-0"
            style={{ fontSize: '0.95rem', color: 'rgba(232,234,240,0.35)', fontVariationSettings: "'FILL' 0" }}
          >search</span>
          <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.3)' }}>
            Cari laporan atau unit...
          </span>
        </button>

        {searchOpen && (
          <SearchDropdown onClose={() => setSearchOpen(false)} />
        )}
      </div>

      {/* Center tabs */}
      <nav className="flex items-center gap-1 flex-1 justify-center">
        {visibleTabs.map(tab => {
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
        <div className="relative">
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: notifOpen ? 'rgba(155,109,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${notifOpen ? 'rgba(155,109,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '1rem',
                color: notifOpen ? '#9B6DFF' : 'rgba(232,234,240,0.6)',
                fontVariationSettings: "'FILL' 0",
              }}
            >notifications</span>
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: '#f87171', lineHeight: 1 }}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotificationDropdown
              items={items}
              count={count}
              loading={loading}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

      </div>
    </header>
  )
}
