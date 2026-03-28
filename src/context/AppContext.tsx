import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { User } from '../types'
import { useAuth } from '../hooks/useAuth'

// Placeholder sementara selama profile diambil di background
const LOADING_USER: User = {
  id:    '',
  nama:  '...',
  role:  'bendahara_penerimaan',
  unitId: null,
  email: '',
  nip:   '',
}

interface AppContextValue {
  currentUser:      User
  tahunAnggaran:    number
  setTahunAnggaran: (year: number) => void
  session:          Session | null
  authLoading:      boolean
  signIn:           (email: string, password: string) => Promise<boolean>
  signOut:          () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [tahunAnggaran, setTahunAnggaran] = useState(new Date().getFullYear())
  const { session, profile, loading: authLoading, signIn, signOut } = useAuth()

  const currentUser: User = profile ?? LOADING_USER

  return (
    <AppContext.Provider value={{
      currentUser,
      tahunAnggaran,
      setTahunAnggaran,
      session,
      authLoading,
      signIn,
      signOut,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider')
  return ctx
}
