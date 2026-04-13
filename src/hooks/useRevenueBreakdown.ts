import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/** Cache 5 menit — konsisten dengan hook lain di dashboard */
const CACHE_TTL_MS = 5 * 60 * 1000

export interface RevenueBreakdownRow {
  id:    string   // jenis_pendapatan_id
  kode:  string   // kode_jenis_pendapatan (bisa kosong)
  label: string   // jenis_pendapatan
  total: number
  count: number
  pct:   number   // 0–100
}

type CacheKey = { filterFrom: string; filterTo: string }

type Cache = {
  key:  CacheKey
  at:   number
  rows: RevenueBreakdownRow[]
}

export function useRevenueBreakdown(filterFrom: string, filterTo: string) {
  const [rows,    setRows]    = useState<RevenueBreakdownRow[]>([])
  const [loading, setLoading] = useState(true)

  const cacheRef = useRef<Cache | null>(null)

  useEffect(() => {
    // Nonaktif jika filterFrom kosong (role non-pimpinan/admin)
    if (!filterFrom || !filterTo) {
      setLoading(false)
      return
    }

    // ── Cache check ────────────────────────────────────────────────────────
    const key: CacheKey = { filterFrom, filterTo }
    const c = cacheRef.current
    if (
      c &&
      c.key.filterFrom === filterFrom &&
      c.key.filterTo   === filterTo   &&
      (Date.now() - c.at) < CACHE_TTL_MS
    ) {
      setRows(c.rows)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)

      // Parse rentang ke year/month agar bisa filter vw_pendapatan_summary
      const [fromY, fromM] = filterFrom.substring(0, 7).split('-').map(Number) as [number, number]
      const [toY,   toM  ] = filterTo.substring(0, 7).split('-').map(Number)   as [number, number]

      // Query semua baris dalam rentang tahun; filter bulan dilakukan client-side
      // karena view tidak punya kolom filterFrom/filterTo langsung
      let query = supabase
        .from('vw_pendapatan_summary')
        .select('jenis_pendapatan_id, kode_jenis_pendapatan, jenis_pendapatan, jumlah_transaksi, total_pendapatan, year, month')
        .gte('year', fromY)
        .lte('year', toY)
        .order('total_pendapatan', { ascending: false })

      const { data, error } = await query

      if (cancelled) return

      if (error || !data) {
        setLoading(false)
        return
      }

      // ── Filter baris sesuai rentang bulan persis ───────────────────────
      type RawRow = {
        jenis_pendapatan_id:   string
        kode_jenis_pendapatan: string | null
        jenis_pendapatan:      string
        jumlah_transaksi:      number
        total_pendapatan:      number
        year:                  number
        month:                 number
      }

      const fromKey = fromY * 100 + fromM
      const toKey   = toY   * 100 + toM

      const filtered = (data as RawRow[]).filter(r => {
        const k = r.year * 100 + r.month
        return k >= fromKey && k <= toKey
      })

      // ── Agregasi per jenis_pendapatan ────────────────────────────────
      const map: Record<string, {
        id:    string
        kode:  string
        label: string
        total: number
        count: number
      }> = {}

      for (const r of filtered) {
        const id = r.jenis_pendapatan_id
        if (!map[id]) {
          map[id] = {
            id,
            kode:  r.kode_jenis_pendapatan ?? '',
            label: r.jenis_pendapatan,
            total: 0,
            count: 0,
          }
        }
        map[id]!.total += Number(r.total_pendapatan)
        map[id]!.count += Number(r.jumlah_transaksi)
      }

      const sorted = Object.values(map).sort((a, b) => b.total - a.total)
      const grandTotal = sorted.reduce((s, r) => s + r.total, 0)

      const result: RevenueBreakdownRow[] = sorted.map(r => ({
        ...r,
        pct: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
      }))

      if (!cancelled) {
        cacheRef.current = { key, at: Date.now(), rows: result }
        setRows(result)
        setLoading(false)
      }
    }

    load().catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filterFrom, filterTo])

  return { rows, loading }
}
