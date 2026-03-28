import type { ReactNode } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm font-body">
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-container-low">
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
      className={[
        'px-4 py-3 text-xs font-medium uppercase tracking-label text-on-surface-variant',
        alignClass,
      ].join(' ')}
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
      className={[
        even ? 'bg-surface-container-low' : 'bg-surface-container-lowest',
        'hover:bg-primary-fixed/10 transition-colors duration-100',
      ].join(' ')}
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
    <td className={['px-4 py-3.5 text-on-surface', alignClass, className].join(' ')}>
      {children}
    </td>
  )
}
