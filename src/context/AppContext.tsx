import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { User } from '../types'
import { useAuth } from '../hooks/useAuth'

const STORAGE_KEY = 'simak_bku_tahun_anggaran'
const DEFAULT_YEAR = 2026

function readStoredYear(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return Number(stored)
  } catch { /* noop */ }
  return DEFAULT_YEAR
}

// Placeholder sementara selama profile diambil di background
const LOADING_USER: User = {
  id:         '',
  nama:       '...',
  role:       'bendahara_penerimaan',
  unitId:     null,
  email:      '',
  nip:        '',
  avatar_url: null,
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
  const [tahunAnggaran, setTahunAnggaranState] = useState<number>(readStoredYear)
  const { session, profile, loading: authLoading, signIn, signOut } = useAuth()

  const setTahunAnggaran = (year: number) => {
    try { localStorage.setItem(STORAGE_KEY, String(year)) } catch { /* noop */ }
    setTahunAnggaranState(year)
  }

  const handleSignOut = async () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
    await signOut()
  }

  const currentUser: User = profile ?? LOADING_USER

  return (
    <AppContext.Provider value={{
      currentUser,
      tahunAnggaran,
      setTahunAnggaran,
      session,
      authLoading,
      signIn,
      signOut: handleSignOut,
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
