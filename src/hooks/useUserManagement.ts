import { supabase, supabaseFunctionsUrl } from '../lib/supabase'

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return `Bearer ${data.session?.access_token ?? ''}`
}

export type UserRole     = 'Admin' | 'Approver' | 'Operator'
export type BendaharaKategori = 'bendahara_penerimaan' | 'bendahara_induk' | 'bendahara_pembantu'

export interface CreateUserPayload {
  email:        string
  password:     string
  nama:         string
  role:         UserRole
  category?:    BendaharaKategori
  work_unit_id?: string
}

export interface EditUserPayload {
  email:        string
  password?:    string   // opsional saat edit
  nama:         string
  role:         UserRole
  category?:    BendaharaKategori
  work_unit_id?: string
}

export function useUserManagement() {
  const callCreateUser = async (payload: CreateUserPayload | EditUserPayload): Promise<string | null> => {
    try {
      const res = await fetch(`${supabaseFunctionsUrl}/create-user`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': await getAuthHeader() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) return json.error ?? 'Gagal menyimpan user'
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Gagal menyimpan user'
    }
  }

  const createUser = (payload: CreateUserPayload) => callCreateUser(payload)
  const editUser   = (payload: EditUserPayload)   => callCreateUser(payload)

  const deleteUser = async (targetUserId: string): Promise<string | null> => {
    const res = await fetch(`${supabaseFunctionsUrl}/delete-user`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': await getAuthHeader(),
      },
      body: JSON.stringify({ target_user_id: targetUserId }),
    })
    const json = await res.json()
    if (!res.ok) return json.error ?? 'Gagal menghapus user'
    return null
  }

  return { createUser, editUser, deleteUser }
}
