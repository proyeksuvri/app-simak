import type { ReactNode } from 'react'

interface SidebarSectionProps {
  label:    string
  children: ReactNode
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 mb-1 text-[0.65rem] font-medium uppercase tracking-label text-on-surface-variant/50 font-body">
        {label}
      </p>
      {children}
    </div>
  )
}
