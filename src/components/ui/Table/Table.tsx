import type { ReactNode } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm font-body border-collapse">
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <tr>{children}</tr>
    </thead>
  )
}

export function TableHeadCell({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th
      className={['px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-widest font-body', alignClass].join(' ')}
      style={{ color: 'rgba(232,234,240,0.4)' }}
    >
      {children}
    </th>
  )
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableRow({
  children,
  even = false,
}: {
  children: ReactNode
  even?: boolean
}) {
  return (
    <tr
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: even ? 'rgba(255,255,255,0.02)' : 'transparent',
      }}
    >
      {children}
    </tr>
  )
}

export function TableCell({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <td
      className={['px-4 py-3.5', alignClass, className].join(' ')}
      style={{ color: '#e8eaf0' }}
    >
      {children}
    </td>
  )
}
