import type { AnomalyItem, AnomalySeverity } from '../../types/dashboard'

// ── Severity config ───────────────────────────────────────────────────────────

const SEV: Record<AnomalySeverity, {
  color:   string
  colorDim: string
  bg:      string
  border:  string
  pillBg:  string
  icon:    string
  label:   string
}> = {
  kritis: {
    color:    '#f87171',
    colorDim: 'rgba(248,113,113,0.55)',
    bg:       'rgba(248,113,113,0.07)',
    border:   'rgba(248,113,113,0.22)',
    pillBg:   'rgba(248,113,113,0.15)',
    icon:     'emergency',
    label:    'KRITIS',
  },
  peringatan: {
    color:    '#fbbf24',
    colorDim: 'rgba(251,191,36,0.55)',
    bg:       'rgba(251,191,36,0.07)',
    border:   'rgba(251,191,36,0.22)',
    pillBg:   'rgba(251,191,36,0.15)',
    icon:     'warning',
    label:    'PERINGATAN',
  },
  info: {
    color:    '#60a5fa',
    colorDim: 'rgba(96,165,250,0.55)',
    bg:       'rgba(96,165,250,0.07)',
    border:   'rgba(96,165,250,0.22)',
    pillBg:   'rgba(96,165,250,0.15)',
    icon:     'info',
    label:    'INFO',
  },
}

// ── Kategori icon map ─────────────────────────────────────────────────────────

const KATEGORI_ICON: Record<string, string> = {
  'Risiko Keuangan':    'account_balance',
  'Kepatuhan Dokumen':  'folder_open',
  'Rekonsiliasi Bank':  'compare_arrows',
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl animate-pulse"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.08)', width: '40%' }} />
        <div className="h-3.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', width: '72%' }} />
        <div className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.04)', width: '88%' }} />
      </div>
    </div>
  )
}

// ── Anomaly row ───────────────────────────────────────────────────────────────

function AnomalyRow({ item }: { item: AnomalyItem }) {
  const s    = SEV[item.severity]
  const icon = KATEGORI_ICON[item.kategori] ?? 'report_problem'

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl transition-colors"
      style={{
        background:    s.bg,
        border:        `1px solid ${s.border}`,
        // subtle left accent
        boxShadow:     `inset 3px 0 0 ${s.color}`,
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-px"
        style={{ background: s.pillBg }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1rem', color: s.color, fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {/* Severity pill + title */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-bold font-body uppercase tracking-wider flex-shrink-0"
            style={{ background: s.pillBg, color: s.color }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.65rem', fontVariationSettings: "'FILL' 1" }}
            >{s.icon}</span>
            {s.label}
          </span>
          <span className="text-xs font-semibold font-headline" style={{ color: '#e8eaf0' }}>
            {item.title}
          </span>
        </div>

        {/* Detail text */}
        <p className="text-xs font-body leading-relaxed" style={{ color: 'rgba(232,234,240,0.55)' }}>
          {item.detail}
        </p>

        {/* Footer: kategori + count */}
        <div className="flex items-center gap-3 mt-2">
          <span
            className="text-[10px] font-body uppercase tracking-wider"
            style={{ color: s.colorDim }}
          >
            {item.kategori}
          </span>
          {item.count > 1 && (
            <span
              className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold font-body"
              style={{ background: s.pillBg, color: s.color }}
            >
              {item.count}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AnomalyRisikoPanelProps {
  anomalies: AnomalyItem[]
  loading:   boolean
}

export function AnomalyRisikoPanel({ anomalies, loading }: AnomalyRisikoPanelProps) {
  const kritisCount    = anomalies.filter(a => a.severity === 'kritis').length
  const peringatanCount= anomalies.filter(a => a.severity === 'peringatan').length
  const total          = anomalies.length

  const headerBadgeColor = kritisCount > 0
    ? '#f87171'
    : peringatanCount > 0
    ? '#fbbf24'
    : total > 0
    ? '#60a5fa'
    : '#4ade80'

  const headerBadgeBg = kritisCount > 0
    ? 'rgba(248,113,113,0.15)'
    : peringatanCount > 0
    ? 'rgba(251,191,36,0.15)'
    : total > 0
    ? 'rgba(96,165,250,0.15)'
    : 'rgba(74,222,128,0.15)'

  return (
    <div
      className="rounded-2xl h-full flex flex-col"
      style={{
        background:  '#161a21',
        border:      '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(251,191,36,0.12)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.9rem', color: '#fbbf24', fontVariationSettings: "'FILL' 1" }}
            >
              health_metrics
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-headline" style={{ color: '#e8eaf0' }}>
              Anomali &amp; Risiko
            </h3>
            <p className="text-[11px] font-body mt-px" style={{ color: 'rgba(232,234,240,0.38)' }}>
              Pemantauan otomatis: lampiran, saldo, dan rekonsiliasi
            </p>
          </div>
        </div>

        {/* Summary badge */}
        {!loading && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-body"
            style={{ background: headerBadgeBg, color: headerBadgeColor }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.8rem', fontVariationSettings: "'FILL' 1" }}
            >
              {total === 0 ? 'check_circle' : 'report_problem'}
            </span>
            {total === 0 ? 'Semua aman' : `${total} masalah ditemukan`}
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {loading ? (
          /* Loading skeleton */
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : total === 0 ? (
          /* Empty / all-clear state */
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.5rem', color: '#4ade80', fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold font-headline" style={{ color: '#4ade80' }}>
                Tidak ada anomali terdeteksi
              </p>
              <p className="text-xs font-body mt-1" style={{ color: 'rgba(232,234,240,0.38)' }}>
                Semua pemeriksaan berjalan normal untuk periode ini
              </p>
            </div>
          </div>
        ) : (
          /* Anomaly rows */
          anomalies.map(item => <AnomalyRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
