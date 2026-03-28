import { useState, useEffect } from 'react'
import { Card }          from '../../components/ui/Card'
import { Button }        from '../../components/ui/Button'
import { Modal }         from '../../components/ui/Modal'
import { PageContainer } from '../../components/layout/PageContainer'
import { useRekonsiliasi } from '../../hooks/useRekonsiliasi'
import { useAppContext } from '../../context/AppContext'
import { formatRupiah, formatTanggal } from '../../lib/formatters'

const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

export function RekonsiliasiPage() {
  const { tahunAnggaran } = useAppContext()
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const { data, loading, load, addBankStatement, deleteBankStatement } = useRekonsiliasi(bulan)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ statementDate: '', description: '', debit: '', credit: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    setError(null)
    setSaving(true)
    const err = await addBankStatement({
      statementDate: form.statementDate,
      description:   form.description,
      debit:         Number(form.debit) || 0,
      credit:        Number(form.credit) || 0,
    })
    setSaving(false)
    if (err) { setError(err); return }
    setModalOpen(false)
    setForm({ statementDate: '', description: '', debit: '', credit: '' })
  }

  const sesuai = data && Math.abs(data.selisih) < 1

  return (
    <PageContainer
      title="Rekonsiliasi Bank"
      actions={
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2">
            <span className="text-xs text-on-surface-variant font-body">Bulan:</span>
            <select
              className="text-sm font-medium text-on-surface bg-transparent outline-none font-body cursor-pointer"
              value={bulan}
              onChange={e => setBulan(Number(e.target.value))}
            >
              {BULAN.map((b, i) => (
                <option key={b} value={i + 1}>{b} {tahunAnggaran}</option>
              ))}
            </select>
          </div>
          <Button icon="add" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Input Rekening Koran
          </Button>
        </div>
      }
    >
      {loading && (
        <div className="text-sm text-on-surface-variant font-body mb-4 animate-pulse">Memuat data...</div>
      )}

      {/* Saldo Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Saldo BKU', value: data?.bkuSaldo ?? 0, icon: 'menu_book' },
          { label: 'Saldo Bank', value: data?.bankSaldo ?? 0, icon: 'account_balance' },
          { label: 'Selisih', value: Math.abs(data?.selisih ?? 0), icon: 'balance', isSelisih: true },
        ].map(item => (
          <Card key={item.label} accent padding="md">
            <div className="flex items-center gap-3">
              <div className={[
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'isSelisih' in item && item.isSelisih
                  ? (sesuai ? 'bg-primary-fixed/40' : 'bg-error-container')
                  : 'bg-emerald-gradient',
              ].join(' ')}>
                <span
                  className={[
                    'material-symbols-outlined text-[1.1rem]',
                    'isSelisih' in item && item.isSelisih
                      ? (sesuai ? 'text-primary' : 'text-error')
                      : 'text-on-primary',
                  ].join(' ')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {item.icon}
                </span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-body">{item.label}</p>
                <p className="text-lg font-bold text-on-surface font-headline tabular-nums tracking-financial">
                  {formatRupiah(item.value)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* BKU */}
        <Card padding="sm">
          <h3 className="text-sm font-semibold text-on-surface font-headline px-4 py-3">
            BKU — Transaksi Terverifikasi
          </h3>
          {(data?.bkuRows ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant font-body text-center">Tidak ada data</p>
          ) : (
            <table className="w-full text-xs font-body">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Tanggal','Uraian','Penerimaan','Pengeluaran'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-on-surface-variant uppercase tracking-label font-medium text-[0.65rem]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.bkuRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                    <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{formatTanggal(row.tanggal)}</td>
                    <td className="px-3 py-2.5 text-on-surface max-w-[140px] truncate">{row.deskripsi}</td>
                    <td className="px-3 py-2.5 text-right text-primary font-data tabular-nums">
                      {row.masuk > 0 ? formatRupiah(row.masuk) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-on-surface font-data tabular-nums">
                      {row.keluar > 0 ? formatRupiah(row.keluar) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Bank */}
        <Card padding="sm">
          <h3 className="text-sm font-semibold text-on-surface font-headline px-4 py-3">
            Rekening Koran Bank
          </h3>
          {(data?.bankRows ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant font-body text-center">
              Belum ada data rekening koran.
              <button
                className="text-primary underline ml-1 cursor-pointer"
                onClick={() => setModalOpen(true)}
              >
                Input sekarang
              </button>
            </p>
          ) : (
            <table className="w-full text-xs font-body">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Tanggal','Keterangan','Debit','Kredit',''].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-on-surface-variant uppercase tracking-label font-medium text-[0.65rem]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.bankRows.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                    <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{formatTanggal(row.statementDate)}</td>
                    <td className="px-3 py-2.5 text-on-surface max-w-[120px] truncate">{row.description}</td>
                    <td className="px-3 py-2.5 text-right text-on-surface font-data tabular-nums">
                      {row.debit > 0 ? formatRupiah(row.debit) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-primary font-data tabular-nums">
                      {row.credit > 0 ? formatRupiah(row.credit) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        className="text-error hover:underline text-[0.65rem]"
                        onClick={() => deleteBankStatement(row.id)}
                      >
                        hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Status rekonsiliasi */}
      {data && (
        <div className="mt-4 flex justify-end">
          <div className={[
            'rounded-xl px-5 py-3 flex items-center gap-3',
            sesuai ? 'bg-primary-fixed/30' : 'bg-error-container',
          ].join(' ')}>
            <span className={[
              'material-symbols-outlined text-[1.2rem]',
              sesuai ? 'text-primary' : 'text-error',
            ].join(' ')}>
              {sesuai ? 'check_circle' : 'warning'}
            </span>
            <p className={['text-sm font-medium font-body', sesuai ? 'text-primary' : 'text-error'].join(' ')}>
              {sesuai
                ? 'Saldo BKU dan Bank sesuai — Rp 0 selisih'
                : `Terdapat selisih ${formatRupiah(Math.abs(data.selisih))} — periksa kembali transaksi`}
            </p>
          </div>
        </div>
      )}

      {/* Modal input rekening koran */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Input Rekening Koran">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Tanggal</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.statementDate}
              onChange={e => setForm(f => ({ ...f, statementDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Keterangan</label>
            <input
              type="text"
              placeholder="Deskripsi transaksi bank..."
              className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Debit (keluar dari bank)</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.debit}
                onChange={e => setForm(f => ({ ...f, debit: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Kredit (masuk ke bank)</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.credit}
                onChange={e => setForm(f => ({ ...f, credit: e.target.value }))}
              />
            </div>
          </div>
          {error && <p className="text-sm text-error font-body">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={saving || !form.statementDate || !form.description}
              onClick={handleAdd}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
