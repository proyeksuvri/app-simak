import { useState } from 'react'
import { Card }           from '../../components/ui/Card'
import { Button }         from '../../components/ui/Button'
import { StatusBadge }    from '../../components/ui/Badge'
import { Modal }          from '../../components/ui/Modal'
import { EmptyState }     from '../../components/ui/EmptyState'
import { PageContainer }  from '../../components/layout/PageContainer'
import { useUPTUP, type JenisUPTUP } from '../../hooks/useUPTUP'
import { useWorkUnits }   from '../../hooks/useWorkUnits'
import { usePeriods }     from '../../hooks/usePeriods'
import { useAppContext }  from '../../context/AppContext'
import { supabase }       from '../../lib/supabase'
import { formatRupiah, formatTanggal } from '../../lib/formatters'

interface UPForm {
  tanggal:    string
  jenis:      JenisUPTUP
  unitId:     string
  nominal:    string
  deskripsi:  string
  noBukti:    string
}

const DEFAULT_FORM: UPForm = {
  tanggal:   new Date().toISOString().split('T')[0]!,
  jenis:     'UP',
  unitId:    '',
  nominal:   '',
  deskripsi: '',
  noBukti:   '',
}

export function UPTUPPage() {
  const { items, loading, refetch } = useUPTUP()
  const { workUnits } = useWorkUnits()
  const { activePeriod } = usePeriods()
  const { currentUser } = useAppContext()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState<UPForm>(DEFAULT_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const canInput = currentUser.role === 'bendahara_induk'
    || currentUser.role === 'bendahara_pembantu'
    || currentUser.role === 'admin'

  const openModal = () => {
    setForm(DEFAULT_FORM)
    setError(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nominal || !form.deskripsi || !form.noBukti) {
      setError('No. Bukti, deskripsi, dan nominal wajib diisi.')
      return
    }
    if (!activePeriod) {
      setError('Tidak ada periode aktif. Hubungi admin.')
      return
    }
    setSaving(true)
    setError(null)

    const kode = form.jenis === 'TUP' ? 'Pencairan TUP' : 'Pencairan UP'

    const { error: err } = await supabase.from('transactions').insert({
      type:             'OUT',
      status:           'DRAFT',
      transaction_date: form.tanggal,
      amount:           Number(form.nominal),
      description:      form.deskripsi,
      no_bukti:         form.noBukti,
      kode_rekening:    kode,
      work_unit_id:     form.unitId || null,
      period_id:        activePeriod.id,
      tenant_id:        activePeriod.tenant_id,
      created_by:       (await supabase.auth.getUser()).data.user?.id,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    refetch()
  }

  return (
    <PageContainer
      title="Pengajuan UP / TUP"
      actions={
        canInput && (
          <Button icon="add" variant="primary" size="sm" onClick={openModal}>
            Ajukan UP/TUP
          </Button>
        )
      }
    >
      <Card padding="sm">
        {loading ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">Memuat data...</p>
        ) : items.length === 0 ? (
          <EmptyState icon="request_quote" title="Belum ada pengajuan UP/TUP" message="Pengajuan akan muncul di sini setelah diinput." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Tanggal','No. Bukti','Jenis','Unit','Deskripsi','Nominal','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-label text-on-surface-variant text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                    <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                      {formatTanggal(item.tanggal)}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-primary">{item.nomorBukti}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container">
                        {item.jenis}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface text-xs">{item.unitNama ?? '—'}</td>
                    <td className="px-4 py-3 text-on-surface max-w-[200px] truncate">{item.deskripsi}</td>
                    <td className="px-4 py-3 text-right font-data font-medium tabular-nums tracking-financial text-on-surface">
                      {formatRupiah(item.nominal)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Pengajuan UP / TUP">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Tanggal</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Jenis</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.jenis}
                onChange={e => setForm(f => ({ ...f, jenis: e.target.value as JenisUPTUP }))}
              >
                <option value="UP">UP (Uang Persediaan)</option>
                <option value="TUP">TUP (Tambahan Uang Persediaan)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">No. Bukti</label>
            <input
              type="text"
              placeholder="BPK-001"
              className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.noBukti}
              onChange={e => setForm(f => ({ ...f, noBukti: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Unit Kerja</label>
            <select
              className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.unitId}
              onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
            >
              <option value="">— Pusat —</option>
              {workUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Deskripsi</label>
            <input
              type="text"
              placeholder="Pencairan UP Semester I FTIK..."
              className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.deskripsi}
              onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant font-body block mb-1">Nominal (Rp)</label>
            <input
              type="number"
              placeholder="0"
              className="w-full px-3 py-2 rounded-xl border border-outline bg-surface text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.nominal}
              onChange={e => setForm(f => ({ ...f, nominal: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-error font-body">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? 'Menyimpan...' : 'Simpan Draft'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
