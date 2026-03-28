import type { TransactionStatus } from '../../types'

type BadgeVariant = TransactionStatus | 'high' | 'medium' | 'low' | 'info' | 'success' | 'danger'

interface BadgeProps {
  variant:    BadgeVariant
  children:   React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  terverifikasi: 'bg-primary-fixed text-on-primary-fixed-variant',
  pending:       'bg-surface-container-high text-on-surface-variant',
  diajukan:      'bg-[#fff3cd] text-[#856404]',
  ditolak:       'bg-error-container text-on-error-container',
  high:          'bg-error-container text-on-error-container',
  medium:        'bg-[#fff3cd] text-[#856404]',
  low:           'bg-surface-container-high text-on-surface-variant',
  info:          'bg-secondary-container text-on-secondary-container',
  success:       'bg-primary-fixed text-on-primary-fixed-variant',
  danger:        'bg-error-container text-on-error-container',
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
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-body',
        variantStyles[variant],
        className,
      ].join(' ')}
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
