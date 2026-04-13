import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { AnomalyItem } from '../types/dashboard'
import { formatRupiah } from '../lib/formatters'

/** Cache 5 menit — konsisten dengan useDashboardData */
const CACHE_TTL_MS = 5 * 60 * 1000

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

type CacheKey = { filterFrom: string; filterTo: string }

type Cache = {
  key:       CacheKey
  at:        number
  anomalies: AnomalyItem[]
}

export function useAnomalyData(filterFrom: string, filterTo: string) {
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([])
  const [loading,   setLoading]   = useState(true)

  const cacheRef = useRef<Cache | null>(null)

  useEffect(() => {
    // Hook dinonaktifkan jika filterFrom kosong (role bukan pimpinan/admin)
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
      setAnomalies(c.anomalies)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)

      // ── Semua query dijalankan paralel ────────────────────────────────────
      const [lampiranRes, saldoRes, closedPeriodsRes, bankStmtRes] = await Promise.all([

        // 1. Lampiran kosong — transaksi APPROVED/POSTED tanpa lampiran
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['APPROVED', 'POSTED'])
          .is('lampiran_url', null)
          .is('deleted_at', null)
          .gte('transaction_date', filterFrom)
          .lte('transaction_date', filterTo),

        // 2. Saldo minus — hari dengan saldo kumulatif negatif
        supabase
          .from('vw_saldo_kumulatif')
          .select('tanggal, saldo_akhir')
          .lt('saldo_akhir', 0)
          .gte('tanggal', filterFrom)
          .lte('tanggal', filterTo)
          .order('saldo_akhir', { ascending: true })
          .limit(1),

        // 3. Rekonsiliasi — periode tertutup dalam rentang filter
        supabase
          .from('periods')
          .select('id, year, month')
          .eq('is_closed', true),

        // 4. Rekening koran — bulan mana saja yang sudah ada bank statement
        supabase
          .from('bank_statements')
          .select('statement_date')
          .is('deleted_at', null)
          .gte('statement_date', filterFrom)
          .lte('statement_date', filterTo),
      ])

      if (cancelled) return

      const result: AnomalyItem[] = []

      // ── 1. Lampiran kosong ────────────────────────────────────────────────
      const lampiranCount = lampiranRes.count ?? 0
      if (lampiranCount > 0) {
        result.push({
          id:       'lampiran_kosong',
          severity: lampiranCount >= 5 ? 'peringatan' : 'info',
          kategori: 'Kepatuhan Dokumen',
          title:    'Lampiran Dokumen Kosong',
          detail:   `${lampiranCount} transaksi sudah terverifikasi atau diposting tetapi belum memiliki lampiran pendukung`,
          count:    lampiranCount,
        })
      }

      // ── 2. Saldo minus ────────────────────────────────────────────────────
      if (!saldoRes.error && saldoRes.data && saldoRes.data.length > 0) {
        const row = saldoRes.data[0] as { tanggal: string; saldo_akhir: number }
        const tgl = new Date(row.tanggal).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
        result.push({
          id:       'saldo_minus',
          severity: 'kritis',
          kategori: 'Risiko Keuangan',
          title:    'Saldo Kas Minus',
          detail:   `Saldo negatif terdeteksi pada ${tgl}: ${formatRupiah(row.saldo_akhir)}`,
          count:    1,
        })
      }

      // ── 3. Rekonsiliasi belum lengkap ─────────────────────────────────────
      if (!closedPeriodsRes.error) {
        const [fromY, fromM] = filterFrom.split('-').map(Number) as [number, number]
        const [toY,   toM  ] = filterTo.split('-').map(Number)   as [number, number]
        const fromKey = fromY * 100 + fromM
        const toKey   = toY   * 100 + toM

        const closedPeriods = (closedPeriodsRes.data ?? []) as { id: string; year: number; month: number }[]
        const inRange = closedPeriods.filter(p => {
          const k = p.year * 100 + p.month
          return k >= fromKey && k <= toKey
        })

        if (inRange.length > 0) {
          // Kumpulkan bulan yang sudah ada bank statement
          const bsMonths = new Set(
            (bankStmtRes.data ?? []).map((r: { statement_date: string }) =>
              r.statement_date.substring(0, 7)   // "YYYY-MM"
            )
          )

          // Jika belum ada bank statement sama sekali → fitur belum dipakai → skip
          // Jika sudah ada sebagian → periode yang kosong = anomali
          if (bsMonths.size > 0) {
            const unreconciled = inRange.filter(p => {
              const key = `${p.year}-${String(p.month).padStart(2, '0')}`
              return !bsMonths.has(key)
            })

            if (unreconciled.length > 0) {
              const labels = unreconciled
                .slice(0, 3)
                .map(p => `${MONTHS_ID[p.month - 1]} ${p.year}`)
              const suffix = unreconciled.length > 3 ? ` dan ${unreconciled.length - 3} lainnya` : ''
              result.push({
                id:       'rekonsiliasi_kosong',
                severity: 'info',
                kategori: 'Rekonsiliasi Bank',
                title:    'Rekonsiliasi Belum Lengkap',
                detail:   `Periode ${labels.join(', ')}${suffix} sudah ditutup tetapi belum ada rekening koran yang diupload`,
                count:    unreconciled.length,
              })
            }
          }
        }
      }

      // ── Urutkan: kritis → peringatan → info ───────────────────────────────
      const ORDER: Record<AnomalyItem['severity'], number> = { kritis: 0, peringatan: 1, info: 2 }
      result.sort((a, b) => ORDER[a.severity] - ORDER[b.severity])

      if (!cancelled) {
        cacheRef.current = { key, at: Date.now(), anomalies: result }
        setAnomalies(result)
        setLoading(false)
      }
    }

    load().catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filterFrom, filterTo])

  return { anomalies, loading }
}
