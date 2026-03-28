import { useState } from 'react'
import type { Transaction, TransactionType, UserRole } from '../../types'
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
} from '../ui/Table/Table'
import { StatusBadge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatRupiah, formatTanggal } from '../../lib/formatters'
import { useTransactions } from '../../hooks/useTransactions'
import { useApproval } from '../../hooks/useApproval'
import { useAppContext } from '../../context/AppContext'

interface TransactionTableProps {
  filterType?:    TransactionType
  filterStatus?:  Transaction['status']
  limit?:         number
  onMutated?:     () => void
}

const BENDAHARA_ROLES: UserRole[] = [
  'bendahara_penerimaan', 'bendahara_induk', 'bendahara_pembantu',
]

export function TransactionTable({ filterType, filterStatus, limit, onMutated }: TransactionTableProps) {
  const { currentUser } = useAppContext()
  const { transactions, refetch } = useTransactions({ type: filterType, status: filterStatus })
  const approval = useApproval()

  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote]     = useState('')
  const [actionError, setActionError]   = useState<string | null>(null)

  const rows = limit ? transactions.slice(0, limit) : transactions

  const role = currentUser.role
  const isBendahara = BENDAHARA_ROLES.includes(role)
  const canApprove  = role === 'pimpinan' || role === 'admin'
  const showActions = isBendahara || canApprove

  const handleSubmit = async (txId: string) => {
    setActionError(null)
    const err = await approval.submit(txId)
    if (err) { setActionError(err); return }
    refetch()
    onMutated?.()
  }

  const handleApprove = async (txId: string) => {
    setActionError(null)
    const err = await approval.approve(txId)
    if (err) { setActionError(err); return }
    refetch()
    onMutated?.()
  }

  const openReject = (txId: string) => {
    setRejectNote('')
    setActionError(null)
    setRejectTarget(txId)
  }

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return
    setActionError(null)
    const err = await approval.reject(rejectTarget, rejectNote)
    if (err) { setActionError(err); return }
    setRejectTarget(null)
    refetch()
    onMutated?.()
  }

  if (rows.length === 0) {
    return <EmptyState icon="receipt_long" title="Belum ada transaksi" message="Transaksi akan muncul di sini setelah diinput." />
  }

  return (
    <>
      {actionError && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-error-container text-on-error-container text-sm font-body">
          {actionError}
        </div>
      )}

      <Table>
        <TableHead>
          <TableHeadCell>Tanggal</TableHeadCell>
          <TableHeadCell>No. Bukti</TableHeadCell>
          <TableHeadCell>Deskripsi</TableHeadCell>
          <TableHeadCell>Kategori</TableHeadCell>
          <TableHeadCell align="right">Nominal</TableHeadCell>
          <TableHeadCell align="center">Status</TableHeadCell>
          {showActions && <TableHeadCell align="center">Aksi</TableHeadCell>}
        </TableHead>
        <TableBody>
          {rows.map((t, idx) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              even={idx % 2 === 0}
              showActions={showActions}
              isBendahara={isBendahara}
              canApprove={canApprove}
              submitting={approval.submitting}
              approving={approval.approving}
              rejecting={approval.rejecting}
              onSubmit={handleSubmit}
              onApprove={handleApprove}
              onReject={openReject}
            />
          ))}
        </TableBody>
      </Table>

      {/* Modal konfirmasi tolak */}
      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Tolak Transaksi"
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant font-body">
            Berikan catatan penolakan (opsional):
          </p>
          <textarea
            className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            placeholder="Alasan penolakan..."
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
          />
          {actionError && (
            <p className="text-sm text-error font-body">{actionError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-error text-on-error hover:bg-error/90"
              disabled={approval.rejecting}
              onClick={handleRejectConfirm}
            >
              {approval.rejecting ? 'Memproses...' : 'Tolak'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

interface RowProps {
  transaction:  Transaction
  even:         boolean
  showActions:  boolean
  isBendahara:  boolean
  canApprove:   boolean
  submitting:   boolean
  approving:    boolean
  rejecting:    boolean
  onSubmit:     (id: string) => void
  onApprove:    (id: string) => void
  onReject:     (id: string) => void
}

function TransactionRow({
  transaction: t, even,
  showActions, isBendahara, canApprove,
  submitting, approving, rejecting,
  onSubmit, onApprove, onReject,
}: RowProps) {
  return (
    <TableRow even={even}>
      <TableCell>
        <span className="text-xs text-on-surface-variant font-body">{formatTanggal(t.tanggal)}</span>
      </TableCell>
      <TableCell>
        <span className="text-xs font-medium text-primary font-body">{t.nomorBukti}</span>
      </TableCell>
      <TableCell>
        <div>
          <span className="font-body text-on-surface">{t.deskripsi}</span>
          {t.status === 'ditolak' && t.rejectionNote && (
            <p className="text-xs text-error font-body mt-0.5 italic">Catatan: {t.rejectionNote}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-xs text-on-surface-variant font-body">{t.kategori}</span>
      </TableCell>
      <TableCell align="right">
        <span
          className={[
            'font-data font-medium tabular-nums tracking-financial text-sm',
            t.type === 'penerimaan' ? 'text-primary' : 'text-on-surface',
          ].join(' ')}
        >
          {t.type === 'penerimaan' ? '+' : '-'}{formatRupiah(t.nominal)}
        </span>
      </TableCell>
      <TableCell align="center">
        <StatusBadge status={t.status} />
      </TableCell>
      {showActions && (
        <TableCell align="center">
          <div className="flex items-center justify-center gap-1.5">
            {isBendahara && t.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                icon="send"
                disabled={submitting}
                onClick={() => onSubmit(t.id)}
              >
                Ajukan
              </Button>
            )}
            {canApprove && t.status === 'diajukan' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="check_circle"
                  disabled={approving}
                  className="text-primary"
                  onClick={() => onApprove(t.id)}
                >
                  Setujui
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="cancel"
                  disabled={rejecting}
                  className="text-error"
                  onClick={() => onReject(t.id)}
                >
                  Tolak
                </Button>
              </>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}
