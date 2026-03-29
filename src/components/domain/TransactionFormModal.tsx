import { useState, useEffect } from 'react'
import { Modal }                from '../ui/Modal'
import { Button }               from '../ui/Button'
import { useWorkUnits }         from '../../hooks/useWorkUnits'
import { usePeriods }           from '../../hooks/usePeriods'
import { useMutateTransaction } from '../../hooks/useMutateTransaction'
import { useBankAccounts }      from '../../hooks/useBankAccounts'
import type { KategoriPenerimaan, KategoriPengeluaran } from '../../types'

// ── Field helpers ──────────────────────────────────────────────────────────────

const KATEGORI_PENERIMAAN: KategoriPenerimaan[] = [
  'UKT',
  'PNBP Lainnya',
  'Dana Penelitian',
  'Transfer BLU',
]

const KATEGORI_PENGELUARAN: KategoriPengeluaran[] = [
  'Honorarium',
  'Belanja ATK',
  'Perjalanan Dinas',
  'Langganan Jurnal',
  'Pemeliharaan',
  'Pencairan UP',
  'Pencairan TUP',
]

function formatRupiah(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

function parseRupiah(formatted: string): number {
  return Number(formatted.replace(/\D/g, '')) || 0
}

// ── Props ──────────────────────────────────────────────────────────────────────

import type { Transaction } from '../../types'

interface TransactionFormModalProps {
  open:      boolean
  onClose:   () => void
  txType:    'IN' | 'OUT'
  onSuccess: () => void
  editTx?:   Transaction   // jika diisi → mode edit
}

interface FormState {
  transaction_date:  string
  no_bukti:          string
  description:       string
  kode_rekening:     string
  amountFormatted:   string
  work_unit_id:      string
  bank_account_id:   string
}

const emptyForm = (): FormState => ({
  transaction_date:  new Date().toISOString().slice(0, 10),
  no_bukti:          '',
  description:       '',
  kode_rekening:     '',
  amountFormatted:   '',
  work_unit_id:      '',
  bank_account_id:   '',
})

// ── Component ──────────────────────────────────────────────────────────────────

export function TransactionFormModal({
  open,
  onClose,
  txType,
  onSuccess,
  editTx,
}: TransactionFormModalProps) {
  const { workUnits } = useWorkUnits()
  const { activePeriod } = usePeriods()
  const { insertTransaction, updateTransaction, saving, error } = useMutateTransaction()
  const { accounts: bankAccounts } = useBankAccounts(true)

  const [form, setForm]           = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const isEdit = !!editTx

  // Reset / pre-fill form setiap kali modal dibuka
  useEffect(() => {
    if (!open) return
    if (editTx) {
      setForm({
        transaction_date:  editTx.tanggal,
        no_bukti:          editTx.nomorBukti === '-' ? '' : editTx.nomorBukti,
        description:       editTx.deskripsi,
        kode_rekening:     editTx.kategori,
        amountFormatted:   editTx.nominal.toLocaleString('id-ID'),
        work_unit_id:      editTx.unitId ?? '',
        bank_account_id:   editTx.sourceAccountId ?? '',
      })
    } else {
      setForm(emptyForm())
    }
    setFieldErrors({})
  }, [open, editTx])

  const isBPN   = txType === 'IN'
  const title   = isEdit
    ? (isBPN ? 'Edit BPN — Bukti Penerimaan' : 'Edit BPK — Bukti Pengeluaran')
    : (isBPN ? 'Input BPN — Bukti Penerimaan' : 'Input BPK — Bukti Pengeluaran')
  const kategoriList = isBPN ? KATEGORI_PENERIMAAN : KATEGORI_PENGELUARAN

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.transaction_date) errs.transaction_date = 'Tanggal wajib diisi'
    if (!form.description.trim()) errs.description    = 'Uraian wajib diisi'
    if (!form.kode_rekening)      errs.kode_rekening  = 'Kategori wajib dipilih'
    if (parseRupiah(form.amountFormatted) <= 0) errs.amountFormatted = 'Nominal harus lebih dari 0'
    if (!form.bank_account_id) errs.bank_account_id = 'Rekening bank wajib dipilih'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      type:              txType,
      transaction_date:  form.transaction_date,
      no_bukti:          form.no_bukti,
      description:       form.description,
      kode_rekening:     form.kode_rekening,
      amount:            parseRupiah(form.amountFormatted),
      work_unit_id:      form.work_unit_id || null,
      period_id:         activePeriod?.id ?? null,
      source_account_id: form.bank_account_id || null,
    }

    const ok = isEdit && editTx
      ? await updateTransaction(editTx.id, payload)
      : await insertTransaction(payload)
    if (ok) { onSuccess(); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="md">
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 py-5 space-y-4">

          {/* Row: Tanggal + Nomor Bukti */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tanggal" error={fieldErrors.transaction_date} required>
              <input
                type="date"
                value={form.transaction_date}
                onChange={e => set('transaction_date', e.target.value)}
                className={inputCls(!!fieldErrors.transaction_date)}
              />
            </Field>

            <Field label="Nomor Bukti" hint="Kosongkan untuk auto-generate">
              <input
                type="text"
                placeholder={isBPN ? 'BPN-001' : 'BPK-001'}
                value={form.no_bukti}
                onChange={e => set('no_bukti', e.target.value)}
                className={inputCls(false)}
              />
            </Field>
          </div>

          {/* Uraian */}
          <Field label="Uraian / Deskripsi" error={fieldErrors.description} required>
            <textarea
              rows={2}
              placeholder="Contoh: Penerimaan UKT Semester Genap 2025/2026"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className={inputCls(!!fieldErrors.description) + ' resize-none'}
            />
          </Field>

          {/* Row: Kategori + Nominal */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kategori / Kode Rekening" error={fieldErrors.kode_rekening} required>
              <select
                value={form.kode_rekening}
                onChange={e => set('kode_rekening', e.target.value)}
                className={inputCls(!!fieldErrors.kode_rekening)}
              >
                <option value="">— Pilih Kategori —</option>
                {kategoriList.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </Field>

            <Field label="Nominal (Rp)" error={fieldErrors.amountFormatted} required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm select-none">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.amountFormatted}
                  onChange={e => set('amountFormatted', formatRupiah(e.target.value))}
                  className={inputCls(!!fieldErrors.amountFormatted) + ' pl-9 text-right'}
                />
              </div>
            </Field>
          </div>

          {/* Rekening Bank — wajib untuk BPN dan BPK */}
          <Field
            label={isBPN ? 'Rekening Bank Penerimaan' : 'Rekening Bank Pengeluaran'}
            error={fieldErrors.bank_account_id}
            required
          >
            <select
              value={form.bank_account_id}
              onChange={e => set('bank_account_id', e.target.value)}
              className={inputCls(!!fieldErrors.bank_account_id)}
            >
              <option value="">— Pilih Rekening Bank —</option>
              {bankAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} — {a.account_number} a.n. {a.account_name}
                </option>
              ))}
            </select>
          </Field>

          {/* Unit Kerja */}
          <Field label="Unit Kerja" hint="Opsional — kosongkan untuk transaksi pusat">
            <select
              value={form.work_unit_id}
              onChange={e => set('work_unit_id', e.target.value)}
              className={inputCls(false)}
            >
              <option value="">— Pusat (tanpa unit kerja) —</option>
              {workUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>

          {/* Periode aktif (read-only info) */}
          {activePeriod && (
            <div className="text-xs text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
              Periode aktif:{' '}
              <span className="font-semibold text-on-surface">
                {activePeriod.code ?? `${activePeriod.month}/${activePeriod.year}`}
              </span>
            </div>
          )}

          {/* Error dari server */}
          {error && (
            <div className="text-sm text-error bg-error-container rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving} icon={saving ? undefined : 'save'}>
            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Simpan sebagai Draft'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  error,
  hint,
  required,
}: {
  label:     string
  children:  React.ReactNode
  error?:    string
  hint?:     string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-on-surface-variant">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-error">{error}</span>}
      {!error && hint && <span className="text-xs text-on-surface-variant/70">{hint}</span>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return [
    'w-full px-3 py-2 rounded-xl text-sm bg-surface-container',
    'border border-outline-variant text-on-surface',
    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
    'transition-colors placeholder:text-on-surface-variant/50',
    hasError ? 'border-error focus:ring-error/30 focus:border-error' : '',
  ].join(' ')
}
