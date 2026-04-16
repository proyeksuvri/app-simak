import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseFunctionsUrl } from '../lib/supabase'
import type { User, UserRole } from '../types'

interface AuthState {
  session:  Session | null
  profile:  User | null
  loading:  boolean
  error:    string | null
}

function mapToAppRole(roleName: string, categoryName?: string | null): UserRole {
  if (roleName === 'Admin')    return 'admin'
  if (roleName === 'Approver') return 'pimpinan'
  // Operator: role comes from treasurer category
  if (categoryName === 'bendahara_penerimaan') return 'bendahara_penerimaan'
  if (categoryName === 'bendahara_induk')      return 'bendahara_induk'
  if (categoryName === 'bendahara_pembantu')   return 'bendahara_pembantu'
  if (roleName === 'Operator') return 'bendahara_penerimaan'
  return 'admin' // fallback
}

function deriveNipFromEmail(email: string): string {
  return email.split('@')[0] ?? ''
}

async function fetchProfile(userId: string): Promise<User | null> {
  // Prefer backend profile endpoint for precise role/category mapping.
  const { data: sess } = await supabase.auth.getSession()
  const accessToken = sess.session?.access_token ?? ''
  if (accessToken) {
    try {
      const res = await fetch(`${supabaseFunctionsUrl}/get-user-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      })
      const body = await res.json()
      if (res.ok && body?.ok) {
        const roleName = String(body.role_name ?? '')
        const categoryName = body.treasurer_category ? String(body.treasurer_category) : null
        const email = String(body.email ?? '')
        // Read avatar_url from user_metadata as fallback
        const { data: authUser } = await supabase.auth.getUser()
        const meta = authUser?.user?.user_metadata as Record<string, unknown> | undefined
        return {
          id: userId,
          nama: String(body.nama || email.split('@')[0] || 'Pengguna'),
          email,
          role: mapToAppRole(roleName, categoryName),
          unitId: body.work_unit_id ? String(body.work_unit_id) : null,
          nip: String(body.nip || deriveNipFromEmail(email)),
          avatar_url: (meta?.avatar_url as string) || null,
        }
      }
    } catch {
      // Fallback to legacy local lookup below.
    }
  }

  // Legacy fallback:
  // 1. Ambil user_tenant
  const { data: utRaw, error: utErr } = await supabase
    .from('user_tenants')
    .select('role_id, tenant_id')
    .eq('user_id', userId)
    .single()
  const ut = utRaw as { role_id: string | null; tenant_id: string | null } | null

  if (utErr || !ut) return null

  // 2. Ambil nama role secara terpisah
  let roleName = ''
  if (ut.role_id) {
    const { data: roleRaw } = await supabase
      .from('roles')
      .select('name')
      .eq('id', ut.role_id)
      .single()
    const role = roleRaw as { name: string | null } | null
    roleName = role?.name ?? ''
  }

  // 3. Ambil data user auth (email + metadata)
  const { data: authUser } = await supabase.auth.getUser()
  const email = authUser?.user?.email ?? ''

  // 4. Ambil kategori bendahara (khusus Operator) dari user metadata terlebih dahulu.
  // Hindari mengambil dari `treasurers` per-tenant karena bisa salah user (random row).
  let categoryName: string | null = null
  if (roleName === 'Operator') {
    const meta = authUser?.user?.user_metadata as Record<string, unknown> | undefined
    const rawMetaCategory = String(
      meta?.treasurer_category
      ?? meta?.bendahara_category
      ?? meta?.category
      ?? '',
    ).trim()

    if (
      rawMetaCategory === 'bendahara_penerimaan'
      || rawMetaCategory === 'bendahara_induk'
      || rawMetaCategory === 'bendahara_pembantu'
    ) {
      categoryName = rawMetaCategory
    }
  }

  const meta2 = authUser?.user?.user_metadata as Record<string, unknown> | undefined
  return {
    id:         userId,
    nama:       email.split('@')[0] ?? 'Pengguna',
    email,
    role:       mapToAppRole(roleName, categoryName),
    unitId:     null,
    nip:        deriveNipFromEmail(email),
    avatar_url: (meta2?.avatar_url as string) || null,
  }
}

async function safeGetProfile(session: import('@supabase/supabase-js').Session) {
  try {
    return await fetchProfile(session.user.id)
  } catch (e) {
    console.error('[useAuth] fetchProfile error:', e)
    return null
  }
}

/** Cek localStorage secara synchronous — true jika ada sesi tersimpan */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return true
    }
  } catch { /* localStorage tidak tersedia (SSR/private mode) */ }
  return false
}

export function useAuth() {
  // Jika tidak ada sesi di localStorage → tidak perlu loading, langsung false
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: hasStoredSession(),  // true hanya jika ada sesi tersimpan
    error:   null,
  })

  useEffect(() => {
    let resolved = false

    // Safety timeout: jika 4 detik auth belum selesai, paksa loading: false
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[useAuth] Auth timeout — forcing loading: false')
        resolved = true
        setState(s => ({ ...s, loading: false }))
      }
    }, 4000)

    // onAuthStateChange di Supabase v2 fire langsung dengan INITIAL_SESSION
    // → set loading:false segera setelah session diketahui, fetch profile di background
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolved = true
      clearTimeout(timeout)

      if (session) {
        // Langsung buka app, profile diambil di background
        setState({ session, profile: null, loading: false, error: null })
        safeGetProfile(session).then(profile => {
          setState(s => s.session?.user.id === session.user.id
            ? { ...s, profile }
            : s
          )
        })
      } else {
        setState({ session: null, profile: null, loading: false, error: null })
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setState(s => ({ ...s, loading: true, error: null }))
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setState(s => ({ ...s, loading: false, error: error.message }))
      return false
    }
    // loading: false akan di-set oleh onAuthStateChange setelah signIn berhasil
    return true
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { ...state, signIn, signOut }
}
