export type UserRole =
  | 'admin'
  | 'pimpinan'
  | 'bendahara_induk'
  | 'bendahara_pembantu'
  | 'bendahara_penerimaan'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin:                  'Admin Sistem',
  pimpinan:               'Pimpinan (Rektor)',
  bendahara_induk:        'Bendahara Induk Pengeluaran',
  bendahara_pembantu:     'Bendahara Pengeluaran Pembantu',
  bendahara_penerimaan:   'Bendahara Penerimaan',
}

export interface User {
  id:        string
  nama:      string
  role:      UserRole
  unitId:    string | null  // null untuk admin, pimpinan, BIP, BP
  email:     string
  nip:       string
}
