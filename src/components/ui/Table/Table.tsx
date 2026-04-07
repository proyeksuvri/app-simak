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
    <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>
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
      style={{ color: 'rgba(255,255,255,0.95)' }}
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
  style,
}: {
  children: ReactNode
  even?: boolean
  style?: React.CSSProperties
}) {
  return (
    <tr
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: even ? 'rgba(255,255,255,0.05)' : 'transparent',
        ...style,
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
      style={{ color: 'rgba(255,255,255,0.92)' }}
    >
      {children}
    </td>
  )
}
