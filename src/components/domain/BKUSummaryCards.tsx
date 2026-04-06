import { useMemo } from 'react'
import type { BKUEntryWithSaldo } from '../../types'
import { formatRupiah } from '../../lib/formatters'

interface BKUSummaryCardsProps {
  entries:    BKUEntryWithSaldo[]
  saldoAkhir: number
  loading:    boolean
}

interface SummaryCardItemProps {
  icon:       string
  label:      string
  value:      string
  subtitle?:  string
  accent?:    'purple' | 'green' | 'blue'
  loading:    boolean
}

const accentMap = {
  purple: {
    iconBg:    'rgba(108,72,209,0.15)',
    iconBorder:'rgba(108,72,209,0.25)',
    iconColor: '#9B6DFF',
    valueColor:'#c4b5fd',
  },
  green: {
    iconBg:    'rgba(74,222,128,0.12)',
    iconBorder:'rgba(74,222,128,0.2)',
    iconColor: '#4ade80',
    valueColor:'#86efac',
  },
  blue: {
    iconBg:    'rgba(96,165,250,0.12)',
    iconBorder:'rgba(96,165,250,0.2)',
    iconColor: '#60a5fa',
    valueColor:'#93c5fd',
  },
}

function SummaryCardItem({ icon, label, value, subtitle, accent = 'purple', loading }: SummaryCardItemProps) {
  const colors = accentMap[accent]

  if (loading) {
    return (
      <div
        className="flex flex-col gap-4 p-5 rounded-xl animate-pulse"
        style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="w-10 h-10 rounded-xl" style={{ background: '#2a3040' }} />
        <div className="space-y-2">
          <div className="h-2.5 rounded w-24" style={{ background: '#2a3040' }} />
          <div className="h-7 rounded w-36" style={{ background: '#2a3040' }} />
          <div className="h-2.5 rounded w-20" style={{ background: '#2a3040' }} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-xl"
      style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: colors.iconBg, border: `1px solid ${colors.iconBorder}` }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '1.1rem',
            color: colors.iconColor,
            fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20",
          }}
        >
          {icon}
        </span>
      </div>

      {/* Label + Value */}
      <div>
        <p
          className="text-xs uppercase tracking-widest font-body mb-1.5"
          style={{ color: 'rgba(232,234,240,0.4)' }}
        >
          {label}
        </p>
        <p
          className="text-2xl font-bold font-headline leading-tight tabular-nums"
          style={{ color: colors.valueColor }}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs font-body mt-1" style={{ color: 'rgba(232,234,240,0.35)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

export function BKUSummaryCards({ entries, saldoAkhir, loading }: BKUSummaryCardsProps) {
  const stats = useMemo(() => {
    const totalPenerimaan = entries.reduce((sum, e) => sum + e.debit, 0)
    const jumlahTransaksi = entries.filter(e => e.debit > 0).length

    // Penerimaan hari ini
    const today = new Date().toISOString().slice(0, 10)
    const penerimaanHariIni = entries
      .filter(e => e.tanggal === today && e.debit > 0)
      .reduce((sum, e) => sum + e.debit, 0)

    return { totalPenerimaan, jumlahTransaksi, penerimaanHariIni }
  }, [entries])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <SummaryCardItem
        icon="payments"
        label="Total Penerimaan"
        value={formatRupiah(stats.totalPenerimaan)}
        subtitle={
          stats.penerimaanHariIni > 0
            ? `Hari ini: ${formatRupiah(stats.penerimaanHariIni)}`
            : 'Tidak ada penerimaan hari ini'
        }
        accent="green"
        loading={loading}
      />
      <SummaryCardItem
        icon="receipt_long"
        label="Jumlah Transaksi"
        value={`${stats.jumlahTransaksi} dok`}
        subtitle={`${entries.length} total entri BKU`}
        accent="blue"
        loading={loading}
      />
      <SummaryCardItem
        icon="account_balance_wallet"
        label="Saldo Akhir"
        value={formatRupiah(saldoAkhir)}
        subtitle="Saldo berjalan akumulatif"
        accent="purple"
        loading={loading}
      />
    </div>
  )
}
