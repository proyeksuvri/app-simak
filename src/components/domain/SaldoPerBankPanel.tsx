import type { SaldoPerBankRow } from '../../hooks/useSaldoPerBank'
import { formatRupiah, formatRupiahSingkat } from '../../lib/formatters'

const PALETTE = [
  { bar: '#38bdf8', bg: 'rgba(56,189,248,0.14)',  text: '#7dd3fc' },
  { bar: '#4ade80', bg: 'rgba(74,222,128,0.14)',  text: '#86efac' },
  { bar: '#fbbf24', bg: 'rgba(251,191,36,0.14)',  text: '#fde68a' },
  { bar: '#f472b6', bg: 'rgba(244,114,182,0.14)', text: '#f9a8d4' },
  { bar: '#a78bfa', bg: 'rgba(167,139,250,0.14)', text: '#c4b5fd' },
  { bar: '#fb923c', bg: 'rgba(251,146,60,0.14)',  text: '#fdba74' },
]
const FALLBACK_COLOR = { bar: '#64748b', bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' }
function getColor(i: number) { return PALETTE[i % PALETTE.length] ?? FALLBACK_COLOR }

function SkeletonRow() {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-3 rounded w-32" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="h-2 rounded w-20" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="h-4 rounded w-20" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="h-1 rounded-full ml-11" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

interface BankRowProps {
  row:        SaldoPerBankRow
  index:      number
  grandTotal: number
}

function BankRow({ row, index, grandTotal }: BankRowProps) {
  const col = getColor(index)
  const pct = grandTotal > 0 ? Math.max(0, Math.round((row.saldoAkhir / grandTotal) * 100)) : 0
  const neg = row.saldoAkhir < 0
  const hasPeriodActivity = row.masukPeriode > 0 || row.keluarPeriode > 0

  return (
    <div className="flex flex-col gap-1.5">
      {/* Baris utama: icon + nama + saldo akhir */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: col.bg }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1rem', color: col.bar, fontVariationSettings: "'FILL' 1" }}
          >
            account_balance
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold font-headline break-words leading-tight" style={{ color: '#e8eaf0' }}>
            {row.bankName}
          </p>
          <p className="text-[10px] font-body tabular-nums break-words leading-relaxed" style={{ color: 'rgba(232,234,240,0.38)' }}>
            {row.accountNumber} · {row.accountName}
          </p>
        </div>

        <span
          className="text-xs font-bold font-body tabular-nums flex-shrink-0"
          style={{ color: neg ? '#f87171' : col.text }}
        >
          {neg ? '-' : ''}{formatRupiahSingkat(Math.abs(row.saldoAkhir))}
        </span>
      </div>

      {/* Progress bar saldo */}
      {!neg && (
        <div className="h-1 rounded-full overflow-hidden ml-11" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width:      `${pct}%`,
              background: `linear-gradient(90deg, ${col.bar}99, ${col.bar})`,
              minWidth:   pct > 0 ? '4px' : '0',
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      )}

      {/* Aktivitas periode — masuk / keluar dalam periode terpilih */}
      {hasPeriodActivity && (
        <div className="ml-11 flex items-center gap-3">
          {row.masukPeriode > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-body tabular-nums" style={{ color: 'rgba(74,222,128,0.7)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.65rem', fontVariationSettings: "'FILL' 1" }}>arrow_downward</span>
              {formatRupiahSingkat(row.masukPeriode)}
            </span>
          )}
          {row.keluarPeriode > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-body tabular-nums" style={{ color: 'rgba(248,113,113,0.7)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.65rem', fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
              {formatRupiahSingkat(row.keluarPeriode)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface SaldoPerBankPanelProps {
  rows:        SaldoPerBankRow[]
  loading:     boolean
  periodLabel: string
  filterTo:    string
}

export function SaldoPerBankPanel({ rows, loading, periodLabel, filterTo }: SaldoPerBankPanelProps) {
  const grandTotal = rows.reduce((s, r) => s + Math.max(0, r.saldoAkhir), 0)
  const totalSaldo = rows.reduce((s, r) => s + r.saldoAkhir, 0)
  const totalMasuk = rows.reduce((s, r) => s + r.masukPeriode, 0)
  const totalKeluar = rows.reduce((s, r) => s + r.keluarPeriode, 0)

  // Format filterTo untuk label "s.d. DD Mon YYYY"
  const filterToLabel = filterTo
    ? new Date(filterTo + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : ''

  return (
    <div className="rounded-2xl flex flex-col" style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(56,189,248,0.12)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.9rem', color: '#38bdf8', fontVariationSettings: "'FILL' 1" }}
            >
              account_balance_wallet
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-headline leading-tight" style={{ color: '#e8eaf0' }}>
              Saldo Akhir per Bank
            </h3>
            {filterToLabel && (
              <p className="text-[10px] font-body mt-0.5" style={{ color: 'rgba(232,234,240,0.38)' }}>
                s.d. {filterToLabel} · {periodLabel}
              </p>
            )}
          </div>
        </div>

        {!loading && totalSaldo !== 0 && (
          <span className="text-sm font-bold font-body tabular-nums" style={{ color: '#7dd3fc' }}>
            {formatRupiahSingkat(totalSaldo)}
          </span>
        )}
      </div>

      {/* Ringkasan aktivitas periode (hanya jika ada data masuk/keluar) */}
      {!loading && (totalMasuk > 0 || totalKeluar > 0) && (
        <div
          className="flex items-center gap-4 px-5 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.75rem', color: '#4ade80', fontVariationSettings: "'FILL' 1" }}
            >
              trending_up
            </span>
            <span className="text-[10px] font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>Masuk</span>
            <span className="text-[10px] font-semibold font-body tabular-nums" style={{ color: '#86efac' }}>
              {formatRupiahSingkat(totalMasuk)}
            </span>
          </div>
          {totalKeluar > 0 && (
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '0.75rem', color: '#f87171', fontVariationSettings: "'FILL' 1" }}
              >
                trending_down
              </span>
              <span className="text-[10px] font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>Keluar</span>
              <span className="text-[10px] font-semibold font-body tabular-nums" style={{ color: '#fca5a5' }}>
                {formatRupiahSingkat(totalKeluar)}
              </span>
            </div>
          )}
          <div
            className="ml-auto flex items-center gap-1.5 pl-3"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-[10px] font-body" style={{ color: 'rgba(232,234,240,0.35)' }}>Net periode</span>
            <span
              className="text-[10px] font-semibold font-body tabular-nums"
              style={{ color: totalMasuk - totalKeluar >= 0 ? '#4ade80' : '#f87171' }}
            >
              {totalMasuk - totalKeluar >= 0 ? '+' : ''}{formatRupiahSingkat(totalMasuk - totalKeluar)}
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.5rem', color: '#38bdf8', fontVariationSettings: "'FILL' 0" }}
              >
                account_balance
              </span>
            </div>
            <p className="text-sm font-semibold font-headline" style={{ color: 'rgba(232,234,240,0.5)' }}>
              Belum ada rekening
            </p>
          </div>
        ) : (
          <>
            {rows.map((row, i) => (
              <BankRow key={row.accountId} row={row} index={i} grandTotal={grandTotal} />
            ))}

            {/* Footer */}
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[10px] font-body uppercase tracking-wider" style={{ color: 'rgba(232,234,240,0.3)' }}>
                {rows.length} rekening aktif
              </span>
              <span className="text-sm font-bold font-body tabular-nums" style={{ color: '#e8eaf0' }}>
                {formatRupiah(totalSaldo)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
