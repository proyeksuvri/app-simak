import { useState, useEffect, useRef } from 'react'
import type { MetricCardData, ChartDataPoint, ApprovalItem, BpnPipelineData, BpnKategoriRow, BpnRekeningRow, BpnActionItem, BpnAlertCounts, RekeningAktifRow } from '../types'
import type { DbTransaction, DbPeriod, DbAccount } from '../types/database'
import { supabase } from '../lib/supabase'
import { useAppContext } from '../context/AppContext'

const EMPTY_METRICS: MetricCardData[] = [
  { id: 'saldo_awal', label: 'Saldo Awal',         value: 0, icon: 'account_balance',        trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm1',         label: 'Total Penerimaan',   value: 0, icon: 'trending_up',            trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm2',         label: 'Total Pengeluaran',  value: 0, icon: 'trending_down',           trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'saldo',      label: 'Saldo Akhir',        value: 0, icon: 'account_balance_wallet',  trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'm4',         label: 'Transaksi Verified', value: 0, icon: 'verified',                trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'rekening',   label: 'Rekening Aktif',     value: 0, icon: 'credit_card',             trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'pending',    label: 'Transaksi Pending',  value: 0, icon: 'pending_actions',         trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
  { id: 'approval',   label: 'Menunggu Posting',   value: 0, icon: 'approval',                trendDir: 'neutral', trend: 0, subtitle: 'Memuat...' },
]

export type ChartView = 'harian' | 'mingguan' | 'bulanan'

/** Data dianggap segar selama 5 menit — tab switch tidak memicu refetch */
const CACHE_TTL_MS = 5 * 60 * 1000

type CacheKey = { filterFrom: string; filterTo: string; chartView: ChartView; userId: string; role: string }

export function useDashboardData(filterFrom: string, filterTo: string, periodLabel: string, chartView: ChartView = 'harian') {
  const { currentUser } = useAppContext()
  const [metrics,          setMetrics]   = useState<MetricCardData[]>(EMPTY_METRICS)
  const [chartData,        setChartData] = useState<ChartDataPoint[]>([])
  const [approvals,        setApprovals] = useState<ApprovalItem[]>([])
  const [deadlineTutupBuku,setDeadline]  = useState('')
  const [loading,          setLoading]   = useState(true)
  const [bpnPipeline,    setBpnPipeline]    = useState<BpnPipelineData | null>(null)
  const [bpnKategori,    setBpnKategori]    = useState<BpnKategoriRow[]>([])
  const [bpnRekening,    setBpnRekening]    = useState<BpnRekeningRow[]>([])
  const [bpnActionItems, setBpnActionItems] = useState<BpnActionItem[]>([])
  const [bpnAlerts,      setBpnAlerts]      = useState<BpnAlertCounts>({ rejected: 0, missingAccount: 0 })
  const [rekeningAktif,  setRekeningAktif]  = useState<RekeningAktifRow[]>([])

  const cacheRef = useRef<{ key: CacheKey; at: number } | null>(null)

  const role   = currentUser.role
  const unitId = currentUser.unitId
  const profileReady = !!currentUser.id
  const isGlobal = profileReady && (role === 'admin' || role === 'pimpinan')
  const isBPN    = profileReady && role === 'bendahara_penerimaan'
  const isBPK    = profileReady && (role === 'bendahara_induk' || role === 'bendahara_pembantu')

  useEffect(() => {
    // Tunggu sampai user profile siap (bukan loading placeholder)
    if (!currentUser.id) return

    // Skip refetch jika parameter sama dan data masih segar (tab switch, dll.)
    const cacheKey: CacheKey = { filterFrom, filterTo, chartView, userId: currentUser.id, role: currentUser.role }
    const cache = cacheRef.current
    const paramsMatch = cache && Object.keys(cacheKey).every(k => cache.key[k as keyof CacheKey] === cacheKey[k as keyof CacheKey])
    if (paramsMatch && (Date.now() - cache!.at) < CACHE_TTL_MS) return

    let cancelled = false

    async function load() {
      setLoading(true)

      // ── 1. Metric totals ───────────────────────────────────────────────────
      const [fromYear, fromMonth] = filterFrom.split('-').map(Number) as [number, number]
      const [toYear, toMonth] = filterTo.split('-').map(Number) as [number, number]
      const fromMonthKey = fromYear * 100 + fromMonth
      const toMonthKey = toYear * 100 + toMonth

      let aggQuery = supabase
        .from('transactions')
        .select('type, amount, status')
        .is('deleted_at', null)
        .in('status', ['APPROVED', 'POSTED'])
        .gte('transaction_date', filterFrom)
        .lte('transaction_date', filterTo)

      if (isBPN) aggQuery = aggQuery.eq('type', 'IN')
      if (isBPK) aggQuery = aggQuery.eq('type', 'OUT')
      if (role === 'bendahara_pembantu' && unitId) aggQuery = aggQuery.eq('work_unit_id', unitId)

      // ── Query vw_dashboard_summary langsung (view kini punya kolom year & month)
      const kpiViewQuery = (!isBPN && !isBPK)
        ? supabase
            .from('vw_dashboard_summary')
            .select('period_id, year, month, total_penerimaan, total_pengeluaran, saldo_kas, transaksi_verified')
            .gte('year', fromYear)
            .lte('year', toYear)
        : Promise.resolve({ data: [] })

      // ── 2. Chart (daily atau monthly tergantung rentang) ──────────────────
      const dayDiff = Math.round(
        (new Date(filterTo).getTime() - new Date(filterFrom).getTime()) / 86400000
      )
      const useMonthly = dayDiff > 35

      let chartQuery = supabase
        .from('transactions')
        .select('type, amount, transaction_date')
        .is('deleted_at', null)
        .in('status', ['APPROVED', 'POSTED'])
        .gte('transaction_date', filterFrom)
        .lte('transaction_date', filterTo)

      if (isBPN) chartQuery = chartQuery.eq('type', 'IN')
      if (isBPK) chartQuery = chartQuery.eq('type', 'OUT')
      if (role === 'bendahara_pembantu' && unitId) chartQuery = chartQuery.eq('work_unit_id', unitId)

      // ── 3. Pending approvals (SUBMITTED) ──────────────────────────────────
      let pendingQuery = supabase
        .from('transactions')
        .select('id, no_bukti, description, amount, transaction_date, type, created_by')
        .eq('status', 'SUBMITTED')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .limit(10)

      if (isBPN) pendingQuery = pendingQuery.eq('type', 'IN')
      if (isBPK) pendingQuery = pendingQuery.eq('type', 'OUT')
      if (role === 'bendahara_pembantu' && unitId) pendingQuery = pendingQuery.eq('work_unit_id', unitId)

      // ── 4. Deadline tutup buku ─────────────────────────────────────────────
      const periodQuery = supabase
        .from('periods')
        .select('year, month')
        .eq('is_closed', false)
        .order('year',  { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .single()

      // ── 5. Rekening Aktif ─────────────────────────────────────────────────────
      const rekeningQuery = supabase
        .from('vw_rekening_aktif')
        .select('id, bank_name, account_number, account_name')

      // ── 7. Status Count — SUBMITTED (pending) dan APPROVED (menunggu posting) ─
      let statusCountQuery = supabase
        .from('vw_transaksi_status')
        .select('status, jumlah')
        .in('status', ['SUBMITTED', 'APPROVED'])
        .gte('tanggal', filterFrom)
        .lte('tanggal', filterTo)

      if (isBPN) statusCountQuery = statusCountQuery.eq('type', 'IN')
      if (isBPK) statusCountQuery = statusCountQuery.eq('type', 'OUT')

      // ── 8. Saldo Awal — kumulatif semua transaksi sebelum filterFrom ─────────
      const saldoAwalQuery = (!isBPN && !isBPK)
        ? supabase
            .from('vw_saldo_kumulatif')
            .select('saldo_akhir')
            .lt('tanggal', filterFrom)
            .order('tanggal', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null })

      // ── 9. BPN full data — semua status, untuk pipeline & breakdown ────────
      const bpnFullQuery = isBPN
        ? supabase
            .from('transactions')
            .select('id, status, amount, kode_rekening, destination_account_id, transaction_date, no_bukti')
            .is('deleted_at', null)
            .eq('type', 'IN')
            .gte('transaction_date', filterFrom)
            .lte('transaction_date', filterTo)
        : Promise.resolve({ data: null })

      const [aggResult, kpiViewResult, chartResult, pendingResult, periodResult, rekeningResult, statusCountResult, saldoAwalResult, bpnResult] = await Promise.all([
        aggQuery, kpiViewQuery, chartQuery, pendingQuery, periodQuery, rekeningQuery, statusCountQuery, saldoAwalQuery, bpnFullQuery,
      ])

      if (cancelled) return

      // ── Proses metric totals ───────────────────────────────────────────────
      const agg = (aggResult.data ?? []) as Pick<DbTransaction, 'type' | 'amount' | 'status'>[]
      // Filter baris yang masuk dalam rentang bulan (year*100+month)
      const rawKpiRows = ((kpiViewResult.data ?? []) as Array<Record<string, unknown>>)
        .map(r => ({
          period_id:          String(r.period_id ?? ''),
          year:               Number(r.year ?? 0),
          month:              Number(r.month ?? 0),
          total_penerimaan:   Number(r.total_penerimaan ?? 0),
          total_pengeluaran:  Number(r.total_pengeluaran ?? 0),
          saldo_kas:          Number(r.saldo_kas ?? 0),
          transaksi_verified: Number(r.transaksi_verified ?? 0),
        }))

      const kpiRows = rawKpiRows.filter(r => {
        const key = r.year * 100 + r.month
        return key >= fromMonthKey && key <= toMonthKey
      })

      let totalMasuk = 0, totalKeluar = 0
      for (const r of agg) {
        if (r.type === 'IN')  totalMasuk  += Number(r.amount)
        if (r.type === 'OUT') totalKeluar += Number(r.amount)
      }
      const saldoKas = totalMasuk - totalKeluar

      const countApproved = agg.filter(r => r.status === 'APPROVED').length
      const countPosted   = agg.filter(r => r.status === 'POSTED').length
      const countTotal    = agg.length

      if (isBPN) {
        setMetrics([
          { id: 'm1', label: 'Total Penerimaan',    value: totalMasuk,    icon: 'trending_up',            trendDir: 'up',      trend: 0, subtitle: `Nominal terverifikasi ${periodLabel}` },
          { id: 'm2', label: 'Jumlah BPN',          value: countTotal,    icon: 'receipt_long',           trendDir: 'neutral', trend: 0, subtitle: 'Dokumen disetujui & diposting', format: 'count' },
          { id: 'm3', label: 'BPN Terverifikasi',   value: countApproved, icon: 'verified',               trendDir: 'neutral', trend: 0, subtitle: 'Sudah disetujui, belum diposting', format: 'count' },
          { id: 'm4', label: 'BPN Diposting',       value: countPosted,   icon: 'task_alt',               trendDir: 'neutral', trend: 0, subtitle: 'Sudah diposting ke BKU', format: 'count' },
        ])
      } else if (isBPK) {
        setMetrics([
          { id: 'm1', label: 'Total Pengeluaran',   value: totalKeluar,   icon: 'trending_down',          trendDir: 'down',    trend: 0, subtitle: `Nominal terverifikasi ${periodLabel}` },
          { id: 'm2', label: 'Jumlah BPK',          value: countTotal,    icon: 'receipt',                trendDir: 'neutral', trend: 0, subtitle: 'Dokumen disetujui & diposting', format: 'count' },
          { id: 'm3', label: 'BPK Terverifikasi',   value: countApproved, icon: 'verified',               trendDir: 'neutral', trend: 0, subtitle: 'Sudah disetujui, belum diposting', format: 'count' },
          { id: 'm4', label: 'BPK Diposting',       value: countPosted,   icon: 'task_alt',               trendDir: 'neutral', trend: 0, subtitle: 'Sudah diposting ke BKU', format: 'count' },
        ])
      } else {
        const hasViewData = kpiRows.length > 0
        const totalMasukView = hasViewData
          ? kpiRows.reduce((s, r) => s + Number(r.total_penerimaan ?? 0), 0)
          : totalMasuk
        const totalKeluarView = hasViewData
          ? kpiRows.reduce((s, r) => s + Number(r.total_pengeluaran ?? 0), 0)
          : totalKeluar
        const verifiedView = hasViewData
          ? kpiRows.reduce((s, r) => s + Number(r.transaksi_verified ?? 0), 0)
          : agg.length

        // Hitung saldo awal dari vw_saldo_kumulatif
        const saldoAwal = Number((saldoAwalResult.data as { saldo_akhir: number } | null)?.saldo_akhir ?? 0)
        const saldoAkhir = saldoAwal + totalMasukView - totalKeluarView

        const jumlahRekeningAktif = (rekeningResult.data ?? []).length
        const statusRows = (statusCountResult.data ?? []) as { status: string; jumlah: number }[]
        const countPending  = statusRows.filter(r => r.status === 'SUBMITTED').reduce((s, r) => s + r.jumlah, 0)
        const countApproval = statusRows.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.jumlah, 0)

        setMetrics([
          { id: 'saldo_awal', label: 'Saldo Awal',         value: saldoAwal,            icon: 'account_balance',         trendDir: 'neutral', trend: 0, subtitle: `Per awal ${periodLabel}` },
          { id: 'm1',         label: 'Total Penerimaan',   value: totalMasukView,       icon: 'trending_up',             trendDir: 'up',      trend: 0, subtitle: periodLabel },
          { id: 'm2',         label: 'Total Pengeluaran',  value: totalKeluarView,      icon: 'trending_down',           trendDir: 'down',    trend: 0, subtitle: periodLabel },
          { id: 'saldo',      label: 'Saldo Akhir',        value: saldoAkhir,           icon: 'account_balance_wallet',  trendDir: 'neutral', trend: 0, subtitle: `Per akhir ${periodLabel}` },
          { id: 'm4',         label: 'Transaksi Verified', value: verifiedView,         icon: 'verified',                trendDir: 'neutral', trend: 0, subtitle: 'Transaksi terposting', format: 'count' },
          { id: 'rekening',   label: 'Rekening Aktif',     value: jumlahRekeningAktif,  icon: 'credit_card',             trendDir: 'neutral', trend: 0, subtitle: 'Rekening terdaftar',  format: 'count' },
          { id: 'pending',    label: 'Transaksi Pending',  value: countPending,         icon: 'pending_actions',         trendDir: 'neutral', trend: 0, subtitle: 'Menunggu persetujuan', format: 'count' },
          { id: 'approval',   label: 'Menunggu Posting',   value: countApproval,        icon: 'approval',                trendDir: 'neutral', trend: 0, subtitle: 'Sudah disetujui',      format: 'count' },
        ])
      }

      // ── Proses chart ──────────────────────────────────────────────────────
      const chartRows = (chartResult.data ?? []) as Pick<DbTransaction, 'type' | 'amount' | 'transaction_date'>[]
      const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

      // Tentukan granularitas: chartView param, fallback ke auto
      const effectiveView: ChartView = chartView === 'bulanan' ? 'bulanan'
        : chartView === 'mingguan' ? 'mingguan'
        : useMonthly ? 'bulanan' : 'harian'

      if (effectiveView === 'bulanan') {
        // Agregasi bulanan
        const byMonth: Record<string, { penerimaan: number; pengeluaran: number }> = {}
        const [sy, sm] = filterFrom.split('-').map(Number) as [number, number]
        const [ey, em] = filterTo.split('-').map(Number) as [number, number]
        let cy = sy, cm = sm
        while (cy < ey || (cy === ey && cm <= em)) {
          const key = `${cy}-${String(cm).padStart(2, '0')}`
          byMonth[key] = { penerimaan: 0, pengeluaran: 0 }
          ;(byMonth[key] as any).__label = `${MONTHS_SHORT[cm - 1]} ${cy}`
          cm++; if (cm > 12) { cm = 1; cy++ }
        }
        for (const r of chartRows) {
          const key = r.transaction_date.substring(0, 7)
          if (!byMonth[key]) continue
          if (r.type === 'IN')  byMonth[key]!.penerimaan  += Number(r.amount)
          if (r.type === 'OUT') byMonth[key]!.pengeluaran += Number(r.amount)
        }
        setChartData(
          Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => ({
              label:       (v as any).__label as string,
              penerimaan:  v.penerimaan,
              pengeluaran: v.pengeluaran,
            }))
        )
      } else if (effectiveView === 'mingguan') {
        // Agregasi mingguan — bucket per ISO week (Senin s/d Minggu)
        const getMonday = (dateStr: string) => {
          const d = new Date(dateStr)
          const day = d.getUTCDay() // 0=Sun
          const diff = day === 0 ? -6 : 1 - day
          d.setUTCDate(d.getUTCDate() + diff)
          return d.toISOString().split('T')[0]!
        }
        const byWeek: Record<string, { penerimaan: number; pengeluaran: number; label: string }> = {}
        // Iterasi semua Senin dalam rentang
        const startMonday = getMonday(filterFrom)
        const cur = new Date(startMonday)
        while (cur.toISOString().split('T')[0]! <= filterTo) {
          const isoKey = cur.toISOString().split('T')[0]!
          const dd  = String(cur.getUTCDate()).padStart(2, '0')
          const mon = MONTHS_SHORT[cur.getUTCMonth()]!
          byWeek[isoKey] = { penerimaan: 0, pengeluaran: 0, label: `${dd} ${mon}` }
          cur.setUTCDate(cur.getUTCDate() + 7)
        }
        for (const r of chartRows) {
          const key = getMonday(r.transaction_date.split('T')[0]!)
          if (!byWeek[key]) continue
          if (r.type === 'IN')  byWeek[key]!.penerimaan  += Number(r.amount)
          if (r.type === 'OUT') byWeek[key]!.pengeluaran += Number(r.amount)
        }
        setChartData(
          Object.entries(byWeek)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => ({
              label:       v.label,
              penerimaan:  v.penerimaan,
              pengeluaran: v.pengeluaran,
            }))
        )
      } else {
        // Agregasi harian
        const byDay: Record<string, { penerimaan: number; pengeluaran: number }> = {}
        for (let i = 0; i <= dayDiff; i++) {
          const d = new Date(filterFrom)
          d.setUTCDate(d.getUTCDate() + i)
          const iso = d.toISOString().split('T')[0]!
          if (iso > filterTo) break
          const dd  = String(d.getUTCDate()).padStart(2, '0')
          const mon = MONTHS_SHORT[d.getUTCMonth()]!
          byDay[iso] = { penerimaan: 0, pengeluaran: 0 }
          ;(byDay[iso] as any).__label = `${dd} ${mon}`
        }
        for (const r of chartRows) {
          const key = r.transaction_date.split('T')[0]!
          if (!byDay[key]) continue
          if (r.type === 'IN')  byDay[key]!.penerimaan  += Number(r.amount)
          if (r.type === 'OUT') byDay[key]!.pengeluaran += Number(r.amount)
        }
        setChartData(
          Object.entries(byDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => ({
              label:       (v as any).__label as string,
              penerimaan:  v.penerimaan,
              pengeluaran: v.pengeluaran,
            }))
        )
      }

      // ── Proses pending approvals ───────────────────────────────────────────
      const pending = (pendingResult.data ?? []) as Pick<DbTransaction, 'id' | 'no_bukti' | 'description' | 'amount' | 'transaction_date' | 'type' | 'created_by'>[]

      const creatorIds = [...new Set(pending.map(r => r.created_by).filter(Boolean) as string[])]
      let userEmailMap: Record<string, string> = {}
      if (creatorIds.length > 0) {
        const { data: usersRaw } = await supabase
          .from('users')
          .select('id, email')
          .in('id', creatorIds)
        if (!cancelled) {
          for (const u of (usersRaw ?? []) as { id: string; email: string }[]) {
            userEmailMap[u.id] = u.email
          }
        }
      }

      if (!cancelled) {
        setApprovals(pending.map(r => ({
          id:        r.id,
          title:     r.no_bukti ?? r.description ?? '-',
          requestBy: r.created_by ? (userEmailMap[r.created_by] ?? r.created_by) : '-',
          dueDate:   r.transaction_date,
          priority:  'medium' as const,
          type:      r.type === 'IN' ? 'bpn' : 'bpk',
        })))
      }

      // ── Proses deadline tutup buku ─────────────────────────────────────────
      const period = periodResult.data as Pick<DbPeriod, 'year' | 'month'> | null
      if (period) {
        const lastDay = new Date(period.year, period.month, 0)
        setDeadline(lastDay.toISOString().split('T')[0]!)
      }

      // ── Proses rekening aktif ─────────────────────────────────────────────
      if (!cancelled) {
        const rekRows = (rekeningResult.data ?? []) as Pick<DbAccount, 'id' | 'bank_name' | 'account_number' | 'account_name'>[]
        setRekeningAktif(rekRows.map(r => ({
          id:            r.id,
          bankName:      r.bank_name,
          accountNumber: r.account_number,
          accountName:   r.account_name,
        })))
      }

      // ── Proses BPN: pipeline, alerts, kategori, action items ──────────────
      if (isBPN && bpnResult.data) {
        type BpnRow = Pick<DbTransaction, 'id' | 'status' | 'amount' | 'kode_rekening' | 'destination_account_id' | 'transaction_date' | 'no_bukti'>
        const bpnRows = bpnResult.data as BpnRow[]

        // Pipeline — count per status
        setBpnPipeline({
          draft:         bpnRows.filter(r => r.status === 'DRAFT').length,
          diajukan:      bpnRows.filter(r => r.status === 'SUBMITTED').length,
          terverifikasi: bpnRows.filter(r => r.status === 'APPROVED').length,
          diposting:     bpnRows.filter(r => r.status === 'POSTED').length,
          ditolak:       bpnRows.filter(r => r.status === 'REJECTED').length,
        })

        // Alerts
        setBpnAlerts({
          rejected:       bpnRows.filter(r => r.status === 'REJECTED').length,
          missingAccount: bpnRows.filter(r => r.status !== 'REJECTED' && !r.destination_account_id).length,
        })

        // Kategori — hanya APPROVED+POSTED
        const verifiedRows = bpnRows.filter(r => r.status === 'APPROVED' || r.status === 'POSTED')
        const katMap: Record<string, { count: number; total: number }> = {}
        for (const r of verifiedRows) {
          const kat = r.kode_rekening ?? 'Lainnya'
          if (!katMap[kat]) katMap[kat] = { count: 0, total: 0 }
          katMap[kat]!.count += 1
          katMap[kat]!.total += Number(r.amount)
        }
        const katTotal = verifiedRows.reduce((s, r) => s + Number(r.amount), 0)
        setBpnKategori(
          Object.entries(katMap)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([kat, v]) => ({
              kategori: kat,
              count:    v.count,
              total:    v.total,
              pct:      katTotal > 0 ? Math.round((v.total / katTotal) * 100) : 0,
            }))
        )

        // Action items — DRAFT + REJECTED, terbaru dulu, maks 5
        setBpnActionItems(
          bpnRows
            .filter(r => r.status === 'DRAFT' || r.status === 'REJECTED')
            .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
            .slice(0, 5)
            .map(r => ({
              id:      r.id,
              noBukti: r.no_bukti ?? '-',
              tanggal: r.transaction_date,
              amount:  Number(r.amount),
              status:  r.status as 'DRAFT' | 'REJECTED',
            }))
        )

        // Rekening — lookup nama bank dari tabel accounts
        const accountIds = [...new Set(
          verifiedRows
            .filter(r => r.destination_account_id)
            .map(r => r.destination_account_id as string)
        )]

        if (accountIds.length > 0) {
          const { data: accountsRaw } = await supabase
            .from('accounts')
            .select('id, bank_name, account_number, account_name')
            .in('id', accountIds)

          if (!cancelled) {
            const accounts = (accountsRaw ?? []) as { id: string; bank_name: string; account_number: string; account_name: string }[]
            const accMap: Record<string, typeof accounts[0]> = {}
            for (const a of accounts) accMap[a.id] = a

            const rekMap: Record<string, { count: number; total: number }> = {}
            for (const r of verifiedRows) {
              const aid = r.destination_account_id
              if (!aid) continue
              if (!rekMap[aid]) rekMap[aid] = { count: 0, total: 0 }
              rekMap[aid]!.count += 1
              rekMap[aid]!.total += Number(r.amount)
            }
            const rekTotal = verifiedRows
              .filter(r => r.destination_account_id)
              .reduce((s, r) => s + Number(r.amount), 0)

            setBpnRekening(
              Object.entries(rekMap)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([aid, v]) => {
                  const acc = accMap[aid]
                  const num = acc?.account_number ?? ''
                  return {
                    accountId:     aid,
                    bankName:      acc?.bank_name ?? '-',
                    accountNumber: num.length > 4 ? `...${num.slice(-4)}` : num,
                    accountName:   acc?.account_name ?? '-',
                    count:         v.count,
                    total:         v.total,
                    pct:           rekTotal > 0 ? Math.round((v.total / rekTotal) * 100) : 0,
                  }
                })
            )
          }
        }
      }
    }

    load().then(() => { if (!cancelled) cacheRef.current = { key: cacheKey, at: Date.now() } })
          .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filterFrom, filterTo, chartView, currentUser.id, currentUser.role, currentUser.unitId])

  return { metrics, chartData, approvals, deadlineTutupBuku, loading, isBPN, isBPK, isGlobal, bpnPipeline, bpnKategori, bpnRekening, bpnActionItems, bpnAlerts, rekeningAktif }
}
