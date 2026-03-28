import { NavLink } from 'react-router-dom'

interface SidebarNavItemProps {
  to:    string
  icon:  string
  label: string
}

export function SidebarNavItem({ to, icon, label }: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 group',
          isActive
            ? 'bg-primary-fixed/30 text-primary border-l-[3px] border-primary pl-[calc(0.75rem-3px)]'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border-l-[3px] border-transparent pl-[calc(0.75rem-3px)]',
        ].join(' ')
      }
    >
      <span
        className="material-symbols-outlined text-[1.25rem] leading-none flex-shrink-0"
        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
      >
        {icon}
      </span>
      <span className="font-body truncate">{label}</span>
    </NavLink>
  )
}
