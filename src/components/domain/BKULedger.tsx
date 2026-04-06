import type { BKUType, BKUEntryWithSaldo } from '../../types'
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
} from '../ui/Table/Table'
import { EmptyState } from '../ui/EmptyState'
import { formatRupiah, formatTanggal } from '../../lib/formatters'
import { useBKU } from '../../hooks/useBKU'
import type { TransactionStatus } from '../../types/database'

// ── Badge status untuk data DB ──────────────────────────────────────────────
type DbStatus = TransactionStatus  // 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED'

const DB_STATUS_STYLE: Partial<Record<DbStatus, React.CSSProperties>> = {
  APPROVED:  { background: 'rgba(74,222,128,0.15)',  color: '#4ade80' },
  POSTED:    { background: 'rgba(96,165,250,0.15)',   color: '#60a5fa' },
  SUBMITTED: { background: 'rgba(251,191,36,0.15)',   color: '#fbbf24' },
  DRAFT:     { background: 'rgba(255,255,255,0.08)',  color: 'rgba(232,234,240,0.5)' },
  REJECTED:  { background: 'rgba(248,113,113,0.15)',  color: '#f87171' },
}
const DB_STATUS_LABEL: Partial<Record<DbStatus, string>> = {
  APPROVED:  'Terverifikasi',
  POSTED:    'Diposting',
  SUBMITTED: 'Diajukan',
  DRAFT:     'Draft',
  REJECTED:  'Ditolak',
}

function DbStatusBadge({ status }: { status: DbStatus }) {
  const style = DB_STATUS_STYLE[status] ?? { background: 'rgba(255,255,255,0.08)', color: 'rgba(232,234,240,0.5)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-body"
      style={style}
    >
      {DB_STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────
interface BKULedgerProps {
  type:              BKUType
  unitId?:           string
  // mode controlled: jika diberikan, skip useBKU dan gunakan data ini
  entriesOverride?:     BKUEntryWithSaldo[]
  saldoAkhirOverride?:  number
  loadingOverride?:     boolean
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function BKUSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Skeleton header — 7 kolom */}
      <div className="grid grid-cols-7 gap-4 px-4 py-3 rounded-lg" style={{ background: '#1e2430' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-3 rounded" style={{ background: '#2a3040', width: i === 2 ? '80%' : '60%' }} />
        ))}
      </div>
      {/* Skeleton rows */}
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-7 gap-4 px-4 py-3 rounded-lg" style={{ background: rowIdx % 2 === 0 ? '#161a21' : '#1a1f29' }}>
          <div className="h-3 rounded" style={{ background: '#2a3040', width: '70%' }} />
          <div className="h-3 rounded" style={{ background: '#2a3040', width: '55%' }} />
          <div className="h-3 rounded" style={{ background: '#2a3040', width: '85%' }} />
          <div className="h-3 rounded" style={{ background: '#2a3040', width: '50%' }} />
          <div className="h-3 rounded ml-auto" style={{ background: '#2a3040', width: '60%' }} />
          <div className="h-3 rounded ml-auto" style={{ background: '#2a3040', width: '30%' }} />
          <div className="h-3 rounded ml-auto" style={{ background: '#2a3040', width: '60%' }} />
        </div>
      ))}
      {/* Skeleton saldo akhir */}
      <div className="flex justify-end pt-1">
        <div className="h-9 w-48 rounded-xl" style={{ background: '#2a3040' }} />
      </div>
    </div>
  )
}

// ── Tanggal hari ini ──────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10)

// ── Komponen utama ────────────────────────────────────────────────────────────
export function BKULedger({ type, unitId, entriesOverride, saldoAkhirOverride, loadingOverride }: BKULedgerProps) {
  const bku = useBKU(entriesOverride === undefined ? type : 'penerimaan', entriesOverride === undefined ? unitId : undefined)

  // mode controlled: gunakan override jika ada, fallback ke useBKU
  const entries    = entriesOverride    ?? bku.entries
  const saldoAkhir = saldoAkhirOverride ?? bku.saldoAkhir
  const loading    = loadingOverride    ?? bku.loading

  if (loading) {
    return <BKUSkeleton />
  }

  if (entries.length === 0) {
    return <EmptyState icon="menu_book" title="Tidak ada entri BKU" message="Entri akan muncul setelah transaksi diinput." />
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHead>
          <TableHeadCell>Tanggal</TableHeadCell>
          <TableHeadCell>No. Bukti</TableHeadCell>
          <TableHeadCell>Uraian</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell align="right">Debit (Masuk)</TableHeadCell>
          <TableHeadCell align="right">Kredit (Keluar)</TableHeadCell>
          <TableHeadCell align="right">Saldo</TableHeadCell>
        </TableHead>
        <TableBody>
          {entries.map((entry, idx) => {
            const isToday = entry.tanggal === TODAY
            return (
              <TableRow
                key={entry.id}
                even={idx % 2 === 0}
                style={isToday ? {
                  borderLeft:  '3px solid #4ade80',
                  background:  'rgba(74,222,128,0.06)',
                } : undefined}
              >
                {/* Tanggal + badge Hari Ini */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-body opacity-70">{formatTanggal(entry.tanggal)}</span>
                    {isToday && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit font-body"
                        style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80' }}
                      >
                        Hari Ini
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium font-body" style={{ color: '#c4b5fd' }}>{entry.nomorBukti}</span>
                </TableCell>
                <TableCell>
                  <span className="font-body text-[#e8eaf0]">{entry.uraian}</span>
                </TableCell>

                {/* Badge Status */}
                <TableCell>
                  {entry.status ? (
                    <DbStatusBadge status={entry.status} />
                  ) : (
                    <span className="text-on-surface-variant/30 text-xs">—</span>
                  )}
                </TableCell>

                <TableCell align="right">
                  {entry.debit > 0 ? (
                    <span className="font-data font-medium tabular-nums tracking-financial text-sm text-[#4ade80]">
                      {formatRupiah(entry.debit)}
                    </span>
                  ) : (
                    <span className="text-[#e8eaf0] opacity-30 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell align="right">
                  {entry.kredit > 0 ? (
                    <span className="font-data font-medium tabular-nums tracking-financial text-sm text-[#e8eaf0]">
                      {formatRupiah(entry.kredit)}
                    </span>
                  ) : (
                    <span className="text-[#e8eaf0] opacity-30 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell align="right">
                  <span className={[
                    'font-data font-semibold tabular-nums tracking-financial text-sm',
                    entry.saldo >= 0 ? 'text-[#e8eaf0]' : 'text-error',
                  ].join(' ')}>
                    {formatRupiah(entry.saldo)}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Saldo Akhir */}
      <div className="flex justify-end">
        <div className="bg-primary text-on-primary px-5 py-2.5 rounded-xl flex items-center gap-3">
          <span className="text-xs font-medium text-on-primary/70 font-body">Saldo Akhir</span>
          <span className="text-base font-bold font-headline tabular-nums tracking-financial">
            {formatRupiah(saldoAkhir)}
          </span>
        </div>
      </div>
    </div>
  )
}
