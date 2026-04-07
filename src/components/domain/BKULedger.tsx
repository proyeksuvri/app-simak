import { useState, useEffect } from 'react'
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

// ── Paginasi ─────────────────────────────────────────────────────────────────
interface PaginationProps {
  page:       number
  totalPages: number
  pageSize:   number
  total:      number
  onChange:   (page: number) => void
}

function Pagination({ page, totalPages, pageSize, total, onChange }: PaginationProps) {
  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  // Buat array nomor halaman dengan ellipsis
  function getPages(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const btnBase = 'inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium transition-all duration-150 font-body select-none'
  const btnActive = 'bg-primary text-on-primary shadow-sm'
  const btnIdle   = 'text-[#e8eaf0] hover:bg-white/10 active:bg-white/15'
  const btnDisabled = 'text-[#e8eaf0]/25 cursor-not-allowed'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
      {/* Info baris */}
      <p className="text-xs text-[#bfc8c4] font-body order-2 sm:order-1">
        Menampilkan <span className="font-semibold text-[#e8eaf0]">{from}–{to}</span> dari{' '}
        <span className="font-semibold text-[#e8eaf0]">{total}</span> entri
      </p>

      {/* Kontrol halaman */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Prev */}
        <button
          className={[btnBase, page === 1 ? btnDisabled : btnIdle].join(' ')}
          onClick={() => page > 1 && onChange(page - 1)}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
        </button>

        {/* Nomor halaman */}
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-[#bfc8c4] select-none">…</span>
          ) : (
            <button
              key={p}
              className={[btnBase, p === page ? btnActive : btnIdle].join(' ')}
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          className={[btnBase, page === totalPages ? btnDisabled : btnIdle].join(' ')}
          onClick={() => page < totalPages && onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Halaman berikutnya"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
        </button>
      </div>
    </div>
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
  /** Jumlah baris per halaman. 0 = tanpa paginasi (default). */
  pageSize?:            number
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
export function BKULedger({ type, unitId, entriesOverride, saldoAkhirOverride, loadingOverride, pageSize = 0 }: BKULedgerProps) {
  const bku = useBKU(entriesOverride === undefined ? type : 'penerimaan', entriesOverride === undefined ? unitId : undefined)

  // mode controlled: gunakan override jika ada, fallback ke useBKU
  const entries    = entriesOverride    ?? bku.entries
  const saldoAkhir = saldoAkhirOverride ?? bku.saldoAkhir
  const loading    = loadingOverride    ?? bku.loading

  const [page, setPage] = useState(1)

  // Reset ke halaman 1 saat data berubah
  useEffect(() => { setPage(1) }, [entries])

  if (loading) {
    return <BKUSkeleton />
  }

  if (entries.length === 0) {
    return <EmptyState icon="menu_book" title="Tidak ada entri BKU" message="Entri akan muncul setelah transaksi diinput." />
  }

  const usePagination = pageSize > 0 && entries.length > pageSize
  const totalPages    = usePagination ? Math.ceil(entries.length / pageSize) : 1
  const visibleEntries = usePagination
    ? entries.slice((page - 1) * pageSize, page * pageSize)
    : entries

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
          {visibleEntries.map((entry, idx) => {
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

      {/* Paginasi */}
      {usePagination && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={entries.length}
          onChange={setPage}
        />
      )}

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
