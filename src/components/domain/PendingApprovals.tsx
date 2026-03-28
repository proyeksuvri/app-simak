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
  items: ApprovalItem[]
}

export function PendingApprovals({ items }: PendingApprovalsProps) {
  if (items.length === 0) return null

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
