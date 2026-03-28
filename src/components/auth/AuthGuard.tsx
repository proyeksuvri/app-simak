import { Navigate, Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'

export function AuthGuard() {
  const { session, authLoading } = useAppContext()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-gradient flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-on-primary text-[1.1rem]">account_balance</span>
          </div>
          <p className="text-sm text-on-surface-variant font-body">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
