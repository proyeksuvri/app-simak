import { useState, useMemo, useEffect, useCallback } from 'react'
import type { Transaction, TransactionType, UserRole } from '../../types'
import type { DbBankAccount } from '../../types/database'
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
} from '../ui/Table/Table'
import { StatusBadge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatRupiah, formatTanggal } from '../../lib/formatters'
import { useTransactionsPaged } from '../../hooks/useTransactionsPaged'
import { useApproval } from '../../hooks/useApproval'
import { useMutateTransaction } from '../../hooks/useMutateTransaction'
import { useAppContext } from '../../context/AppContext'
import { useBankAccounts } from '../../hooks/useBankAccounts'
import { TransactionFormModal } from './TransactionFormModal'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const STATUS_OPTIONS: { label: string; value: Transaction['status'] | '' }[] = [
  { label: 'Semua Status', value: '' },
  { label: 'Draft',        value: 'pending' },
  { label: 'Diajukan',     value: 'diajukan' },
  { label: 'Terverifikasi',value: 'terverifikasi' },
  { label: 'Ditolak',      value: 'ditolak' },
]

const BULAN_OPTIONS = [
  { label: 'Semua Bulan', value: '' },
  { label: 'Januari',    value: '01' },
  { label: 'Februari',   value: '02' },
  { label: 'Maret',      value: '03' },
  { label: 'April',      value: '04' },
  { label: 'Mei',        value: '05' },
  { label: 'Juni',       value: '06' },
  { label: 'Juli',       value: '07' },
  { label: 'Agustus',    value: '08' },
  { label: 'September',  value: '09' },
  { label: 'Oktober',    value: '10' },
  { label: 'November',   value: '11' },
  { label: 'Desember',   value: '12' },
]

interface TransactionTableProps {
  filterType?:         TransactionType
  filterStatus?:       Transaction['status']
  filterUnitId?:       string
  filterKategori?:     string
  filterKategoriList?: string[]
  limit?:              number
  onMutated?:      () => void
}

const BENDAHARA_ROLES: UserRole[] = [
  'bendahara_penerimaan', 'bendahara_induk', 'bendahara_pembantu',
]

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDone: () => void
}

function Toast({ message, type, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in"
      style={{
        background: type === 'success' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
        border: `1px solid ${type === 'success' ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
        color: type === 'success' ? '#4ade80' : '#f87171',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
        {type === 'success' ? 'check_circle' : 'error'}
      </span>
      {message}
    </div>
  )
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export function TransactionTable({ filterType, filterStatus, filterUnitId, filterKategori, filterKategoriList, limit, onMutated }: TransactionTableProps) {
  const { currentUser } = useAppContext()
  const approval = useApproval()
  const { accounts } = useBankAccounts(false)
  const { deleteTransaction, saving: deleting } = useMutateTransaction()

  const [rejectTarget,   setRejectTarget]   = useState<string | null>(null)
  const [rejectNote,     setRejectNote]     = useState('')
  const [actionError,    setActionError]    = useState<string | null>(null)
  const [editTarget,     setEditTarget]     = useState<Transaction | null>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<Transaction | null>(null)
  const [selected,         setSelected]         = useState<Set<string>>(new Set())
  const [bulkSubmitting,   setBulkSubmitting]   = useState(false)
  const [bulkDeleting,     setBulkDeleting]     = useState(false)
  const [bulkDeleteOpen,   setBulkDeleteOpen]   = useState(false)
  const [bulkApproving,    setBulkApproving]    = useState(false)
  const [bulkApproveOpen,  setBulkApproveOpen]  = useState(false)
  const [bulkRejecting,    setBulkRejecting]    = useState(false)
  const [bulkRejectOpen,   setBulkRejectOpen]   = useState(false)
  const [bulkRejectNote,   setBulkRejectNote]   = useState('')

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }, [])

  // ── Filter lokal ────────────────────────────────────────────────────────────
  const [searchText,        setSearchText]        = useState('')
  const [filterStatusLocal, setFilterStatusLocal] = useState<Transaction['status'] | ''>('')
  const [filterMonth,       setFilterMonth]       = useState('')
  const [filterAccountId,   setFilterAccountId]   = useState('')
  const [sortField,         setSortField]         = useState<'tanggal' | 'nominal' | null>(null)
  const [sortDir,           setSortDir]           = useState<'asc' | 'desc'>('asc')

  function toggleSort(field: 'tanggal' | 'nominal') {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  // ── Paginasi server-side ─────────────────────────────────────────────────────
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])

  // Reset ke halaman 1 saat filter berubah
  useEffect(() => {
    setPage(1)
  }, [filterType, filterStatus, filterUnitId, filterKategori, pageSize, searchText, filterStatusLocal, filterMonth, filterAccountId])

  // ── Server-side paged query ──────────────────────────────────────────────────
  const { rows, total: totalRows, stats, loading, refetch } = useTransactionsPaged({
    type:            filterType,
    propStatus:      filterStatus,
    unitId:          filterUnitId,
    filterStatus:    filterStatusLocal,
    filterMonth,
    filterAccountId,
    searchText,
    kategori:        filterKategori,
    kategoriList:    filterKategoriList,
    sortField,
    sortDir,
    page:            limit ? 1 : page,
    pageSize:        limit ?? pageSize,
  })

  // Jika prop limit dipakai (mode ringkasan), tidak pakai paginasi
  const usePagination = !limit
  const totalPages = usePagination ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1
  const startIndex = usePagination ? (page - 1) * pageSize + 1 : 1
  const endIndex   = usePagination ? Math.min(page * pageSize, totalRows) : rows.length

  const role        = currentUser.role
  const isBendahara = BENDAHARA_ROLES.includes(role)
  const canApprove  = role === 'pimpinan' || role === 'admin'
  const showActions = isBendahara || canApprove
  const isPenerimaan = filterType === 'penerimaan'

  // Rows eligible for selection (hanya dari halaman saat ini)
  const selectableIds = isBendahara
    ? rows.filter(t => t.status === 'pending' || t.status === 'ditolak').map(t => t.id)
    : canApprove
      ? rows.filter(t => t.status === 'diajukan').map(t => t.id)
      : []

  const submitableSelected = isBendahara
    ? [...selected].filter(id => rows.find(t => t.id === id)?.status === 'pending')
    : []

  const approvableSelected = canApprove
    ? [...selected].filter(id => rows.find(t => t.id === id)?.status === 'diajukan')
    : []

  const allSelected    = selectableIds.length > 0 && selectableIds.every(id => selected.has(id))
  const someSelected   = selected.size > 0
  const showCheckboxes = selectableIds.length > 0

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); selectableIds.forEach(id => next.delete(id)); return next })
    } else {
      setSelected(prev => new Set([...prev, ...selectableIds]))
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Action handlers ──────────────────────────────────────────────────────────

  const handleBulkSubmit = async () => {
    const missingAccount = submitableSelected.filter(id => {
      const tx = rows.find(t => t.id === id)
      return tx?.type === 'penerimaan' && !tx.destinationAccountId
    })
    if (missingAccount.length > 0) {
      setActionError(`${missingAccount.length} transaksi BPN belum memiliki rekening bank. Edit transaksi tersebut terlebih dahulu.`)
      return
    }
    setBulkSubmitting(true)
    setActionError(null)
    const { submitted, skipped, error } = await approval.submitBulk(submitableSelected)
    setBulkSubmitting(false)
    setSelected(new Set())
    if (error) {
      setActionError(error)
    } else {
      if (skipped > 0) setActionError(`${skipped} transaksi dilewati (bukan status Draft)`)
      if (submitted > 0) showToast(`${submitted} transaksi berhasil diajukan`)
    }
    refetch()
    onMutated?.()
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    setActionError(null)
    const ids = [...selected]
    let firstErr: string | null = null
    let successCount = 0
    for (const id of ids) {
      const ok = await deleteTransaction(id)
      if (ok) successCount++; else if (!firstErr) firstErr = 'Gagal menghapus sebagian transaksi'
    }
    setBulkDeleting(false)
    setBulkDeleteOpen(false)
    setSelected(new Set())
    if (firstErr) setActionError(firstErr)
    else showToast(`${successCount} transaksi berhasil dihapus`)
    refetch()
    onMutated?.()
  }

  const handleBulkApprove = async () => {
    setBulkApproving(true)
    setActionError(null)
    const { approved, skipped, error } = await approval.approveBulk(approvableSelected)
    setBulkApproving(false)
    setBulkApproveOpen(false)
    setSelected(new Set())
    if (error) {
      setActionError(error)
    } else {
      if (skipped > 0) setActionError(`${skipped} transaksi dilewati (bukan status Diajukan)`)
      if (approved > 0) showToast(`${approved} transaksi berhasil disetujui`)
    }
    refetch()
    onMutated?.()
  }

  const handleBulkReject = async () => {
    setBulkRejecting(true)
    setActionError(null)
    const { rejected, skipped, error } = await approval.rejectBulk(approvableSelected, bulkRejectNote)
    setBulkRejecting(false)
    setBulkRejectOpen(false)
    setBulkRejectNote('')
    setSelected(new Set())
    if (error) {
      setActionError(error)
    } else {
      if (skipped > 0) setActionError(`${skipped} transaksi dilewati (bukan status Diajukan)`)
      if (rejected > 0) showToast(`${rejected} transaksi berhasil ditolak`)
    }
    refetch()
    onMutated?.()
  }

  const handleSubmit = async (txId: string) => {
    setActionError(null)
    const tx = rows.find(t => t.id === txId)
    if (tx?.type === 'penerimaan' && !tx.destinationAccountId) {
      setActionError('Transaksi BPN ini belum memiliki rekening bank. Edit transaksi dan pilih rekening bank terlebih dahulu.')
      return
    }
    const err = await approval.submit(txId)
    if (err) { setActionError(err); return }
    showToast('Transaksi berhasil diajukan')
    refetch()
    onMutated?.()
  }

  const handleApprove = async (txId: string) => {
    setActionError(null)
    const err = await approval.approve(txId)
    if (err) { setActionError(err); return }
    showToast('Transaksi berhasil disetujui')
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
    showToast('Transaksi berhasil ditolak')
    refetch()
    onMutated?.()
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const ok = await deleteTransaction(deleteTarget.id)
    if (ok) {
      setDeleteTarget(null)
      showToast('Transaksi berhasil dihapus')
      refetch()
      onMutated?.()
    }
  }

  const handleEditSuccess = () => {
    setEditTarget(null)
    showToast('Transaksi berhasil disimpan')
    refetch()
    onMutated?.()
  }

  const hasActiveFilter = !!searchText || !!filterStatusLocal || !!filterMonth || !!filterAccountId

  function resetFilters() {
    setSearchText('')
    setFilterStatusLocal('')
    setFilterMonth('')
    setFilterAccountId('')
  }

  // ── Lookup nama rekening ─────────────────────────────────────────────────────
  const accountMap = useMemo(() => {
    const m: Record<string, DbBankAccount> = {}
    accounts.forEach(a => { m[a.id] = a })
    return m
  }, [accounts])

  return (
    <>
      {/* ── Summary Cards (hanya mode penuh, bukan limit) ─────────────────── */}
      {!limit && (
        <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Terverifikasi"
            value={formatRupiah(stats.totalNominal)}
            icon="verified"
            color="#4ade80"
          />
          <SummaryCard
            label="Draft"
            value={`${stats.countDraft} transaksi`}
            icon="edit_note"
            color="rgba(232,234,240,0.5)"
          />
          <SummaryCard
            label="Menunggu Persetujuan"
            value={`${stats.countDiajukan} transaksi`}
            icon="pending"
            color="#facc15"
          />
          {isPenerimaan && stats.missingAccount > 0 ? (
            <SummaryCard
              label="Perlu Rekening Bank"
              value={`${stats.missingAccount} transaksi`}
              icon="warning"
              color="#f87171"
              warning
            />
          ) : (
            <SummaryCard
              label="Terverifikasi"
              value={`${stats.countVerified} transaksi`}
              icon="task_alt"
              color="#4ade80"
            />
          )}
        </div>
      )}

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      {!limit && (
        <div className="mb-4">
          {/* Baris: Search + Status + Bulan + Bank + Reset + info */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: '1rem', color: 'rgba(232,234,240,0.4)' }}>search</span>
              <input
                type="text"
                placeholder="Cari deskripsi / no. bukti…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e8eaf0' }}
              />
            </div>

            {/* Status */}
            <select
              value={filterStatusLocal}
              onChange={e => setFilterStatusLocal(e.target.value as Transaction['status'] | '')}
              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e8eaf0' }}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background: '#1e2430', color: '#e8eaf0' }}>{o.label}</option>
              ))}
            </select>

            {/* Bulan */}
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e8eaf0' }}
            >
              {BULAN_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background: '#1e2430', color: '#e8eaf0' }}>{o.label}</option>
              ))}
            </select>

            {/* Bank (hanya untuk BPN) */}
            {isPenerimaan && accounts.length > 0 && (
              <select
                value={filterAccountId}
                onChange={e => setFilterAccountId(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e8eaf0' }}
              >
                <option value="" style={{ background: '#1e2430', color: '#e8eaf0' }}>Semua Bank</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id} style={{ background: '#1e2430', color: '#e8eaf0' }}>
                    {a.bank_name} — {a.account_number}
                  </option>
                ))}
              </select>
            )}

            {/* Reset */}
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>filter_alt_off</span>
                Reset
              </button>
            )}

            {/* Info jumlah */}
            <span className="text-xs ml-auto" style={{ color: 'rgba(232,234,240,0.4)' }}>
              {totalRows} transaksi
            </span>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3" style={{ color: 'rgba(232,234,240,0.4)' }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '1.4rem' }}>progress_activity</span>
          <span className="text-sm">Memuat data…</span>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && rows.length === 0 && (
        <EmptyState
          icon={hasActiveFilter ? 'search_off' : 'receipt_long'}
          title={hasActiveFilter ? 'Tidak ada hasil' : 'Belum ada transaksi'}
          message={hasActiveFilter ? 'Coba ubah kata kunci atau filter yang digunakan.' : 'Transaksi akan muncul di sini setelah diinput.'}
        />
      )}

      {rows.length > 0 && <>
        {/* Error bar */}
        {actionError && (
          <div className="mb-3 px-4 py-2 rounded-xl text-sm font-body" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
            {actionError}
          </div>
        )}

        {/* Bulk action bar */}
        {showCheckboxes && (
          <div className="mb-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-body" style={{ color: 'rgba(232,234,240,0.8)' }}>
              {someSelected ? `${selected.size} transaksi dipilih` : `${selectableIds.length} transaksi dapat dipilih`}
            </span>
            {someSelected && isBendahara && submitableSelected.length > 0 && (
              <Button variant="primary" size="sm" icon="send" disabled={bulkSubmitting || bulkDeleting} onClick={handleBulkSubmit}>
                {bulkSubmitting ? 'Mengajukan...' : `Ajukan ${submitableSelected.length} Transaksi`}
              </Button>
            )}
            {someSelected && canApprove && approvableSelected.length > 0 && (
              <Button
                variant="primary" size="sm" icon="check_circle"
                disabled={bulkApproving || bulkRejecting}
                onClick={() => setBulkApproveOpen(true)}
              >
                {`Setujui ${approvableSelected.length} Transaksi`}
              </Button>
            )}
            {someSelected && canApprove && approvableSelected.length > 0 && (
              <Button
                variant="secondary" size="sm" icon="cancel"
                className="!text-[#f87171] border-[#f87171]/30 hover:bg-[#f87171]/10"
                disabled={bulkApproving || bulkRejecting}
                onClick={() => { setBulkRejectNote(''); setBulkRejectOpen(true) }}
              >
                {`Tolak ${approvableSelected.length} Transaksi`}
              </Button>
            )}
            {someSelected && isBendahara && (
              <Button
                variant="secondary" size="sm" icon="delete"
                className="!text-[#f87171] border-[#f87171]/30 hover:bg-[#f87171]/10"
                disabled={bulkSubmitting || bulkDeleting}
                onClick={() => setBulkDeleteOpen(true)}
              >
                {`Hapus ${selected.size} Transaksi`}
              </Button>
            )}
          </div>
        )}

        <Table>
          <TableHead>
            {showCheckboxes && (
              <TableHeadCell align="center">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary cursor-pointer"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  title="Pilih semua"
                />
              </TableHeadCell>
            )}
            <TableHeadCell>
              <button onClick={() => toggleSort('tanggal')} className="flex items-center gap-1 hover:opacity-100 transition-opacity" style={{ opacity: sortField === 'tanggal' ? 1 : 0.7 }}>
                Tanggal
                <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>
                  {sortField === 'tanggal' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                </span>
              </button>
            </TableHeadCell>
            <TableHeadCell>No. Bukti</TableHeadCell>
            <TableHeadCell>Deskripsi</TableHeadCell>
            <TableHeadCell>Kategori</TableHeadCell>
            {isPenerimaan && <TableHeadCell>Rekening Bank</TableHeadCell>}
            <TableHeadCell align="right">
              <button onClick={() => toggleSort('nominal')} className="flex items-center gap-1 justify-end w-full hover:opacity-100 transition-opacity" style={{ opacity: sortField === 'nominal' ? 1 : 0.7 }}>
                Nominal
                <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>
                  {sortField === 'nominal' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                </span>
              </button>
            </TableHeadCell>
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
                role={role}
                submitting={approval.submitting}
                approving={approval.approving}
                rejecting={approval.rejecting}
                showCheckbox={showCheckboxes}
                checked={selected.has(t.id)}
                isPenerimaan={isPenerimaan}
                accountMap={accountMap}
                onToggleCheck={selectableIds.includes(t.id) ? () => toggleSelect(t.id) : undefined}
                onSubmit={handleSubmit}
                onApprove={handleApprove}
                onReject={openReject}
                onEdit={t => setEditTarget(t)}
                onDelete={t => setDeleteTarget(t)}
              />
            ))}
          </TableBody>
        </Table>

        {/* Paginasi */}
        {usePagination && totalRows > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalRows={totalRows}
            startIndex={startIndex}
            endIndex={endIndex}
            onPage={setPage}
            onPageSize={size => { setPageSize(size); setPage(1) }}
          />
        )}

        {/* Modal edit */}
        {editTarget && (
          <TransactionFormModal
            open
            onClose={() => setEditTarget(null)}
            txType={editTarget.type === 'penerimaan' ? 'IN' : 'OUT'}
            onSuccess={handleEditSuccess}
            editTx={editTarget}
          />
        )}

        {/* Modal hapus */}
        <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Hapus Transaksi">
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-body" style={{ color: 'rgba(232,234,240,0.6)' }}>
              Yakin ingin menghapus transaksi{' '}
              <span className="font-semibold" style={{ color: '#e8eaf0' }}>{deleteTarget?.nomorBukti}</span>?{' '}
              Tindakan ini tidak dapat diurungkan.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)} className="!bg-[#2a303c] !text-[#bfc8c4] hover:!bg-[#3b4252] border border-white/10">Batal</Button>
              <Button variant="primary" size="sm" className="!bg-[#fca5a5]/10 !text-[#fca5a5] hover:!bg-[#fca5a5]/20 border border-[#fca5a5]/30" disabled={deleting} onClick={handleDeleteConfirm}>
                {deleting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal hapus massal */}
        <Modal open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} title="Hapus Transaksi Massal">
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-body" style={{ color: 'rgba(232,234,240,0.6)' }}>
              Yakin ingin menghapus{' '}
              <span className="font-semibold" style={{ color: '#f87171' }}>{selected.size} transaksi</span>{' '}
              yang dipilih? Tindakan ini tidak dapat diurungkan.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBulkDeleteOpen(false)} className="!bg-[#2a303c] !text-[#bfc8c4] hover:!bg-[#3b4252] border border-white/10">Batal</Button>
              <Button variant="primary" size="sm" className="!bg-[#fca5a5]/10 !text-[#fca5a5] hover:!bg-[#fca5a5]/20 border border-[#fca5a5]/30" disabled={bulkDeleting} onClick={handleBulkDelete}>
                {bulkDeleting ? 'Menghapus...' : `Hapus ${selected.size} Transaksi`}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal setujui massal */}
        <Modal open={bulkApproveOpen} onClose={() => setBulkApproveOpen(false)} title="Setujui Transaksi Massal">
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-body" style={{ color: 'rgba(232,234,240,0.6)' }}>
              Yakin ingin menyetujui{' '}
              <span className="font-semibold" style={{ color: '#4ade80' }}>{approvableSelected.length} transaksi</span>{' '}
              yang dipilih?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBulkApproveOpen(false)} className="!bg-[#2a303c] !text-[#bfc8c4] hover:!bg-[#3b4252] border border-white/10">Batal</Button>
              <Button variant="primary" size="sm" icon="check_circle" disabled={bulkApproving} className="!bg-[#86efac]/10 !text-[#86efac] hover:!bg-[#86efac]/20 border border-[#86efac]/30" onClick={handleBulkApprove}>
                {bulkApproving ? 'Memproses...' : `Setujui ${approvableSelected.length} Transaksi`}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal tolak massal */}
        <Modal open={bulkRejectOpen} onClose={() => setBulkRejectOpen(false)} title="Tolak Transaksi Massal">
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-body" style={{ color: 'rgba(232,234,240,0.6)' }}>
              Tolak{' '}
              <span className="font-semibold" style={{ color: '#f87171' }}>{approvableSelected.length} transaksi</span>{' '}
              yang dipilih. Berikan catatan penolakan (opsional):
            </p>
            <textarea
              className="w-full px-3 py-2 rounded-xl text-sm font-body resize-none focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0' }}
              rows={3}
              placeholder="Alasan penolakan..."
              value={bulkRejectNote}
              onChange={e => setBulkRejectNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBulkRejectOpen(false)} className="!bg-[#2a303c] !text-[#bfc8c4] hover:!bg-[#3b4252] border border-white/10">Batal</Button>
              <Button variant="primary" size="sm" disabled={bulkRejecting} className="!bg-[#fca5a5]/10 !text-[#fca5a5] hover:!bg-[#fca5a5]/20 border border-[#fca5a5]/30" onClick={handleBulkReject}>
                {bulkRejecting ? 'Memproses...' : `Tolak ${approvableSelected.length} Transaksi`}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal tolak */}
        <Modal open={rejectTarget !== null} onClose={() => setRejectTarget(null)} title="Tolak Transaksi">
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-body" style={{ color: 'rgba(232,234,240,0.6)' }}>
              Berikan catatan penolakan (opsional):
            </p>
            <textarea
              className="w-full px-3 py-2 rounded-xl text-sm font-body resize-none focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0' }}
              rows={3}
              placeholder="Alasan penolakan..."
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
            />
            {actionError && (
              <p className="text-sm font-body" style={{ color: '#fca5a5' }}>{actionError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)} className="!bg-[#2a303c] !text-[#bfc8c4] hover:!bg-[#3b4252] border border-white/10">Batal</Button>
              <Button variant="primary" size="sm" className="!bg-[#fca5a5]/10 !text-[#fca5a5] hover:!bg-[#fca5a5]/20 border border-[#fca5a5]/30" disabled={approval.rejecting} onClick={handleRejectConfirm}>
                {approval.rejecting ? 'Memproses...' : 'Tolak'}
              </Button>
            </div>
          </div>
        </Modal>
      </>}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon, color, warning }: {
  label:    string
  value:    string
  icon:     string
  color:    string
  warning?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: warning ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${warning ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <span className="material-symbols-outlined text-2xl" style={{ color, flexShrink: 0 }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs truncate font-body" style={{ color: 'rgba(232,234,240,0.6)' }}>{label}</p>
        <p className="text-sm font-semibold truncate font-body" style={{ color }}>{value}</p>
      </div>
    </div>
  )
}

// ─── Komponen Paginasi ────────────────────────────────────────────────────────

interface PaginationProps {
  page:       number
  totalPages: number
  pageSize:   number
  totalRows:  number
  startIndex: number
  endIndex:   number
  onPage:     (p: number) => void
  onPageSize: (s: number) => void
}

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  const lo = Math.max(2, current - 1)
  const hi = Math.min(total - 1, current + 1)
  for (let i = lo; i <= hi; i++) pages.push(i)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

function Pagination({ page, totalPages, pageSize, totalRows, startIndex, endIndex, onPage, onPageSize }: PaginationProps) {
  const pages = getPageNumbers(page, totalPages)

  const btnBase     = 'inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium transition-colors select-none'
  const btnActive   = 'bg-primary text-on-primary'
  const btnInactive = 'text-[#e8eaf0]/70 hover:bg-white/10 hover:text-[#e8eaf0]'
  const btnDisabled = 'opacity-30 cursor-not-allowed'

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(232,234,240,0.7)' }}>
        <span>{totalRows === 0 ? '0 data' : `${startIndex}–${endIndex} dari ${totalRows} transaksi`}</span>
        <span style={{ color: 'rgba(232,234,240,0.3)' }}>|</span>
        <label className="flex items-center gap-1.5">
          Baris:
          <select
            value={pageSize}
            onChange={e => onPageSize(Number(e.target.value))}
            className="h-7 px-2 rounded-lg text-xs focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)', color: '#e8eaf0' }}
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s} style={{ background: '#1e2430', color: '#e8eaf0' }}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`} onClick={() => onPage(1)} disabled={page === 1} title="Halaman pertama">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>first_page</span>
        </button>
        <button className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`} onClick={() => onPage(page - 1)} disabled={page === 1} title="Sebelumnya">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e-${i}`} className="px-1 text-xs text-on-surface-variant select-none">…</span>
            : <button key={p} className={`${btnBase} ${p === page ? btnActive : btnInactive}`} onClick={() => onPage(p as number)}>{p}</button>
        )}
        <button className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`} onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Berikutnya">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
        </button>
        <button className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`} onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Halaman terakhir">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>last_page</span>
        </button>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

interface RowProps {
  transaction:    Transaction
  even:           boolean
  showActions:    boolean
  isBendahara:    boolean
  canApprove:     boolean
  role:           string
  submitting:     boolean
  approving:      boolean
  rejecting:      boolean
  showCheckbox:   boolean
  checked:        boolean
  isPenerimaan:   boolean
  accountMap:     Record<string, DbBankAccount>
  onToggleCheck?: () => void
  onSubmit:       (id: string) => void
  onApprove:      (id: string) => void
  onReject:       (id: string) => void
  onEdit:         (tx: Transaction) => void
  onDelete:       (tx: Transaction) => void
}

function TransactionRow({
  transaction: t, even,
  showActions, isBendahara, canApprove, role,
  submitting, approving, rejecting,
  showCheckbox, checked, isPenerimaan, accountMap, onToggleCheck,
  onSubmit, onApprove, onReject, onEdit, onDelete,
}: RowProps) {
  const missingAccount = isPenerimaan && !t.destinationAccountId
  const account = isPenerimaan && t.destinationAccountId ? accountMap[t.destinationAccountId] : null

  return (
    <TableRow even={even}>
      {showCheckbox && (
        <TableCell align="center">
          {onToggleCheck
            ? <input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer" checked={checked} onChange={onToggleCheck} />
            : <span className="w-4 h-4 block" />
          }
        </TableCell>
      )}
      <TableCell>
        <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.85)' }}>{formatTanggal(t.tanggal)}</span>
      </TableCell>
      <TableCell>
        <span className="text-xs font-medium font-body" style={{ color: '#9B6DFF' }}>{t.nomorBukti}</span>
      </TableCell>
      <TableCell>
        <div>
          <span className="text-sm font-body" style={{ color: '#e8eaf0' }}>{t.deskripsi}</span>
          {t.status === 'ditolak' && t.rejectionNote && (
            <p className="text-xs font-body mt-0.5 italic" style={{ color: '#f87171' }}>Catatan: {t.rejectionNote}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.85)' }}>{t.kategori}</span>
      </TableCell>

      {/* Kolom rekening bank — hanya BPN */}
      {isPenerimaan && (
        <TableCell>
          {missingAccount ? (
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#f87171' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>warning</span>
              Belum diisi
            </span>
          ) : account ? (
            <div>
              <span className="text-xs font-medium" style={{ color: 'rgba(232,234,240,0.9)' }}>{account.bank_name}</span>
              <p className="text-xs font-mono" style={{ color: 'rgba(232,234,240,0.6)' }}>{account.account_number}</p>
            </div>
          ) : (
            <span className="text-xs" style={{ color: 'rgba(232,234,240,0.3)' }}>—</span>
          )}
        </TableCell>
      )}

      <TableCell align="right">
        <span
          className="font-data font-medium tabular-nums tracking-financial text-sm"
          style={{ color: t.type === 'penerimaan' ? '#4ade80' : '#e8eaf0' }}
        >
          {t.type === 'penerimaan' ? '+' : '-'}{formatRupiah(t.nominal)}
        </span>
      </TableCell>
      <TableCell align="center">
        <StatusBadge status={t.status} />
      </TableCell>
      {showActions && (
        <TableCell align="center">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {isBendahara && t.status === 'pending' && (
              <>
                <Button variant="ghost" size="sm" icon="edit" className="!text-[#86efac] hover:bg-[#86efac]/10" onClick={() => onEdit(t)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" icon="send" disabled={submitting} className="!text-[#86efac] hover:bg-[#86efac]/10" onClick={() => onSubmit(t.id)}>
                  Ajukan
                </Button>
              </>
            )}
            {isBendahara && t.status === 'ditolak' && (
              <Button variant="ghost" size="sm" icon="edit" className="!text-[#86efac] hover:bg-[#86efac]/10" onClick={() => onEdit(t)}>
                Edit
              </Button>
            )}
            {((isBendahara && (t.status === 'pending' || t.status === 'ditolak')) ||
              (role === 'admin' && t.status !== 'diajukan')) && (
              <Button variant="ghost" size="sm" icon="delete" className="!text-[#fca5a5] hover:bg-[#fca5a5]/10" onClick={() => onDelete(t)}>
                Hapus
              </Button>
            )}
            {canApprove && t.status === 'diajukan' && (
              <>
                <Button variant="ghost" size="sm" icon="check_circle" disabled={approving} className="!text-[#4ade80]" onClick={() => onApprove(t.id)}>
                  Setujui
                </Button>
                <Button variant="ghost" size="sm" icon="cancel" disabled={rejecting} className="!text-[#f87171]" onClick={() => onReject(t.id)}>
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
