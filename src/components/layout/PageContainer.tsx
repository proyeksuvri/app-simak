import type { ReactNode } from 'react'

interface PageContainerProps {
  title?:    string
  children:  ReactNode
  actions?:  ReactNode
}

export function PageContainer({ title, children, actions }: PageContainerProps) {
  return (
    <div className="px-8 pb-8">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6">
          {title && (
            <h2 className="text-xl font-bold text-on-surface font-headline">{title}</h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
