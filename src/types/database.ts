export type TransactionType = 'IN' | 'OUT' | 'TRANSFER'
export type TransactionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED'

export interface DbTenant {
  id: string
  name: string
  created_at: string | null
}

export interface DbRole {
  id: string
  tenant_id: string | null
  name: string
}

export interface DbUser {
  id: string
  email: string | null
  treasurer_category: string | null
  created_at: string | null
}

export interface DbUserTenant {
  id: string
  user_id: string | null
  tenant_id: string | null
  role_id: string | null
  created_at: string | null
}

export interface DbTreasurerCategory {
  id: string
  tenant_id: string | null
  name: string
}

export interface DbTreasurer {
  id: string
  tenant_id: string | null
  name: string
  category_id: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbAccount {
  id: string
  tenant_id: string
  bank_name: string
  account_number: string
  account_name: string
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export type DbBankAccount = DbAccount

export interface DbFundingSource {
  id: string
  tenant_id: string | null
  name: string
  kode_akun: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbSumberPendapatanBisnis {
  id: string
  tenant_id: string | null
  name: string
  kode: string | null
  deskripsi: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbBusinessUnit {
  id: string
  tenant_id: string | null
  name: string
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbRevenueCategory {
  id: string
  tenant_id: string | null
  name: string
  business_unit_id: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbWorkUnit {
  id: string
  tenant_id: string | null
  name: string
  parent_id: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbPeriod {
  id: string
  tenant_id: string | null
  year: number
  month: number
  semester: string | null
  code: string | null
  is_closed: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface DbTransaction {
  id: string
  tenant_id: string
  work_unit_id: string | null
  revenue_category_id: string | null
  source_account_id: string | null
  destination_account_id: string | null
  type: TransactionType
  status: TransactionStatus | null
  amount: number
  description: string | null
  transaction_date: string
  period_id: string | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  no_bukti: string | null
  kode_rekening: string | null
  lampiran_url: string | null
  jenis_pendapatan_id: string | null
  sumber_pendapatan_id: string | null
}

export interface DbClosingLog {
  id: string
  tenant_id: string | null
  period_id: string | null
  user_id: string | null
  closing_date: string
  action: string | null
  saldo_awal: number
  total_masuk: number
  total_keluar: number
  saldo_akhir: number
  created_at: string | null
}

export interface DbBankStatement {
  id: string
  tenant_id: string | null
  statement_date: string
  description: string
  debit: number
  credit: number
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface DbRekeningKoran {
  id: string
  tenant_id: string | null
  account_id: string
  bulan: number
  tahun: number
  drive_url: string
  keterangan: string | null
  created_at: string | null
  updated_at: string | null
}

export interface VwPendapatanSummary {
  tenant_id: string | null
  jenis_pendapatan_id: string
  kode_jenis_pendapatan: string | null
  jenis_pendapatan: string
  account_id: string
  bank_name: string
  account_name: string
  account_number: string
  work_unit_id: string | null
  unit_kerja: string | null
  year: number
  month: number
  jumlah_transaksi: number
  total_pendapatan: number
}

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: DbTenant
        Insert: Omit<DbTenant, 'id' | 'created_at'>
        Update: Partial<DbTenant>
        Relationships: []
      }
      users: {
        Row: DbUser
        Insert: Omit<DbUser, 'created_at'>
        Update: Partial<DbUser>
        Relationships: []
      }
      roles: {
        Row: DbRole
        Insert: Omit<DbRole, 'id'>
        Update: Partial<DbRole>
        Relationships: []
      }
      user_tenants: {
        Row: DbUserTenant
        Insert: Omit<DbUserTenant, 'id' | 'created_at'>
        Update: Partial<DbUserTenant>
        Relationships: []
      }
      treasurer_categories: {
        Row: DbTreasurerCategory
        Insert: Omit<DbTreasurerCategory, 'id'>
        Update: Partial<DbTreasurerCategory>
        Relationships: []
      }
      treasurers: {
        Row: DbTreasurer
        Insert: Omit<DbTreasurer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<DbTreasurer>
        Relationships: []
      }
      accounts: {
        Row: DbAccount
        Insert: Omit<DbAccount, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<DbAccount>
        Relationships: []
      }
      funding_sources: {
        Row: DbFundingSource
        Insert: Omit<DbFundingSource, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<DbFundingSource>
        Relationships: []
      }
      sumber_pendapatan_bisnis: {
        Row: DbSumberPendapatanBisnis
        Insert: Omit<DbSumberPendapatanBisnis, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<DbSumberPendapatanBisnis>
        Relationships: []
      }
      business_units: {
        Row: DbBusinessUnit
        Insert: Omit<DbBusinessUnit, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<DbBusinessUnit>
        Relationships: []
      }
      revenue_categories: {
        Row: DbRevenueCategory
        Insert: Omit<DbRevenueCategory, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<DbRevenueCategory>
        Relationships: []
      }
      work_units: {
        Row: DbWorkUnit
        Insert: Omit<DbWorkUnit, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<DbWorkUnit>
        Relationships: []
      }
      periods: {
        Row: DbPeriod
        Insert: Omit<DbPeriod, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<DbPeriod>
        Relationships: []
      }
      transactions: {
        Row: DbTransaction
        Insert: Omit<DbTransaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<DbTransaction>
        Relationships: []
      }
      closing_logs: {
        Row: DbClosingLog
        Insert: Omit<DbClosingLog, 'id' | 'created_at'>
        Update: Partial<DbClosingLog>
        Relationships: []
      }
      bank_statements: {
        Row: DbBankStatement
        Insert: Omit<DbBankStatement, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
        Update: Partial<DbBankStatement>
        Relationships: []
      }
      rekening_koran: {
        Row: DbRekeningKoran
        Insert: Omit<DbRekeningKoran, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<DbRekeningKoran>
        Relationships: []
      }
    }
    Views: {
      vw_pendapatan_summary: {
        Row: VwPendapatanSummary
        Relationships: []
      }
    }
    Functions: {
      submit_transaction: {
        Args: { tx_id: string }
        Returns: null
      }
      submit_transactions_bulk: {
        Args: { tx_ids: string[] }
        Returns: { submitted: number; skipped: number }
      }
      approve_transaction: {
        Args: { tx_id: string }
        Returns: null
      }
      approve_transactions_bulk: {
        Args: { tx_ids: string[] }
        Returns: { approved: number; skipped: number }
      }
      reject_transaction: {
        Args: { tx_id: string; note: string }
        Returns: null
      }
      reject_transactions_bulk: {
        Args: { tx_ids: string[]; note: string }
        Returns: { rejected: number; skipped: number }
      }
      get_bku_page: {
        Args: {
          p_bku_type: string
          p_tahun: number
          p_page: number
          p_page_size: number
          p_unit_id: string | null
          p_account_id: string | null
          p_bulan: number | null
          p_jenis_pendapatan_id: string | null
        }
        Returns: {
          total: number | null
          saldo_akhir: number | null
          total_debit: number | null
          total_kredit: number | null
          rows: unknown[] | null
        }
      }
    }
    Enums: {
      transaction_type: TransactionType
      transaction_status: TransactionStatus
    }
  }
}
