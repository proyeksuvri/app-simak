import type { BKUType } from '../../types'
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
} from '../ui/Table/Table'
import { EmptyState } from '../ui/EmptyState'
import { formatRupiah, formatTanggal } from '../../lib/formatters'
import { useBKU } from '../../hooks/useBKU'

interface BKULedgerProps {
  type:    BKUType
  unitId?: string
}

export function BKULedger({ type, unitId }: BKULedgerProps) {
  const { entries, saldoAkhir } = useBKU(type, unitId)

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
          <TableHeadCell align="right">Debit (Masuk)</TableHeadCell>
          <TableHeadCell align="right">Kredit (Keluar)</TableHeadCell>
          <TableHeadCell align="right">Saldo</TableHeadCell>
        </TableHead>
        <TableBody>
          {entries.map((entry, idx) => (
            <TableRow key={entry.id} even={idx % 2 === 0}>
              <TableCell>
                <span className="text-xs text-on-surface-variant font-body">{formatTanggal(entry.tanggal)}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-primary font-body">{entry.nomorBukti}</span>
              </TableCell>
              <TableCell>
                <span className="font-body text-on-surface">{entry.uraian}</span>
              </TableCell>
              <TableCell align="right">
                {entry.debit > 0 ? (
                  <span className="font-data font-medium tabular-nums tracking-financial text-sm text-primary">
                    {formatRupiah(entry.debit)}
                  </span>
                ) : (
                  <span className="text-on-surface-variant/30 text-sm">—</span>
                )}
              </TableCell>
              <TableCell align="right">
                {entry.kredit > 0 ? (
                  <span className="font-data font-medium tabular-nums tracking-financial text-sm text-on-surface">
                    {formatRupiah(entry.kredit)}
                  </span>
                ) : (
                  <span className="text-on-surface-variant/30 text-sm">—</span>
                )}
              </TableCell>
              <TableCell align="right">
                <span className={[
                  'font-data font-semibold tabular-nums tracking-financial text-sm',
                  entry.saldo >= 0 ? 'text-on-surface' : 'text-error',
                ].join(' ')}>
                  {formatRupiah(entry.saldo)}
                </span>
              </TableCell>
            </TableRow>
          ))}
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
