import { useState, useEffect, useCallback, useRef } from 'react'
import type { Transaction, TransactionType, TransactionStatus } from '../types'
import type { DbTransaction } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

/** Data transaksi dianggap segar selama 5 menit — tab switch tidak memicu refetch */
const CACHE_TTL_MS = 5 * 60 * 1000

type TxPagedCacheKey = {
  ta: string; type: string; propStatus: string; unitId: string
  status: string; month: string; account: string; search: string
  kategori: string; kategoriList: string
  sortField: string; sortDir: string; page: number; pageSize: number
}

type TxPagedCache = {
  key:   TxPagedCacheKey
  at:    number
  rows:  Transaction[]
  total: number
  stats: PagedStats
}

export interface PagedStats {
  totalNominal:   number
  countDraft:     number
  countDiajukan:  number
  countVerified:  number
  missingAccount: number
}

export interface UseTransactionsPagedParams {
  type?:            TransactionType
  propStatus?:      TransactionStatus          // filter dari prop (ApprovalPage dll)
  unitId?:          string
  filterStatus?:    TransactionStatus | ''     // filter lokal UI
  filterMonth?:     string                     // '01'–'12'
  filterAccountId?: string
  searchText?:      string
  kategori?:        string
  kategoriList?:    string[]
  sortField?:       'tanggal' | 'nominal' | null
  sortDir?:         'asc' | 'desc'
  page:             number
  pageSize:         number
}

// ── Status mapping frontend → DB ──────────────────────────────────────────────
function toDbStatus(s: TransactionStatus): string[] {
  if (s === 'terverifikasi') return ['APPROVED', 'POSTED']
  if (s === 'diajukan')      return ['SUBMITTED']
  if (s === 'ditolak')       return ['REJECTED']
  return ['DRAFT']
}

function mapStatus(s: string | null): TransactionStatus {
  if (s === 'APPROVED' || s === 'POSTED') return 'terverifikasi'
  if (s === 'REJECTED')                   return 'ditolak'
  if (s === 'SUBMITTED')                  return 'diajukan'
  return 'pending'
}

function mapType(t: string): TransactionType {
  return t === 'IN' ? 'penerimaan' : 'pengeluaran'
}

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

export function useTransactionsPaged(params: UseTransactionsPagedParams) {
  const { tahunAnggaran } = useAppContext()

  const [rows,     setRows]     = useState<Transaction[]>([])
  const [total,    setTotal]    = useState(0)
  const [stats,    setStats]    = useState<PagedStats>({ totalNominal: 0, countDraft: 0, countDiajukan: 0, countVerified: 0, missingAccount: 0 })
  const [loading,  setLoading]  = useState(true)

  // Gunakan ref agar refetch() selalu punya params terbaru
  const paramsRef = useRef(params)
  paramsRef.current = params

  const cacheRef = useRef<TxPagedCache | null>(null)

  /** Buat cache key dari params saat ini — dipakai di load() dan useEffect */
  const buildKey = useCallback((): TxPagedCacheKey => {
    const p = paramsRef.current
    return {
      ta:          tahunAnggaran,
      type:        p.type        ?? '',
      propStatus:  p.propStatus  ?? '',
      unitId:      p.unitId      ?? '',
      status:      p.filterStatus     ?? '',
      month:       p.filterMonth      ?? '',
      account:     p.filterAccountId  ?? '',
      search:      p.searchText       ?? '',
      kategori:    p.kategori         ?? '',
      kategoriList:(p.kategoriList    ?? []).join(','),
      sortField:   p.sortField        ?? '',
      sortDir:     p.sortDir          ?? '',
      page:        p.page,
      pageSize:    p.pageSize,
    }
  }, [tahunAnggaran])

  const load = useCallback(async () => {
    setLoading(true)
    const p = paramsRef.current

    // ── Base query builder ─────────────────────────────────────────────────
    function baseQuery(selectClause: string, opts?: { count?: 'exact' }) {
      let q = supabase
        .from('transactions')
        .select(selectClause, opts)
        .is('deleted_at', null)
        .gte('transaction_date', `${tahunAnggaran}-01-01`)
        .lte('transaction_date', `${tahunAnggaran}-12-31`)
        .neq('type', 'TRANSFER')

      if (p.type === 'penerimaan') q = q.eq('type', 'IN')
      else if (p.type === 'pengeluaran') q = q.eq('type', 'OUT')

      if (p.unitId) q = q.eq('work_unit_id', p.unitId)

      // Status filter (prop-level lebih prioritas)
      const activeStatus = p.propStatus || (p.filterStatus as TransactionStatus | undefined)
      if (activeStatus) {
        const dbStatuses = toDbStatus(activeStatus)
        q = dbStatuses.length === 1
          ? q.eq('status', dbStatuses[0])
          : q.in('status', dbStatuses)
      }

      // Filter bulan
      if (p.filterMonth) {
        q = q
          .gte('transaction_date', `${tahunAnggaran}-${p.filterMonth}-01`)
          .lte('transaction_date', `${tahunAnggaran}-${p.filterMonth}-31`)
      }

      // Filter rekening bank
      if (p.filterAccountId) {
        if (p.type === 'penerimaan') {
          q = (q as any).eq('destination_account_id', p.filterAccountId)
        } else {
          q = q.eq('source_account_id', p.filterAccountId)
        }
      }

      // Filter kategori
      if (p.kategoriList && p.kategoriList.length > 0) {
        q = q.in('kode_rekening', p.kategoriList)
      } else if (p.kategori) {
        q = q.eq('kode_rekening', p.kategori)
      }

      // Search (server-side ilike)
      if (p.searchText?.trim()) {
        const q2 = p.searchText.trim()
        q = q.or(`description.ilike.%${q2}%,no_bukti.ilike.%${q2}%`)
      }

      return q
    }

    // ── 1. Query halaman + total count ────────────────────────────────────
    const sortCol = p.sortField === 'nominal' ? 'amount' : 'transaction_date'
    const sortAsc = p.sortDir === 'asc'

    const offset = (p.page - 1) * p.pageSize
    const { data, count, error } = await (baseQuery('*', { count: 'exact' }) as any)
      .order(sortCol, { ascending: sortAsc })
      .order('id',   { ascending: false })
      .range(offset, offset + p.pageSize - 1)

    if (error) {
      setLoading(false)
      return
    }

    const mapped: Transaction[] = ((data ?? []) as DbTransaction[]).map(r => ({
      id:                   r.id,
      tanggal:              r.transaction_date,
      deskripsi:            r.description ?? '',
      kategori:             (r.kode_rekening ?? 'PNBP Lainnya') as Transaction['kategori'],
      nominal:              Number(r.amount),
      type:                 mapType(r.type),
      status:               mapStatus(r.status),
      nomorBukti:           r.no_bukti ?? '-',
      unitId:               r.work_unit_id,
      sourceAccountId:      r.source_account_id ?? null,
      destinationAccountId: (r as any).destination_account_id ?? null,
      createdBy:            r.created_by ?? '',
      approvedBy:           (r as any).approved_by ?? null,
      rejectionNote:        (r as any).rejection_note ?? null,
    }))

    setRows(mapped)
    setTotal(count ?? 0)

    // ── 2. Stats query (ringkasan tanpa paginasi) ─────────────────────────
    const { data: statRows } = await (baseQuery('status, amount, destination_account_id, type') as any)

    let totalNominal = 0, countDraft = 0, countDiajukan = 0, countVerified = 0, missingAccount = 0
    for (const r of (statRows ?? []) as any[]) {
      const st = mapStatus(r.status)
      if (st === 'terverifikasi') { totalNominal += Number(r.amount); countVerified++ }
      if (st === 'pending')   countDraft++
      if (st === 'diajukan')  countDiajukan++
      if (p.type === 'penerimaan' && !r.destination_account_id) missingAccount++
    }
    setStats({ totalNominal, countDraft, countDiajukan, countVerified, missingAccount })

    // Simpan ke cache — dipakai useEffect untuk skip refetch saat tab switch
    cacheRef.current = {
      key:   buildKey(),
      at:    Date.now(),
      rows:  mapped,
      total: count ?? 0,
      stats: { totalNominal, countDraft, countDiajukan, countVerified, missingAccount },
    }

    setLoading(false)
  }, [tahunAnggaran, buildKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch saat params relevan berubah; skip jika cache masih segar (< 5 menit)
  useEffect(() => {
    const key = buildKey()
    const c   = cacheRef.current
    const hit = c
      && (Date.now() - c.at) < CACHE_TTL_MS
      && (Object.keys(key) as (keyof TxPagedCacheKey)[]).every(k => c.key[k] === key[k])
    if (hit) {
      setRows(c.rows)
      setTotal(c.total)
      setStats(c.stats)
      return
    }
    load()
  }, [
    load,
    buildKey,
    tahunAnggaran,
    params.type, params.propStatus, params.unitId,
    params.filterStatus, params.filterMonth, params.filterAccountId,
    params.searchText, params.kategori, params.page, params.pageSize,
    params.sortField, params.sortDir,
    // kategoriList: panjang array sebagai proxy perubahan
    params.kategoriList?.join(','),
  ])

  return { rows, total, stats, loading, refetch: load }
}
