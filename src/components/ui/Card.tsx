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
        'bg-surface-container-lowest rounded-xl shadow-card',
        accent ? 'border-l-[3px] border-primary' : '',
        !noLift ? 'card-lift' : '',
        paddingMap[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
