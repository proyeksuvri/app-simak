import type { TransactionStatus } from '../../types'

type BadgeVariant = TransactionStatus | 'high' | 'medium' | 'low' | 'info' | 'success' | 'danger'

interface BadgeProps {
  variant:    BadgeVariant
  children:   React.ReactNode
  className?: string
}

const variantInlineStyles: Record<BadgeVariant, React.CSSProperties> = {
  terverifikasi: { background: 'rgba(74,222,128,0.15)',  color: '#4ade80'              },
  pending:       { background: 'rgba(255,255,255,0.08)', color: 'rgba(232,234,240,0.5)' },
  diajukan:      { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24'              },
  ditolak:       { background: 'rgba(248,113,113,0.15)', color: '#f87171'              },
  high:          { background: 'rgba(248,113,113,0.15)', color: '#f87171'              },
  medium:        { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24'              },
  low:           { background: 'rgba(255,255,255,0.08)', color: 'rgba(232,234,240,0.5)' },
  info:          { background: 'rgba(155,109,255,0.15)', color: '#c4b5fd'              },
  success:       { background: 'rgba(74,222,128,0.15)',  color: '#4ade80'              },
  danger:        { background: 'rgba(248,113,113,0.15)', color: '#f87171'              },
}

const variantLabels: Partial<Record<BadgeVariant, string>> = {
  terverifikasi: 'Terverifikasi',
  pending:       'Draft',
  diajukan:      'Diajukan',
  ditolak:       'Ditolak',
  high:          'Prioritas Tinggi',
  medium:        'Sedang',
  low:           'Rendah',
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body', className].join(' ')}
      style={variantInlineStyles[variant]}
    >
      {children}
    </span>
  )
}

// Badge dengan label otomatis dari variant
export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <Badge variant={status}>
      {variantLabels[status] ?? status}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  return (
    <Badge variant={priority}>
      {variantLabels[priority] ?? priority}
    </Badge>
  )
}
