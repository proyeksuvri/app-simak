interface EmptyStateProps {
  icon?:    string
  title:    string
  message?: string
}

export function EmptyState({ icon = 'inbox', title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40 mb-3">
        {icon}
      </span>
      <p className="text-sm font-medium text-on-surface-variant font-body">{title}</p>
      {message && (
        <p className="text-xs text-on-surface-variant/60 mt-1 font-body">{message}</p>
      )}
    </div>
  )
}
