import type { ApprovalItem } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatTanggal } from '../../lib/formatters'

const typeIcons: Record<ApprovalItem['type'], string> = {
  bpn:     'receipt_long',
  bpk:     'payments',
  up_tup:  'request_quote',
  laporan: 'summarize',
}

interface PendingApprovalsProps {
  items:    ApprovalItem[]
  loading?: boolean
}

export function PendingApprovals({ items, loading }: PendingApprovalsProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="h-2 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <span
          className="material-symbols-outlined text-[2.5rem] mb-2"
          style={{ color: 'rgba(232,234,240,0.2)', fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 40" }}
        >check_circle</span>
        <p className="text-sm font-body" style={{ color: 'rgba(232,234,240,0.4)' }}>Tidak ada transaksi menunggu</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className="rounded-xl px-3 py-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-start gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(108,72,209,0.15)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '0.9rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
              >
                {typeIcons[item.type]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <PriorityBadge priority={item.priority} />
                <span className="text-[10px] font-body" style={{ color: 'rgba(232,234,240,0.35)' }}>
                  {formatTanggal(item.dueDate)}
                </span>
              </div>
              <p className="text-xs font-semibold font-body truncate" style={{ color: '#e8eaf0' }}>{item.title}</p>
              <p className="text-[10px] font-body mt-0.5 truncate" style={{ color: 'rgba(232,234,240,0.4)' }}>
                {item.requestBy}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 py-1 rounded-lg text-xs font-semibold font-body text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
            >Setujui</button>
            <button
              className="flex-1 py-1 rounded-lg text-xs font-semibold font-body transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,234,240,0.6)' }}
            >Detail</button>
          </div>
        </div>
      ))}
    </div>
  )
}
