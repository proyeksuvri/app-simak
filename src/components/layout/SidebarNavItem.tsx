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
          'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
          isActive
            ? 'border-l-2'
            : 'border-l-2 border-transparent',
        ].join(' ')
      }
      style={({ isActive }) => isActive
        ? {
            background: 'rgba(108,72,209,0.18)',
            borderLeftColor: '#9B6DFF',
            color: '#c4b5fd',
          }
        : {
            color: 'rgba(232,234,240,0.45)',
          }
      }
      onMouseEnter={e => {
        const el = e.currentTarget
        if (!el.classList.contains('active')) {
          el.style.color = 'rgba(232,234,240,0.85)'
          el.style.background = 'rgba(255,255,255,0.05)'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (!el.getAttribute('aria-current')) {
          el.style.background = ''
          el.style.color = 'rgba(232,234,240,0.45)'
        }
      }}
    >
      <span
        className="material-symbols-outlined flex-shrink-0"
        style={{ fontSize: '1.1rem', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
      >
        {icon}
      </span>
      <span className="font-body truncate">{label}</span>
    </NavLink>
  )
}
