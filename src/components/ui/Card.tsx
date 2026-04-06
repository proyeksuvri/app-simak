import type { ReactNode } from 'react'

interface CardProps {
  children:   ReactNode
  className?: string
  accent?:    boolean
  padding?:   'sm' | 'md' | 'lg'
  noLift?:    boolean   // opt-out for table wrapper cards
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', accent = false, padding = 'md', noLift = false }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl',
        accent ? 'border-l-[3px]' : '',
        paddingMap[padding],
        className,
      ].join(' ')}
      style={{
        background: '#161a21',
        border: accent ? undefined : 'none',
        borderLeftColor: accent ? '#9B6DFF' : undefined,
      }}
    >
      {children}
    </div>
  )
}
