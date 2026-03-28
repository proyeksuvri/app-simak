import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

export interface AppUser {
  userId:   string
  email:    string
  roleName: string
  role:     UserRole
}

const ROLE_MAP: Record<string, UserRole> = {
  Admin:    'admin',
  Approver: 'pimpinan',
}

export function useUsers() {
  const [users, setUsers]     = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    // Fetch user_tenants + roles
    const { data: utData } = await supabase
      .from('user_tenants')
      .select('user_id, role_id')

    if (!utData) { setLoading(false); return }

    // Fetch roles
    const roleIds = [...new Set(utData.map((r: any) => r.role_id))]
    const { data: rolesData } = await supabase
      .from('roles')
      .select('id, name')
      .in('id', roleIds)

    const roleMap: Record<string, { name: string; appRole: UserRole }> = {}
    for (const r of (rolesData ?? []) as { id: string; name: string }[]) {
      roleMap[r.id] = { name: r.name, appRole: ROLE_MAP[r.name] ?? 'bendahara_penerimaan' }
    }

    // Fetch user emails + treasurer_category
    const userIds = utData.map((r: any) => r.user_id as string)
    const { data: usersData } = await supabase
      .from('users')
      .select('id, email, treasurer_category')
      .in('id', userIds)

    const userMap: Record<string, { email: string; category: string | null }> = {}
    for (const u of (usersData ?? []) as { id: string; email: string; treasurer_category: string | null }[]) {
      userMap[u.id] = { email: u.email, category: u.treasurer_category }
    }

    const result: AppUser[] = utData.map((r: any) => {
      const dbRole    = roleMap[r.role_id]?.name ?? ''
      const category  = userMap[r.user_id]?.category ?? null
      let appRole: UserRole
      if (dbRole === 'Admin')    appRole = 'admin'
      else if (dbRole === 'Approver') appRole = 'pimpinan'
      else if (category === 'bendahara_induk')    appRole = 'bendahara_induk'
      else if (category === 'bendahara_pembantu') appRole = 'bendahara_pembantu'
      else                                         appRole = 'bendahara_penerimaan'
      return {
        userId:   r.user_id,
        email:    userMap[r.user_id]?.email ?? r.user_id,
        roleName: dbRole || '-',
        role:     appRole,
      }
    })

    setUsers(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { users, loading, refetch: load }
}
