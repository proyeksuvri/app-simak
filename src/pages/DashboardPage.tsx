import { useState, useMemo } from 'react'
import { MetricCard } from '../components/domain/MetricCard'
import { CashFlowChart } from '../components/domain/CashFlowChart'
import { PendingApprovals } from '../components/domain/PendingApprovals'
import { TransactionTable } from '../components/domain/TransactionTable'
import { BreakdownStrategisPanel } from '../components/domain/BreakdownStrategisPanel'
import { SaldoPerBankPanel } from '../components/domain/SaldoPerBankPanel'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from '../components/ui/Table/Table'
import { useDashboardData } from '../hooks/useDashboardData'
import { useRevenueBreakdown } from '../hooks/useRevenueBreakdown'
import { useSaldoPerBank } from '../hooks/useSaldoPerBank'
import { useExportDashboardPDF } from '../hooks/useExportDashboardPDF'
import type { ChartView } from '../hooks/useDashboardData'
import { useAppContext } from '../context/AppContext'
import { formatRupiah, formatRupiahSingkat, formatTanggal } from '../lib/formatters'
import type { BpnPipelineData, BpnKategoriRow, BpnRekeningRow, BpnActionItem, BpnAlertCounts, RekeningAktifRow } from '../types'

type FilterMode = 'bulan' | 'triwulan' | 'semester' | 'tahun'

function computeFilterRange(
  mode: FilterMode,
  bulan: string,
  triwulan: number,
  semester: number,
  tahunAnggaran: string,
): { filterFrom: string; filterTo: string; periodLabel: string } {
  const y = tahunAnggaran
  if (mode === 'bulan') {
    const [by, bm] = bulan.split('-').map(Number) as [number, number]
    const lastDay  = new Date(by, bm, 0).getDate()
    const label    = new Date(by, bm - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    return {
      filterFrom:  `${bulan}-01`,
      filterTo:    `${bulan}-${String(lastDay).padStart(2, '0')}`,
      periodLabel: label,
    }
  }
  if (mode === 'triwulan') {
    const ranges = [
      { from: `${y}-01-01`, to: `${y}-03-31`, label: `Triwulan I ${y}` },
      { from: `${y}-04-01`, to: `${y}-06-30`, label: `Triwulan II ${y}` },
      { from: `${y}-07-01`, to: `${y}-09-30`, label: `Triwulan III ${y}` },
      { from: `${y}-10-01`, to: `${y}-12-31`, label: `Triwulan IV ${y}` },
    ]
    const r = ranges[triwulan - 1]!
    return { filterFrom: r.from, filterTo: r.to, periodLabel: r.label }
  }
  if (mode === 'semester') {
    if (semester === 1) return { filterFrom: `${y}-01-01`, filterTo: `${y}-06-30`, periodLabel: `Semester I ${y}` }
    return { filterFrom: `${y}-07-01`, filterTo: `${y}-12-31`, periodLabel: `Semester II ${y}` }
  }
  // tahun
  return { filterFrom: `${y}-01-01`, filterTo: `${y}-12-31`, periodLabel: `Tahun Anggaran ${y}` }
}

export function DashboardPage() {
  const { tahunAnggaran, currentUser } = useAppContext()

  const now   = new Date()
  const nowM  = now.getMonth() + 1
  const initTriwulan = nowM <= 3 ? 1 : nowM <= 6 ? 2 : nowM <= 9 ? 3 : 4
  const initSemester = nowM <= 6 ? 1 : 2

  const [filterMode,    setFilterMode]    = useState<FilterMode>('bulan')
  const [filterBulan,   setFilterBulan]   = useState(`${now.getFullYear()}-${String(nowM).padStart(2, '0')}`)
  const [filterTriwulan,setFilterTriwulan] = useState(initTriwulan)
  const [filterSemester,setFilterSemester] = useState(initSemester)
  const [chartView,     setChartView]     = useState<ChartView>('harian')

  const { filterFrom, filterTo, periodLabel } = computeFilterRange(
    filterMode, filterBulan, filterTriwulan, filterSemester, tahunAnggaran
  )

  const { metrics, chartData, approvals, deadlineTutupBuku, loading, isBPN, isBPK, bpnPipeline, bpnKategori, bpnRekening, bpnActionItems, bpnAlerts, rekeningAktif } = useDashboardData(filterFrom, filterTo, periodLabel, chartView)

  const role       = currentUser.role
  const unitId     = currentUser.unitId
  const canApprove = role === 'pimpinan' || role === 'admin'

  // Breakdown Strategis — hanya untuk pimpinan dan admin
  const { rows: revenueBreakdownRows, loading: revenueBreakdownLoading } = useRevenueBreakdown(
    canApprove ? filterFrom : '',
    canApprove ? filterTo   : '',
  )

  // Saldo Akhir per Bank — hanya untuk pimpinan dan admin
  const { rows: saldoPerBankRows, loading: saldoPerBankLoading } = useSaldoPerBank(
    canApprove ? filterFrom : '',
    canApprove ? filterTo   : '',
  )

  // Export PDF — hanya dipanggil oleh pimpinan/admin
  const { exportPDF, exporting } = useExportDashboardPDF()

  const txFilterType   = isBPN ? 'penerimaan' : isBPK ? 'pengeluaran' : undefined
  const txFilterUnitId = role === 'bendahara_pembantu' && unitId ? unitId : undefined

  const lihatSemuaHref  = isBPN ? '/penerimaan/bpn' : isBPK ? '/pengeluaran/bpk' : '/penerimaan/bpn'
  const lihatSemuaLabel = isBPN ? 'Lihat BPN →' : isBPK ? 'Lihat BPK →' : 'Lihat semua →'
  const chartGranularity = chartView
  const chartViewLabel = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' }[chartView]
  const chartTitle = isBPN
    ? `Grafik Penerimaan ${chartViewLabel}`
    : isBPK
    ? `Grafik Pengeluaran ${chartViewLabel}`
    : `Arus Kas ${chartViewLabel}`
  const chartXInterval = useMemo(() => {
    if (chartView === 'bulanan') return 0
    if (chartView === 'mingguan') return 0
    return filterMode === 'bulan' ? 4 : 0
  }, [chartView, filterMode])

  const greeting = (() => {
    const h = now.getHours()
    if (h < 11)  return 'Selamat Pagi'
    if (h < 15)  return 'Selamat Siang'
    if (h < 18)  return 'Selamat Sore'
    return 'Selamat Malam'
  })()

  const roleLabelMap: Record<string, string> = {
    admin:               'Administrator',
    pimpinan:            'Pimpinan',
    bendahara_pembantu:  'Bendahara Pembantu',
    bpn:                 'Bendahara Penerimaan',
    bpk:                 'Bendahara Pengeluaran',
  }
  const roleLabel = roleLabelMap[role] ?? role

  const todayLabel = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="px-6 pb-8 pt-5" style={{ color: '#e8eaf0' }}>

      {/* Welcome Header */}
      <div
        className="flex items-center justify-between rounded-2xl px-6 py-5 mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Left — avatar + greeting + title */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-xl text-sm font-bold font-headline shrink-0 overflow-hidden"
            style={{
              width: 46, height: 46,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (currentUser.nama || currentUser.email || '?').slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-xs font-body mb-0.5" style={{ color: 'rgba(232,234,240,0.5)' }}>
              {greeting},{' '}
              <span style={{ color: 'rgba(232,234,240,0.8)' }}>
                {currentUser.nama || currentUser.email}
              </span>
              {' '}&mdash;{' '}
              <span
                className="inline-block px-1.5 py-0.5 rounded text-xs"
                style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}
              >
                {roleLabel}
              </span>
            </p>
            <h1 className="text-xl font-bold font-headline leading-tight" style={{ color: '#e8eaf0' }}>
              Dashboard Keuangan
              <span className="ml-2 text-base font-medium" style={{ color: 'rgba(232,234,240,0.45)' }}>
                SIMAK UIN Palopo
              </span>
            </h1>
          </div>
        </div>

        {/* Right — filter & export */}
        <div className="flex items-center gap-2">
          <PeriodFilter
            mode={filterMode}
            bulan={filterBulan}
            triwulan={filterTriwulan}
            semester={filterSemester}
            tahunAnggaran={tahunAnggaran}
            onModeChange={setFilterMode}
            onBulanChange={setFilterBulan}
            onTriwulanChange={setFilterTriwulan}
            onSemesterChange={setFilterSemester}
          />
          {canApprove && (
            <button
              id="btn-export-pdf-dashboard"
              onClick={() => exportPDF({
                metrics,
                revenueBreakdown: revenueBreakdownRows,
                anomalies: [],
                periodLabel,
                filterFrom,
                filterTo,
                namaUser: currentUser.nama || currentUser.email || currentUser.id,
              })}
              disabled={exporting || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '0.8rem', fontVariationSettings: exporting ? "'FILL' 1" : "'FILL' 0" }}
              >
                {exporting ? 'hourglass_empty' : 'download'}
              </span>
              {exporting ? 'Memproses...' : 'Export PDF'}
            </button>
          )}
        </div>
      </div>

      {/* BPN Alert Strip */}
      {isBPN && bpnAlerts && (bpnAlerts.rejected > 0 || bpnAlerts.missingAccount > 0) && (
        <BpnAlertStrip alerts={bpnAlerts} />
      )}

      {/* Metric Cards */}
      <div className={`grid gap-4 mb-5 grid-cols-4`}>
        {loading
          ? (!isBPN && !isBPK ? [0,1,2,3,4,5,6,7] : [0,1,2,3]).map((i) => (
              <div key={i} className="rounded-xl p-5 h-[130px]" style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }} />
            ))
          : metrics.map((m) => (
              <MetricCard key={m.id} data={m} />
            ))
        }
      </div>

      {/* BPN Pipeline Bar */}
      {isBPN && bpnPipeline && (
        <div className="mb-5">
          <BpnPipelineBar pipeline={bpnPipeline} />
        </div>
      )}

      {/* Chart + Pending Approvals */}
      <div className={`grid gap-4 mb-5 ${canApprove ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <Card className={canApprove ? 'col-span-2' : ''} padding="md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>{chartTitle}</h3>
              <p className="text-xs font-body mt-0.5" style={{ color: 'rgba(232,234,240,0.4)' }}>
                {chartViewLabel === 'Harian' ? 'Per hari' : chartViewLabel === 'Mingguan' ? 'Per minggu' : 'Per bulan'} — {periodLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-body" style={{ color: 'rgba(232,234,240,0.5)' }}>
                {!isBPK && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#9B6DFF' }} />PENERIMAAN</span>}
                {!isBPN && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#f472b6' }} />PENGELUARAN</span>}
              </div>
              {/* Chart View Tabs */}
              <ChartViewTabs value={chartView} onChange={setChartView} />
            </div>
          </div>
          {/* Summary strip */}
          {!loading && chartData.length > 0 && (
            <ChartSummaryStrip data={chartData} showPenerimaan={!isBPK} showPengeluaran={!isBPN} />
          )}
          <CashFlowChart
            data={chartData}
            showPenerimaan={!isBPK}
            showPengeluaran={!isBPN}
            xInterval={chartXInterval}
          />
        </Card>

        {canApprove && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,72,209,0.15)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
                </div>
                <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>Menunggu Persetujuan</h3>
              </div>
              {approvals.length > 0 && (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
                  style={{ background: '#dc2626' }}
                >
                  {approvals.length}
                </span>
              )}
            </div>
            <PendingApprovals items={approvals.slice(0, 4)} loading={loading} />
            {approvals.length > 4 && (
              <a
                href="/approval"
                className="flex items-center gap-1 text-xs font-body mt-3 transition-opacity hover:opacity-80"
                style={{ color: '#9B6DFF' }}
              >
                Semua Persetujuan ({approvals.length}) →
              </a>
            )}
          </Card>
        )}
      </div>

      {/* Breakdown Penerimaan + Saldo per Bank — pimpinan & admin (50/50) */}
      {canApprove && (
        <div className="grid grid-cols-2 gap-4 mb-5">
          <BreakdownStrategisPanel rows={revenueBreakdownRows} loading={revenueBreakdownLoading} />
          <SaldoPerBankPanel
            rows={saldoPerBankRows}
            loading={saldoPerBankLoading}
            periodLabel={periodLabel}
            filterTo={filterTo}
          />
        </div>
      )}

      {/* BPN Breakdown: Kategori + Rekening */}
      {isBPN && (
        <div className="mb-5">
          <BpnBreakdownSection kategori={bpnKategori} rekening={bpnRekening} loading={loading} />
        </div>
      )}

      {/* BPN Action Table */}
      {isBPN && bpnActionItems.length > 0 && (
        <div className="mb-5">
          <BpnActionTable items={bpnActionItems} />
        </div>
      )}

      {/* Rekening Aktif */}
      {role === 'bendahara_penerimaan' && rekeningAktif.length > 0 && (
        <div className="mb-5">
          <RekeningAktifSection items={rekeningAktif} loading={loading} />
        </div>
      )}

      {/* Transaksi Terkini */}
      <div>
        <Card padding="md" noLift>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>Transaksi Terkini</h3>
              <p className="text-xs font-body mt-0.5" style={{ color: 'rgba(232,234,240,0.4)' }}>Daftar arus kas masuk dan keluar terbaru.</p>
            </div>
            <a href={lihatSemuaHref} className="text-xs font-medium font-body transition-opacity hover:opacity-80" style={{ color: '#9B6DFF' }}>
              {lihatSemuaLabel}
            </a>
          </div>
          <TransactionTable limit={5} filterType={txFilterType} filterUnitId={txFilterUnitId} />
        </Card>
      </div>
    </div>
  )
}

// ── Chart Summary Strip ───────────────────────────────────────────────────────

function ChartSummaryStrip({
  data, showPenerimaan, showPengeluaran,
}: { data: import('../types').ChartDataPoint[]; showPenerimaan: boolean; showPengeluaran: boolean }) {
  const totalIn  = data.reduce((s, d) => s + d.penerimaan, 0)
  const totalOut = data.reduce((s, d) => s + d.pengeluaran, 0)
  const net      = totalIn - totalOut
  return (
    <div className="flex items-center gap-4 mb-3 px-1">
      {showPenerimaan && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#9B6DFF' }} />
          <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>Masuk</span>
          <span className="text-xs font-semibold font-body tabular-nums" style={{ color: '#c4b5fd' }}>{formatRupiahSingkat(totalIn)}</span>
        </div>
      )}
      {showPengeluaran && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#f472b6' }} />
          <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>Keluar</span>
          <span className="text-xs font-semibold font-body tabular-nums" style={{ color: '#f9a8d4' }}>{formatRupiahSingkat(totalOut)}</span>
        </div>
      )}
      {showPenerimaan && showPengeluaran && (
        <div className="flex items-center gap-2 ml-1 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>Net</span>
          <span
            className="text-xs font-semibold font-body tabular-nums"
            style={{ color: net >= 0 ? '#4ade80' : '#f87171' }}
          >{net >= 0 ? '+' : ''}{formatRupiahSingkat(net)}</span>
        </div>
      )}
    </div>
  )
}

// ── Chart View Tabs ───────────────────────────────────────────────────────────

const CHART_VIEW_OPTIONS: { value: ChartView; label: string }[] = [
  { value: 'harian',   label: 'H' },
  { value: 'mingguan', label: 'M' },
  { value: 'bulanan',  label: 'B' },
]

function ChartViewTabs({ value, onChange }: { value: ChartView; onChange: (v: ChartView) => void }) {
  return (
    <div
      className="flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
    >
      {CHART_VIEW_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 text-xs font-semibold font-body transition-all"
          title={opt.value === 'harian' ? 'Harian' : opt.value === 'mingguan' ? 'Mingguan' : 'Bulanan'}
          style={
            value === opt.value
              ? { background: 'rgba(108,72,209,0.35)', color: '#c4b5fd' }
              : { color: 'rgba(232,234,240,0.45)' }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Period Filter Component ───────────────────────────────────────────────────

interface PeriodFilterProps {
  mode:              FilterMode
  bulan:             string
  triwulan:          number
  semester:          number
  tahunAnggaran:     string
  onModeChange:      (m: FilterMode) => void
  onBulanChange:     (v: string) => void
  onTriwulanChange:  (v: number) => void
  onSemesterChange:  (v: number) => void
}

function PeriodFilter({
  mode, bulan, triwulan, semester, tahunAnggaran,
  onModeChange, onBulanChange, onTriwulanChange, onSemesterChange,
}: PeriodFilterProps) {
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const [bm] = bulan.split('-').map(Number).slice(1) as [number]
  const bulanLabel = `${MONTHS_SHORT[(bm ?? 1) - 1]} ${bulan.split('-')[0]}`

  const modes: { key: FilterMode; label: string }[] = [
    { key: 'bulan',    label: 'Bulan'    },
    { key: 'triwulan', label: 'Triwulan' },
    { key: 'semester', label: 'Semester' },
    { key: 'tahun',    label: 'Tahun'    },
  ]

  const btnBase = 'px-2.5 py-1 text-xs font-medium font-body transition-all'
  const activeBg: React.CSSProperties = { background: 'rgba(155,109,255,0.2)', color: '#c4b5fd' }
  const inactiveBg: React.CSSProperties = { color: 'rgba(232,234,240,0.5)' }

  return (
    <div className="flex items-center gap-2">
      {/* Mode tabs */}
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {modes.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={btnBase}
            style={mode === key ? activeBg : inactiveBg}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Value selector */}
      {mode === 'bulan' && (
        <div
          className="flex items-center rounded-lg overflow-hidden text-xs font-medium font-body"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => {
              const [y, m] = bulan.split('-').map(Number) as [number, number]
              const d = new Date(y, m - 2, 1)
              onBulanChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
            }}
            className="px-2 py-1.5 hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(232,234,240,0.6)' }}
            disabled={bulan <= `${tahunAnggaran}-01`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>chevron_left</span>
          </button>
          <label className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer" style={{ color: 'rgba(232,234,240,0.75)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', fontVariationSettings: "'FILL' 0" }}>calendar_today</span>
            <span>{bulanLabel}</span>
            <input
              type="month"
              value={bulan}
              min={`${tahunAnggaran}-01`}
              max={`${tahunAnggaran}-12`}
              onChange={e => e.target.value && onBulanChange(e.target.value)}
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              style={{ position: 'absolute' }}
            />
          </label>
          <button
            onClick={() => {
              const [y, m] = bulan.split('-').map(Number) as [number, number]
              const d = new Date(y, m, 1)
              onBulanChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
            }}
            className="px-2 py-1.5 hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(232,234,240,0.6)' }}
            disabled={bulan >= `${tahunAnggaran}-12`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>chevron_right</span>
          </button>
        </div>
      )}

      {mode === 'triwulan' && (
        <div
          className="flex items-center rounded-lg overflow-hidden text-xs font-medium font-body"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {[1,2,3,4].map(q => (
            <button
              key={q}
              onClick={() => onTriwulanChange(q)}
              className="px-3 py-1.5 transition-colors hover:bg-white/10"
              style={triwulan === q ? activeBg : inactiveBg}
            >
              Q{q}
            </button>
          ))}
        </div>
      )}

      {mode === 'semester' && (
        <div
          className="flex items-center rounded-lg overflow-hidden text-xs font-medium font-body"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {[1,2].map(s => (
            <button
              key={s}
              onClick={() => onSemesterChange(s)}
              className="px-3 py-1.5 transition-colors hover:bg-white/10"
              style={semester === s ? activeBg : inactiveBg}
            >
              S{s}
            </button>
          ))}
        </div>
      )}

      {mode === 'tahun' && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-body"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,234,240,0.75)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '0.85rem', fontVariationSettings: "'FILL' 0" }}>event_note</span>
          TA {tahunAnggaran}
        </div>
      )}
    </div>
  )
}

// ── BPN Inline Components ────────────────────────────────────────────────────

function BpnAlertStrip({ alerts }: { alerts: BpnAlertCounts }) {
  return (
    <div className="flex flex-col gap-2 mb-5">
      {alerts.rejected > 0 && (
        <a
          href="/penerimaan/bpn"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body transition-opacity hover:opacity-90"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', fontVariationSettings: "'FILL' 1" }}>cancel</span>
          <span>
            <span className="font-semibold">{alerts.rejected} transaksi ditolak</span>
            {' '}— perlu diperbaiki dan diajukan ulang
          </span>
          <span className="ml-auto material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
        </a>
      )}
      {alerts.missingAccount > 0 && (
        <a
          href="/penerimaan/bpn"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body transition-opacity hover:opacity-90"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          <span>
            <span className="font-semibold">{alerts.missingAccount} transaksi belum memiliki rekening tujuan</span>
            {' '}— lengkapi sebelum diajukan
          </span>
          <span className="ml-auto material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
        </a>
      )}
    </div>
  )
}

function BpnPipelineBar({ pipeline }: { pipeline: BpnPipelineData }) {
  const steps: { label: string; count: number; icon: string; color: string; bg: string }[] = [
    { label: 'Draft',         count: pipeline.draft,         icon: 'draft',           color: 'rgba(232,234,240,0.5)', bg: 'rgba(255,255,255,0.06)' },
    { label: 'Diajukan',      count: pipeline.diajukan,      icon: 'send',            color: '#fbbf24',               bg: 'rgba(251,191,36,0.12)'  },
    { label: 'Terverifikasi', count: pipeline.terverifikasi, icon: 'verified',        color: '#4ade80',               bg: 'rgba(74,222,128,0.12)'  },
    { label: 'Diposting',     count: pipeline.diposting,     icon: 'task_alt',        color: '#9B6DFF',               bg: 'rgba(155,109,255,0.12)' },
    { label: 'Ditolak',       count: pipeline.ditolak,       icon: 'cancel',          color: '#f87171',               bg: 'rgba(248,113,113,0.12)' },
  ]

  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}>account_tree</span>
        <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>Pipeline Status BPN</h3>
        <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.4)' }}>— seluruh tahun anggaran</span>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center gap-1.5 relative">
            {i < steps.length - 1 && (
              <div
                className="absolute top-4 left-[calc(50%+18px)] right-[-50%] h-px"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              />
            )}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: s.bg }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            </div>
            <p className="text-xl font-bold font-headline tabular-nums" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[10px] font-body text-center leading-tight" style={{ color: 'rgba(232,234,240,0.45)' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function BpnBreakdownSection({ kategori, rekening, loading }: { kategori: BpnKategoriRow[]; rekening: BpnRekeningRow[]; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Breakdown Kategori */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,72,209,0.15)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}>category</span>
          </div>
          <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>Penerimaan per Kategori</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[0,1,2,3].map(i => <div key={i} className="h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        ) : kategori.length === 0 ? (
          <p className="text-xs font-body text-center py-6" style={{ color: 'rgba(232,234,240,0.35)' }}>Belum ada data terverifikasi</p>
        ) : (
          <div className="space-y-3">
            {kategori.map(row => (
              <div key={row.kategori}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-body" style={{ color: '#e8eaf0' }}>{row.kategori}</span>
                    <span className="text-[10px] font-body px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(232,234,240,0.45)' }}>{row.count} dok</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold font-body tabular-nums" style={{ color: '#e8eaf0' }}>{formatRupiahSingkat(row.total)}</span>
                    <span className="text-[10px] font-body ml-1.5" style={{ color: 'rgba(232,234,240,0.4)' }}>{row.pct}%</span>
                  </div>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-1 rounded-full" style={{ width: `${row.pct}%`, background: 'rgba(155,109,255,0.5)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Breakdown Rekening Bank */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,72,209,0.15)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          </div>
          <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>Penerimaan per Rekening</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[0,1,2].map(i => <div key={i} className="h-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        ) : rekening.length === 0 ? (
          <p className="text-xs font-body text-center py-6" style={{ color: 'rgba(232,234,240,0.35)' }}>Belum ada transaksi dengan rekening tujuan</p>
        ) : (
          <div className="space-y-3">
            {rekening.map(row => (
              <div key={row.accountId}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-xs font-semibold font-body" style={{ color: '#e8eaf0' }}>{row.bankName}</p>
                    <p className="text-[10px] font-body" style={{ color: 'rgba(232,234,240,0.4)' }}>{row.accountNumber} · {row.count} dok</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold font-body tabular-nums" style={{ color: '#e8eaf0' }}>{formatRupiahSingkat(row.total)}</p>
                    <p className="text-[10px] font-body" style={{ color: 'rgba(232,234,240,0.4)' }}>{row.pct}%</p>
                  </div>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-1 rounded-full" style={{ width: `${row.pct}%`, background: 'rgba(155,109,255,0.5)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function RekeningAktifSection({ items, loading }: { items: RekeningAktifRow[]; loading: boolean }) {
  // Warna avatar bank berdasarkan huruf pertama
  const AVATAR_COLORS = [
    { bg: 'rgba(155,109,255,0.15)', color: '#9B6DFF' },
    { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80' },
    { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
    { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
    { bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8' },
  ]

  return (
    <Card padding="md" noLift>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,72,209,0.15)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>Rekening Aktif</h3>
            <p className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.4)' }}>
              {items.length} rekening terdaftar
            </p>
          </div>
        </div>
        <a href="/pengaturan/rekening" className="text-xs font-medium font-body transition-opacity hover:opacity-80" style={{ color: '#9B6DFF' }}>
          Kelola Rekening →
        </a>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="h-20 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((rek, idx) => {
            const palette = AVATAR_COLORS[idx % AVATAR_COLORS.length]!
            const initials = rek.bankName.replace(/^(BANK|BRI|BNI|BTN|BSI|MANDIRI|BCA)\s*/i, '')
              .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || rek.bankName.slice(0, 2).toUpperCase()
            const maskedNum = rek.accountNumber.length > 6
              ? `${rek.accountNumber.slice(0, 3)}···${rek.accountNumber.slice(-4)}`
              : rek.accountNumber

            return (
              <div
                key={rek.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold font-headline"
                  style={{ background: palette.bg, color: palette.color }}
                >
                  {initials}
                </div>
                {/* Info */}
                <div className="min-w-0">
                  <p className="text-xs font-semibold font-body truncate" style={{ color: '#e8eaf0' }}>
                    {rek.bankName}
                  </p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(232,234,240,0.5)' }}>
                    {maskedNum}
                  </p>
                  <p className="text-[10px] font-body truncate mt-0.5" style={{ color: 'rgba(232,234,240,0.35)' }}>
                    {rek.accountName}
                  </p>
                </div>
                {/* Badge aktif */}
                <div className="ml-auto flex-shrink-0">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold font-body px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
                  >
                    <span className="w-1 h-1 rounded-full inline-block" style={{ background: '#4ade80' }} />
                    Aktif
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function BpnActionTable({ items }: { items: BpnActionItem[] }) {
  return (
    <Card padding="md" noLift>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#f87171', fontVariationSettings: "'FILL' 1" }}>assignment_late</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>Perlu Tindakan</h3>
            <p className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.4)' }}>Draft dan transaksi yang ditolak</p>
          </div>
        </div>
        <a href="/penerimaan/bpn" className="text-xs font-medium font-body transition-opacity hover:opacity-80" style={{ color: '#9B6DFF' }}>
          Lihat semua di BPN →
        </a>
      </div>
      <Table>
        <TableHead>
          <TableHeadCell>No. Bukti</TableHeadCell>
          <TableHeadCell>Tanggal</TableHeadCell>
          <TableHeadCell align="right">Nominal</TableHeadCell>
          <TableHeadCell align="center">Status</TableHeadCell>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={item.id} even={idx % 2 === 1}>
              <TableCell>
                <span className="font-mono text-xs" style={{ color: '#e8eaf0' }}>{item.noBukti}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.6)' }}>{formatTanggal(item.tanggal)}</span>
              </TableCell>
              <TableCell align="right">
                <span className="text-xs font-semibold font-body tabular-nums" style={{ color: '#e8eaf0' }}>{formatRupiah(item.amount)}</span>
              </TableCell>
              <TableCell align="center">
                <Badge variant={item.status === 'DRAFT' ? 'pending' : 'ditolak'}>
                  {item.status === 'DRAFT' ? 'Draft' : 'Ditolak'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
