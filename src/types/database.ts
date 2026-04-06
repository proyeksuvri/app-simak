// Auto-generated shape matching Supabase schema (bqlrbdzmexmjcumechmt)

export interface DbBankAccount {
  id:             string
  tenant_id:      string
  bank_name:      string
  account_number: string
  account_name:   string
  is_active:      boolean
  created_at:     string | null
}

export type TransactionType   = 'IN' | 'OUT' | 'TRANSFER'
export type TransactionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED'

export interface DbTenant {
  id:         string
  name:       string
  created_at: string | null
}

export interface DbRole {
  id:        string
  tenant_id: string | null
  name:      string  // 'Admin' | 'Operator' | 'Approver'
}

export interface DbUser {
  id:         string
  email:      string | null
  created_at: string | null
}

export interface DbUserTenant {
  id:         string
  user_id:    string | null
  tenant_id:  string | null
  role_id:    string | null
  created_at: string | null
  role?:      DbRole
}

export interface DbTreasurerCategory {
  id:        string
  tenant_id: string | null
  name:      string  // 'bendahara_penerimaan' | 'bendahara_induk' | 'bendahara_pembantu'
}

export interface DbTreasurer {
  id:          string
  tenant_id:   string | null
  name:        string
  category_id: string | null
  created_at:  string | null
  updated_at:  string | null
  deleted_at:  string | null
  category?:   DbTreasurerCategory
}

export interface DbFundingSource {
  id:        string
  tenant_id: string | null
  name:      string
  kode_akun: string | null
}

export interface DbSumberPendapatanBisnis {
  id:         string
  tenant_id:  string | null
  name:       string
  kode:       string | null
  deskripsi:  string | null
  created_at: string | null
  deleted_at: string | null
}

export interface DbBusinessUnit {
  id:        string
  tenant_id: string | null
  name:      string
}

export interface DbRevenueCategory {
  id:               string
  tenant_id:        string | null
  name:             string
  business_unit_id: string | null
  updated_at:       string | null
  deleted_at:       string | null
}

export interface DbWorkUnit {
  id:         string
  tenant_id:  string | null
  name:       string
  parent_id:  string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbPeriod {
  id:         string
  tenant_id:  string | null
  year:       number
  month:      number
  semester:   string | null
  code:       string | null
  is_closed:  boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface DbTransaction {
  id:                    string
  tenant_id:             string
  work_unit_id:          string | null
  revenue_category_id:   string | null
  source_account_id:     string | null
  destination_account_id:string | null
  type:                  TransactionType
  status:                TransactionStatus | null
  amount:                number
  description:           string | null
  transaction_date:      string
  period_id:             string | null
  created_by:            string | null
  created_at:            string | null
  updated_at:            string | null
  deleted_at:            string | null
  no_bukti:              string | null
  kode_rekening:         string | null
  lampiran_url:          string | null
  jenis_pendapatan_id:     string | null
  sumber_pendapatan_id:    string | null
  work_unit?:              DbWorkUnit
}

// Supabase Database type for createClient generic
export interface Database {
  public: {
    Tables: {
      tenants:              { Row: DbTenant;             Insert: Omit<DbTenant, 'id' | 'created_at'>;             Update: Partial<DbTenant> }
      users:                { Row: DbUser;               Insert: Omit<DbUser, 'created_at'>;                      Update: Partial<DbUser> }
      roles:                { Row: DbRole;               Insert: Omit<DbRole, 'id'>;                              Update: Partial<DbRole> }
      user_tenants:         { Row: DbUserTenant;         Insert: Omit<DbUserTenant, 'id' | 'created_at'>;         Update: Partial<DbUserTenant> }
      treasurer_categories: { Row: DbTreasurerCategory;  Insert: Omit<DbTreasurerCategory, 'id'>;                 Update: Partial<DbTreasurerCategory> }
      treasurers:           { Row: DbTreasurer;          Insert: Omit<DbTreasurer, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DbTreasurer> }
      work_units:           { Row: DbWorkUnit;            Insert: Omit<DbWorkUnit, 'id'>;                          Update: Partial<DbWorkUnit> }
      periods:              { Row: DbPeriod;              Insert: Omit<DbPeriod, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DbPeriod> }
      transactions:         { Row: DbTransaction;         Insert: Omit<DbTransaction, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DbTransaction> }
    }
    Views:   Record<string, never>
    Functions: Record<string, never>
    Enums: {
      transaction_type:   TransactionType
      transaction_status: TransactionStatus
    }
  }
}
