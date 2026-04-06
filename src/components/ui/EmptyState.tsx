interface EmptyStateProps {
  icon?:    string
  title:    string
  message?: string
}

export function EmptyState({ icon = 'inbox', title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="material-symbols-outlined text-5xl mb-3" style={{ color: 'rgba(232,234,240,0.3)' }}>
        {icon}
      </span>
      <p className="text-sm font-medium font-body" style={{ color: 'rgba(232,234,240,0.7)' }}>{title}</p>
      {message && (
        <p className="text-xs mt-1 font-body" style={{ color: 'rgba(232,234,240,0.5)' }}>{message}</p>
      )}
    </div>
  )
}
