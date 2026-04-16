import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NotificationItem } from '../../hooks/useNotifications'

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  items:   NotificationItem[]
  count:   number
  loading: boolean
  onClose: () => void
}

export function NotificationDropdown({ items, count, loading, onClose }: Props) {
  const ref      = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const goApproval = () => {
    navigate('/approval')
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden shadow-2xl"
      style={{
        width: '320px',
        background: '#161b27',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-xs font-semibold font-body" style={{ color: '#e8eaf0' }}>
          Menunggu Persetujuan
        </span>
        {count > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#7c3aed', color: '#fff' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span
              className="material-symbols-outlined animate-spin"
              style={{ fontSize: '1.2rem', color: 'rgba(232,234,240,0.3)' }}
            >progress_activity</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.8rem', color: 'rgba(232,234,240,0.2)', fontVariationSettings: "'FILL' 0" }}
            >notifications_off</span>
            <p className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.3)' }}>
              Tidak ada transaksi pending
            </p>
          </div>
        ) : (
          items.map((item, i) => (
            <button
              key={item.id}
              onClick={goApproval}
              className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
              style={{
                borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: item.type === 'IN'
                    ? 'rgba(16,185,129,0.15)'
                    : 'rgba(248,113,113,0.15)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '0.85rem',
                    color: item.type === 'IN' ? '#10b981' : '#f87171',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  {item.type === 'IN' ? 'south_west' : 'north_east'}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold font-body truncate" style={{ color: '#e8eaf0' }}>
                  {item.no_bukti}
                </p>
                <p className="text-[0.65rem] font-body truncate mt-0.5" style={{ color: 'rgba(232,234,240,0.45)' }}>
                  {item.description || '—'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[0.65rem] font-body font-semibold" style={{ color: '#9B6DFF' }}>
                    {formatRupiah(item.amount)}
                  </span>
                  <span className="text-[0.6rem] font-body" style={{ color: 'rgba(232,234,240,0.3)' }}>
                    {formatDate(item.transaction_date)}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <span
                className="material-symbols-outlined flex-shrink-0 mt-1"
                style={{ fontSize: '0.8rem', color: 'rgba(232,234,240,0.2)', fontVariationSettings: "'FILL' 0" }}
              >chevron_right</span>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <button
          onClick={goApproval}
          className="w-full py-2.5 text-xs font-semibold font-body transition-colors"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: '#9B6DFF',
            background: 'transparent',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(155,109,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Lihat semua di halaman Approval
        </button>
      )}
    </div>
  )
}
