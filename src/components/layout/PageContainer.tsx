import type { ReactNode } from 'react'

interface PageContainerProps {
  title?:    string
  children:  ReactNode
  actions?:  ReactNode
}

export function PageContainer({ title, children, actions }: PageContainerProps) {
  return (
    <div className="px-8">
      {(title || actions) && (
        <div className="flex items-center justify-between py-8 mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-white font-headline">{title}</h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="pb-8">
        {children}
      </div>
    </div>
  )
}
