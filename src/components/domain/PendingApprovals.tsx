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
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-lowest animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-surface-container-high rounded w-3/4" />
              <div className="h-2.5 bg-surface-container-high rounded w-1/2" />
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
          className="material-symbols-outlined text-on-surface-variant/40 text-[2.5rem] mb-2"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 40" }}
        >
          check_circle
        </span>
        <p className="text-sm text-on-surface-variant font-body">Tidak ada transaksi menunggu</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={[
            'flex items-center gap-3 px-4 py-3 rounded-xl',
            idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low',
          ].join(' ')}
        >
          <div className="w-8 h-8 rounded-lg bg-primary-fixed/40 flex items-center justify-center flex-shrink-0">
            <span
              className="material-symbols-outlined text-primary text-[0.9rem]"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
            >
              {typeIcons[item.type]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface font-body truncate">{item.title}</p>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              {item.requestBy} · Due {formatTanggal(item.dueDate)}
            </p>
          </div>
          <PriorityBadge priority={item.priority} />
        </div>
      ))}
    </div>
  )
}
