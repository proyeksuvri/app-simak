import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from '../../components/ui/Table/Table'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { PageContainer } from '../../components/layout/PageContainer'
import { useAppContext } from '../../context/AppContext'
import { useUsers } from '../../hooks/useUsers'
import { useManagePeriods } from '../../hooks/useManagePeriods'
import { useUserManagement, type CreateUserPayload, type EditUserPayload, type UserRole, type BendaharaKategori } from '../../hooks/useUserManagement'
import { useWorkUnits, useManageWorkUnits } from '../../hooks/useWorkUnits'
import { useBankAccounts, useManageBankAccounts, type BankAccountInput } from '../../hooks/useBankAccounts'
import { useRevenueCategories, useManageRevenueCategories } from '../../hooks/useRevenueCategories'
import { useBusinessUnits, useManageBusinessUnits } from '../../hooks/useBusinessUnits'
import { useFundingSources, useManageFundingSources } from '../../hooks/useFundingSources'
import { useSumberPendapatanBisnis, useManageSumberPendapatanBisnis } from '../../hooks/useSumberPendapatanBisnis'
import { USER_ROLE_LABELS } from '../../types'

type PengaturanTab = 'profil' | 'periode' | 'user' | 'rekening' | 'kategori' | 'mekanisme' | 'jenis' | 'sumber' | 'unit-kerja'

export function PengaturanPage() {
  const { currentUser, tahunAnggaran } = useAppContext()
  const location = useLocation()
  const isAdmin = currentUser.role === 'admin'

  const routeTab = useMemo<PengaturanTab>(() => {
    if (location.pathname.includes('/users')) return 'user'
    if (location.pathname.includes('/units')) return 'periode'
    return 'profil'
  }, [location.pathname])

  const [manualTab, setManualTab] = useState<PengaturanTab | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [periodActionMsg, setPeriodActionMsg] = useState<string | null>(null)
  const [periodActionErr, setPeriodActionErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const usersState = useUsers()
  const periodsState = useManagePeriods()

  const activeTab = useMemo<PengaturanTab>(() => {
    const candidate = manualTab ?? routeTab
    if (!isAdmin && candidate !== 'profil') return 'profil'
    return candidate
  }, [manualTab, routeTab, isAdmin])

  const handleOpenPeriod = async () => {
    setPeriodActionMsg(null)
    setPeriodActionErr(null)
    setSaving(true)
    const err = await periodsState.openPeriod(selectedMonth)
    if (err) setPeriodActionErr(err)
    else setPeriodActionMsg(`Periode ${periodsState.BULAN[selectedMonth]} ${tahunAnggaran} berhasil dibuka.`)
    setSaving(false)
  }

  const handleClosePeriod = async (periodId: string, month: number) => {
    setPeriodActionMsg(null)
    setPeriodActionErr(null)
    setSaving(true)
    const err = await periodsState.closePeriod(periodId)
    if (err) setPeriodActionErr(err)
    else setPeriodActionMsg(`Periode ${periodsState.BULAN[month]} ${tahunAnggaran} berhasil ditutup.`)
    setSaving(false)
  }

  return (
    <PageContainer title="Pengaturan">
      <div className="flex items-center gap-2 mb-4">
        <TabButton label="Profil" active={activeTab === 'profil'} onClick={() => setManualTab('profil')} />
        {isAdmin && (
          <>
            <TabButton label="Periode" active={activeTab === 'periode'} onClick={() => setManualTab('periode')} />
            <TabButton label="User" active={activeTab === 'user'} onClick={() => setManualTab('user')} />
            <TabButton label="Rekening Bank" active={activeTab === 'rekening'} onClick={() => setManualTab('rekening')} />
            <TabButton label="Kategori Penerimaan" active={activeTab === 'kategori'} onClick={() => setManualTab('kategori')} />
            <TabButton label="Mekanisme Bisnis" active={activeTab === 'mekanisme'} onClick={() => setManualTab('mekanisme')} />
            <TabButton label="Jenis Pendapatan" active={activeTab === 'jenis'} onClick={() => setManualTab('jenis')} />
            <TabButton label="Sumber Pendapatan Bisnis" active={activeTab === 'sumber'} onClick={() => setManualTab('sumber')} />
            <TabButton label="Unit Kerja" active={activeTab === 'unit-kerja'} onClick={() => setManualTab('unit-kerja')} />
          </>
        )}
      </div>

      {activeTab === 'profil' && (
        <div className="grid grid-cols-2 gap-4">
          <Card padding="md">
            <h3 className="text-sm font-semibold text-on-surface font-headline mb-4">Profil Pengguna</h3>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-gradient flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-on-primary font-headline">
                  {currentUser.nama.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-semibold text-on-surface font-body">{currentUser.nama}</p>
                <p className="text-xs text-on-surface-variant font-body">{USER_ROLE_LABELS[currentUser.role]}</p>
                <p className="text-xs text-on-surface-variant font-body mt-0.5">{currentUser.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'NIP', value: currentUser.nip || '-' },
                { label: 'Role', value: USER_ROLE_LABELS[currentUser.role] },
                { label: 'Tahun Anggaran Aktif', value: String(tahunAnggaran) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <span className="text-xs text-on-surface-variant font-body">{item.label}</span>
                  <span className="text-sm font-medium text-on-surface font-body">{item.value}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-4 w-full" icon="edit" disabled>
              Edit Profil (Segera)
            </Button>
          </Card>

          <Card padding="md">
            <h3 className="text-sm font-semibold text-on-surface font-headline mb-4">Konfigurasi Sistem</h3>
            <div className="space-y-3">
              {[
                { label: 'Institusi', value: 'UIN Palopo' },
                { label: 'Jenis', value: 'BLU (Badan Layanan Umum)' },
                { label: 'Metode Akuntansi', value: 'Cash Basis' },
                { label: 'Tahun Anggaran', value: `${tahunAnggaran}` },
                { label: 'Versi Aplikasi', value: 'v1.0.0' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <span className="text-xs text-on-surface-variant font-body">{item.label}</span>
                  <span className="text-sm font-medium text-on-surface font-body">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'periode' && isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <Card padding="md">
            <h3 className="text-sm font-semibold text-on-surface font-headline mb-4">Buka Periode</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-on-surface-variant font-body mb-1 block">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container text-sm text-on-surface outline-none"
                >
                  {periodsState.BULAN.map((label, idx) => {
                    if (!label) return null
                    return <option key={idx} value={idx}>{label}</option>
                  })}
                </select>
              </div>
              <Button size="sm" icon="event_available" onClick={handleOpenPeriod} disabled={saving}>
                {saving ? 'Memproses...' : 'Buka Periode'}
              </Button>
            </div>

            {periodActionMsg && (
              <p className="mt-3 text-sm text-primary font-body">{periodActionMsg}</p>
            )}
            {periodActionErr && (
              <p className="mt-3 text-sm text-error font-body">{periodActionErr}</p>
            )}
          </Card>

          <Card padding="md">
            <h3 className="text-sm font-semibold text-on-surface font-headline mb-4">Periode Tahun {tahunAnggaran}</h3>
            {periodsState.loading ? (
              <p className="text-sm text-on-surface-variant font-body">Memuat periode...</p>
            ) : periodsState.periods.length === 0 ? (
              <p className="text-sm text-on-surface-variant font-body">Belum ada periode untuk tahun ini.</p>
            ) : (
              <div className="space-y-2">
                {periodsState.periods.map(period => (
                  <div key={period.id} className="flex items-center justify-between bg-surface-container rounded-xl px-3 py-2">
                    <div>
                      <p className="text-sm text-on-surface font-body">{period.code || `${periodsState.BULAN[period.month]}-${period.year}`}</p>
                      <p className="text-xs text-on-surface-variant font-body">
                        {period.isClosed ? 'Status: Ditutup' : 'Status: Aktif'}
                      </p>
                    </div>
                    {!period.isClosed && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="lock"
                        disabled={saving}
                        onClick={() => handleClosePeriod(period.id, period.month)}
                      >
                        Tutup
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'user' && isAdmin && (
        <UserTab usersState={usersState} currentUserId={currentUser.id} />
      )}

      {activeTab === 'rekening' && isAdmin && (
        <RekeningTab />
      )}

      {activeTab === 'kategori' && isAdmin && (
        <KategoriPenerimaanTab />
      )}

      {activeTab === 'mekanisme' && isAdmin && (
        <MekanismeBisnisTab />
      )}

      {activeTab === 'jenis' && isAdmin && (
        <JenisPendapatanTab />
      )}

      {activeTab === 'sumber' && isAdmin && (
        <SumberPendapatanBisnisTab />
      )}

      {activeTab === 'unit-kerja' && isAdmin && (
        <UnitKerjaTab />
      )}
    </PageContainer>
  )
}

function TabButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-xl text-xs font-medium font-body transition-colors',
        active
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

// ─── Tab Kategori Penerimaan ─────────────────────────────────────────────────

function KategoriPenerimaanTab() {
  const { categories, loading, refetch } = useRevenueCategories()
  const { createCategory, updateCategory, deleteCategory, saving, error } = useManageRevenueCategories()

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen,  setDelOpen]  = useState(false)

  const [addName,  setAddName]  = useState('')
  const [editId,   setEditId]   = useState('')
  const [editName, setEditName] = useState('')
  const [delId,    setDelId]    = useState('')
  const [delName,  setDelName]  = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 4000)
  }

  const openAdd = () => { setAddName(''); setFormError(null); setAddOpen(true) }

  const openEdit = (id: string, name: string) => {
    setEditId(id); setEditName(name); setFormError(null); setEditOpen(true)
  }

  const openDel = (id: string, name: string) => {
    setDelId(id); setDelName(name); setDelOpen(true)
  }

  const handleAdd = async () => {
    setFormError(null)
    if (!addName.trim()) { setFormError('Nama kategori wajib diisi.'); return }
    const duplicate = categories.some(c => c.name.toLowerCase() === addName.trim().toLowerCase())
    if (duplicate) { setFormError('Nama kategori sudah ada.'); return }
    const err = await createCategory(addName)
    if (err) { setFormError(err); return }
    setAddOpen(false)
    flash(`Kategori "${addName.trim()}" berhasil ditambahkan.`)
    refetch()
  }

  const handleEdit = async () => {
    setFormError(null)
    if (!editName.trim()) { setFormError('Nama kategori wajib diisi.'); return }
    const duplicate = categories.some(
      c => c.id !== editId && c.name.toLowerCase() === editName.trim().toLowerCase()
    )
    if (duplicate) { setFormError('Nama kategori sudah ada.'); return }
    const err = await updateCategory(editId, editName)
    if (err) { setFormError(err); return }
    setEditOpen(false)
    flash(`Kategori berhasil diperbarui.`)
    refetch()
  }

  const handleDelete = async () => {
    const err = await deleteCategory(delId)
    if (err) { setSuccess(null); return }
    setDelOpen(false)
    flash(`Kategori "${delName}" berhasil dihapus.`)
    refetch()
  }

  return (
    <>
      <Card padding="sm">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-on-surface font-headline">Kategori Penerimaan</h3>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              {categories.length} kategori terdaftar
            </p>
          </div>
          <Button variant="primary" size="sm" icon="add" onClick={openAdd}>
            Tambah Kategori
          </Button>
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-primary-fixed/30 text-sm text-primary font-body">
            {success}
          </div>
        )}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-error-container text-sm text-on-error-container font-body">
            {error}
          </div>
        )}

        {loading ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">Memuat...</p>
        ) : categories.length === 0 ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Belum ada kategori. Klik "Tambah Kategori" untuk menambahkan.
          </p>
        ) : (
          <table className="w-full text-sm font-body mt-1">
            <thead className="bg-surface-container-low">
              <tr>
                {['No', 'Nama Kategori', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-on-surface-variant uppercase tracking-label font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                  <td className="px-4 py-2.5 text-on-surface-variant text-xs w-12">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-on-surface font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                        label
                      </span>
                      {cat.name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                        disabled={saving}
                        onClick={() => openEdit(cat.id, cat.name)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-error hover:underline disabled:opacity-50"
                        disabled={saving}
                        onClick={() => openDel(cat.id, cat.name)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Kategori Penerimaan">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Kategori" icon="label">
            <input
              type="text"
              placeholder="Contoh: Dana Hibah"
              className={inputCls}
              value={addName}
              onChange={e => { setAddName(e.target.value); setFormError(null) }}
              autoFocus
            />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleAdd}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Kategori Penerimaan">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Kategori" icon="label">
            <input
              type="text"
              className={inputCls}
              value={editName}
              onChange={e => { setEditName(e.target.value); setFormError(null) }}
              autoFocus
            />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleEdit}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Kategori">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-surface-variant font-body">
            Yakin ingin menghapus kategori{' '}
            <span className="font-semibold text-on-surface">"{delName}"</span>?
            Transaksi yang sudah menggunakan kategori ini tidak akan terpengaruh.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDelOpen(false)}>Batal</Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-error text-on-error hover:bg-error/90"
              disabled={saving}
              onClick={handleDelete}
            >
              {saving ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Tab Jenis Pendapatan ────────────────────────────────────────────────────

// ── Data BAS Pendapatan BLU (Bagan Akun Standar) ────────────────────────────
const BAS_PENDAPATAN_BLU: { group: string; items: { kode: string; uraian: string }[] }[] = [
  {
    group: 'Pendapatan Penyediaan Barang dan Jasa (42411)',
    items: [
      { kode: '424111', uraian: 'Pendapatan Jasa Pelayanan Rumah Sakit' },
      { kode: '424112', uraian: 'Pendapatan Jasa Pelayanan Pendidikan' },
      { kode: '424113', uraian: 'Pendapatan Jasa Pelayanan Tenaga, Pekerjaan, Informasi, Pelatihan dan Teknologi' },
      { kode: '424114', uraian: 'Pendapatan Jasa Pencetakan' },
      { kode: '424115', uraian: 'Pendapatan Jasa Bandar Udara, Kepelabuhan dan Kenavigasian' },
      { kode: '424116', uraian: 'Pendapatan Jasa Penyelenggaraan Telekomunikasi' },
      { kode: '424117', uraian: 'Pendapatan Jasa Pelayanan Pemasaran' },
      { kode: '424118', uraian: 'Pendapatan Penyediaan Barang' },
      { kode: '424119', uraian: 'Pendapatan Jasa Penyediaan Barang dan Jasa Lainnya' },
    ],
  },
  {
    group: 'Pendapatan dari Pengelolaan Wilayah/Kawasan Tertentu (42412)',
    items: [
      { kode: '424121', uraian: 'Pendapatan Pengelolaan Kawasan Otorita' },
      { kode: '424122', uraian: 'Pendapatan Pengelolaan Kawasan Pengembangan Ekonomi Terpadu' },
      { kode: '424123', uraian: 'Pendapatan Pengelolaan Fasilitas Umum Milik Pemerintah' },
      { kode: '424129', uraian: 'Pendapatan Pengelolaan Kawasan Lainnya' },
    ],
  },
  {
    group: 'Pengelolaan Dana Khusus untuk Masyarakat (42413)',
    items: [
      { kode: '424131', uraian: 'Pendapatan Program Dana Penjaminan' },
      { kode: '424132', uraian: 'Pendapatan Program Dana Penjaminan Syariah' },
      { kode: '424133', uraian: 'Pendapatan Program Modal Ventura' },
      { kode: '424134', uraian: 'Pendapatan Program Dana Bergulir Sektoral' },
      { kode: '424135', uraian: 'Pendapatan Program Dana Bergulir Syariah' },
      { kode: '424136', uraian: 'Pendapatan Investasi' },
      { kode: '424137', uraian: 'Pendapatan Pengelolaan Dana Pengembangan Pendidikan Nasional' },
      { kode: '424138', uraian: 'Pendapatan Dana Perkebunan Kelapa Sawit' },
      { kode: '424139', uraian: 'Pendapatan Pengelolaan Dana Khusus Lainnya' },
    ],
  },
  {
    group: 'Pendapatan dari Pengelolaan BMN (42414)',
    items: [
      { kode: '424141', uraian: 'Pendapatan dari Pengelolaan BMN pada Pengelola Barang' },
    ],
  },
  {
    group: 'Pendapatan Hibah Terikat - Uang (42421)',
    items: [
      { kode: '424211', uraian: 'Pendapatan Hibah Terikat Dalam Negeri-Perorangan - Uang' },
      { kode: '424212', uraian: 'Pendapatan Hibah Terikat Dalam Negeri-Lembaga/Badan Usaha - Uang' },
      { kode: '424213', uraian: 'Pendapatan Hibah Terikat Dalam Negeri-Pemda - Uang' },
      { kode: '424214', uraian: 'Pendapatan Hibah Terikat Luar Negeri-Perorangan - Uang' },
      { kode: '424215', uraian: 'Pendapatan Hibah Terikat Luar Negeri-Lembaga/Badan Usaha - Uang' },
      { kode: '424216', uraian: 'Pendapatan Hibah Terikat Luar Negeri-Negara - Uang' },
      { kode: '424219', uraian: 'Pendapatan Hibah Terikat Lainnya - Uang' },
    ],
  },
  {
    group: 'Pendapatan Hibah Tidak Terikat - Uang (42422)',
    items: [
      { kode: '424221', uraian: 'Pendapatan Hibah Tidak Terikat Dalam Negeri-Perorangan - Uang' },
      { kode: '424222', uraian: 'Pendapatan Hibah Tidak Terikat Dalam Negeri-Lembaga/Badan Usaha - Uang' },
      { kode: '424223', uraian: 'Pendapatan Hibah Tidak Terikat Dalam Negeri-Pemda - Uang' },
      { kode: '424224', uraian: 'Pendapatan Hibah Tidak Terikat Luar Negeri-Perorangan - Uang' },
      { kode: '424225', uraian: 'Pendapatan Hibah Tidak Terikat Luar Negeri-Lembaga/Badan Usaha - Uang' },
      { kode: '424226', uraian: 'Pendapatan Hibah Tidak Terikat Luar Negeri-Negara - Uang' },
      { kode: '424229', uraian: 'Pendapatan Hibah Tidak Terikat Lainnya - Uang' },
    ],
  },
  {
    group: 'Pendapatan Hasil Kerja Sama BLU (42431)',
    items: [
      { kode: '424311', uraian: 'Pendapatan Hasil Kerja Sama Perorangan' },
      { kode: '424312', uraian: 'Pendapatan Hasil Kerja Sama Lembaga/Badan Usaha' },
      { kode: '424313', uraian: 'Pendapatan Hasil Kerja Sama Pemerintah Daerah' },
    ],
  },
  {
    group: 'Pendapatan dari Alokasi APBN (42441)',
    items: [
      { kode: '424411', uraian: 'Pendapatan dari Alokasi APBN' },
      { kode: '424421', uraian: 'Pendapatan dari Pelayanan BLU dalam satu K/L' },
      { kode: '424422', uraian: 'Pendapatan dari Pelayanan BLU luar K/L pembina' },
    ],
  },
  {
    group: 'Pendapatan BLU Lainnya (42491)',
    items: [
      { kode: '424911', uraian: 'Pendapatan Jasa Layanan Perbankan BLU' },
      { kode: '424912', uraian: 'Pendapatan Jasa Layanan Perbankan BLU yang dibatasi pengelolaannya' },
      { kode: '424913', uraian: 'Komisi/Potongan akibat Pengadaan Barang/Jasa BLU' },
      { kode: '424914', uraian: 'Pendapatan Selisih Kurs Terealisasi' },
      { kode: '424915', uraian: 'Penerimaan Kembali Belanja Barang Tahun Lalu' },
      { kode: '424916', uraian: 'Penerimaan Kembali Belanja Modal Tahun Lalu' },
      { kode: '424917', uraian: 'Pendapatan TGR' },
      { kode: '424919', uraian: 'Pendapatan Lain-lain BLU' },
    ],
  },
  {
    group: 'Pendapatan BLU dari Sewa (42492)',
    items: [
      { kode: '424921', uraian: 'Sewa Tanah' },
      { kode: '424922', uraian: 'Sewa Gedung' },
      { kode: '424923', uraian: 'Sewa Ruangan' },
      { kode: '424924', uraian: 'Sewa Peralatan dan Mesin' },
      { kode: '424925', uraian: 'Sewa Aset Tetap Lainnya' },
      { kode: '424929', uraian: 'Sewa Lainnya' },
    ],
  },
  {
    group: 'Pendapatan dari Penjualan BMN (42493)',
    items: [
      { kode: '424931', uraian: 'Penjualan Tanah' },
      { kode: '424932', uraian: 'Penjualan Gedung dan Bangunan' },
      { kode: '424933', uraian: 'Penjualan Peralatan dan Mesin' },
      { kode: '424934', uraian: 'Penjualan Aset Tetap Lainnya' },
      { kode: '424939', uraian: 'Penjualan BMN Lainnya' },
    ],
  },
  {
    group: 'Pendapatan dari Tukar Menukar BMN (42494)',
    items: [
      { kode: '424941', uraian: 'Tukar Menukar Tanah' },
      { kode: '424942', uraian: 'Tukar Menukar Gedung dan Bangunan' },
      { kode: '424943', uraian: 'Tukar Menukar Peralatan dan Mesin' },
      { kode: '424944', uraian: 'Tukar Menukar Jalan/Irigasi/Jaringan' },
      { kode: '424945', uraian: 'Tukar Menukar Aset Tetap Lainnya' },
      { kode: '424949', uraian: 'Tukar Menukar BMN Lainnya' },
    ],
  },
]

// Helper: cari uraian BAS dari kode
function getBasUraian(kode: string): string {
  for (const g of BAS_PENDAPATAN_BLU) {
    const item = g.items.find(i => i.kode === kode)
    if (item) return item.uraian
  }
  return ''
}

function JenisPendapatanTab() {
  const { fundingSources, loading, refetch } = useFundingSources()
  const { createFundingSource, updateFundingSource, deleteFundingSource, saving, error } = useManageFundingSources()

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen,  setDelOpen]  = useState(false)

  const [addKodeAkun,  setAddKodeAkun]  = useState('')
  const [editId,       setEditId]       = useState('')
  const [editKodeAkun, setEditKodeAkun] = useState('')
  const [delId,        setDelId]        = useState('')
  const [delName,      setDelName]      = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [delError,  setDelError]  = useState<string | null>(null)

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000) }

  const openAdd = () => { setAddKodeAkun(''); setFormError(null); setAddOpen(true) }
  const openEdit = (id: string, kode_akun: string | null) => {
    setEditId(id); setEditKodeAkun(kode_akun ?? ''); setFormError(null); setEditOpen(true)
  }
  const openDel  = (id: string, name: string) => { setDelId(id); setDelName(name); setDelError(null); setDelOpen(true) }

  const handleAdd = async () => {
    setFormError(null)
    if (!addKodeAkun) { setFormError('Kode akun BAS wajib dipilih.'); return }
    const autoName = getBasUraian(addKodeAkun)
    if (fundingSources.some(f => f.kode_akun === addKodeAkun)) {
      setFormError('Kode akun ini sudah terdaftar.'); return
    }
    const err = await createFundingSource(autoName, addKodeAkun)
    if (err) { setFormError(err); return }
    setAddOpen(false); flash(`Jenis pendapatan "${autoName}" berhasil ditambahkan.`); refetch()
  }

  const handleEdit = async () => {
    setFormError(null)
    if (!editKodeAkun) { setFormError('Kode akun BAS wajib dipilih.'); return }
    if (fundingSources.some(f => f.id !== editId && f.kode_akun === editKodeAkun)) {
      setFormError('Kode akun ini sudah terdaftar.'); return
    }
    const autoName = getBasUraian(editKodeAkun)
    const err = await updateFundingSource(editId, autoName, editKodeAkun)
    if (err) { setFormError(err); return }
    setEditOpen(false); flash('Jenis pendapatan berhasil diperbarui.'); refetch()
  }

  const handleDelete = async () => {
    setDelError(null)
    const err = await deleteFundingSource(delId)
    if (err) { setDelError(err); return }
    setDelOpen(false); flash(`Jenis pendapatan "${delName}" berhasil dihapus.`); refetch()
  }

  return (
    <>
      <Card padding="sm">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white font-headline">Jenis Pendapatan</h3>
            <p className="text-xs text-white/60 font-body mt-0.5">
              {fundingSources.length} jenis terdaftar
            </p>
          </div>
          <Button variant="primary" size="sm" icon="add" onClick={openAdd}>
            Tambah Jenis
          </Button>
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-primary-fixed/30 text-sm text-primary font-body">{success}</div>
        )}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-error-container text-sm text-on-error-container font-body">{error}</div>
        )}

        {loading ? (
          <p className="px-4 py-8 text-sm text-white/60 font-body text-center">Memuat...</p>
        ) : fundingSources.length === 0 ? (
          <p className="px-4 py-8 text-sm text-white/60 font-body text-center">
            Belum ada jenis pendapatan. Klik "Tambah Jenis" untuk menambahkan.
          </p>
        ) : (
          <table className="w-full text-sm font-body mt-1">
            <thead className="bg-white/10 border-b border-white/20">
              <tr>
                {['No', 'Nama Jenis Pendapatan', 'Kode Akun BAS', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs text-white uppercase tracking-wide font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fundingSources.map((f, idx) => (
                <tr key={f.id} className={idx % 2 === 0 ? 'bg-white/5' : ''}>
                  <td className="px-4 py-2.5 text-white/50 text-xs w-12">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                        payments
                      </span>
                      {f.name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {f.kode_akun ? (
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/15 text-white text-xs font-mono font-semibold">
                          {f.kode_akun}
                        </span>
                        <p className="text-xs text-white/60 mt-0.5 leading-tight">{getBasUraian(f.kode_akun)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-white/40 italic">— Belum dipetakan —</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <button className="text-xs text-primary hover:underline disabled:opacity-50" disabled={saving}
                        onClick={() => openEdit(f.id, f.kode_akun)}>
                        Edit
                      </button>
                      <button className="text-xs text-error hover:underline disabled:opacity-50" disabled={saving}
                        onClick={() => openDel(f.id, f.name)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Jenis Pendapatan" maxWidth="md">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Kode Akun BAS Pendapatan BLU" icon="tag">
            <select className={inputCls} value={addKodeAkun}
              onChange={e => { setAddKodeAkun(e.target.value); setFormError(null) }} autoFocus>
              <option value="">— Pilih Kode Akun —</option>
              {BAS_PENDAPATAN_BLU.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(item => (
                    <option key={item.kode} value={item.kode}>
                      {item.kode} — {item.uraian}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {addKodeAkun && (
              <p className="text-xs text-on-surface-variant mt-1">
                Akan disimpan sebagai:{' '}
                <span className="font-semibold text-on-surface">{getBasUraian(addKodeAkun)}</span>
              </p>
            )}
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleAdd}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Jenis Pendapatan" maxWidth="md">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Kode Akun BAS Pendapatan BLU" icon="tag">
            <select className={inputCls} value={editKodeAkun}
              onChange={e => { setEditKodeAkun(e.target.value); setFormError(null) }} autoFocus>
              <option value="">— Pilih Kode Akun —</option>
              {BAS_PENDAPATAN_BLU.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(item => (
                    <option key={item.kode} value={item.kode}>
                      {item.kode} — {item.uraian}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {editKodeAkun && (
              <p className="text-xs text-on-surface-variant mt-1">
                Akan disimpan sebagai:{' '}
                <span className="font-semibold text-on-surface">{getBasUraian(editKodeAkun)}</span>
              </p>
            )}
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleEdit}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Jenis Pendapatan">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-surface-variant font-body">
            Yakin ingin menghapus jenis pendapatan{' '}
            <span className="font-semibold text-on-surface">"{delName}"</span>?
          </p>
          <p className="text-xs text-on-surface-variant font-body bg-surface-container rounded-lg px-3 py-2">
            Jika masih digunakan oleh transaksi, penghapusan akan gagal secara otomatis.
          </p>
          {delError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{delError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDelOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" className="bg-error text-on-error hover:bg-error/90" disabled={saving} onClick={handleDelete}>
              {saving ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Tab Mekanisme Bisnis ────────────────────────────────────────────────────

function MekanismeBisnisTab() {
  const { businessUnits, loading, refetch } = useBusinessUnits()
  const { createBusinessUnit, updateBusinessUnit, deleteBusinessUnit, saving, error } = useManageBusinessUnits()

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen,  setDelOpen]  = useState(false)

  const [addName,  setAddName]  = useState('')
  const [editId,   setEditId]   = useState('')
  const [editName, setEditName] = useState('')
  const [delId,    setDelId]    = useState('')
  const [delName,  setDelName]  = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [delError,  setDelError]  = useState<string | null>(null)

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 4000)
  }

  const openAdd = () => { setAddName(''); setFormError(null); setAddOpen(true) }

  const openEdit = (id: string, name: string) => {
    setEditId(id); setEditName(name); setFormError(null); setEditOpen(true)
  }

  const openDel = (id: string, name: string) => {
    setDelId(id); setDelName(name); setDelError(null); setDelOpen(true)
  }

  const handleAdd = async () => {
    setFormError(null)
    if (!addName.trim()) { setFormError('Nama mekanisme bisnis wajib diisi.'); return }
    const duplicate = businessUnits.some(b => b.name.toLowerCase() === addName.trim().toLowerCase())
    if (duplicate) { setFormError('Nama sudah ada.'); return }
    const err = await createBusinessUnit(addName)
    if (err) { setFormError(err); return }
    setAddOpen(false)
    flash(`Mekanisme bisnis "${addName.trim()}" berhasil ditambahkan.`)
    refetch()
  }

  const handleEdit = async () => {
    setFormError(null)
    if (!editName.trim()) { setFormError('Nama mekanisme bisnis wajib diisi.'); return }
    const duplicate = businessUnits.some(
      b => b.id !== editId && b.name.toLowerCase() === editName.trim().toLowerCase()
    )
    if (duplicate) { setFormError('Nama sudah ada.'); return }
    const err = await updateBusinessUnit(editId, editName)
    if (err) { setFormError(err); return }
    setEditOpen(false)
    flash('Mekanisme bisnis berhasil diperbarui.')
    refetch()
  }

  const handleDelete = async () => {
    setDelError(null)
    const err = await deleteBusinessUnit(delId)
    if (err) { setDelError(err); return }
    setDelOpen(false)
    flash(`Mekanisme bisnis "${delName}" berhasil dihapus.`)
    refetch()
  }

  return (
    <>
      <Card padding="sm">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-on-surface font-headline">Mekanisme Bisnis</h3>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              {businessUnits.length} mekanisme terdaftar
            </p>
          </div>
          <Button variant="primary" size="sm" icon="add" onClick={openAdd}>
            Tambah Mekanisme
          </Button>
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-primary-fixed/30 text-sm text-primary font-body">
            {success}
          </div>
        )}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-error-container text-sm text-on-error-container font-body">
            {error}
          </div>
        )}

        {loading ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">Memuat...</p>
        ) : businessUnits.length === 0 ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Belum ada mekanisme bisnis. Klik "Tambah Mekanisme" untuk menambahkan.
          </p>
        ) : (
          <table className="w-full text-sm font-body mt-1">
            <thead className="bg-surface-container-low">
              <tr>
                {['No', 'Nama Mekanisme Bisnis', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-on-surface-variant uppercase tracking-label font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {businessUnits.map((b, idx) => (
                <tr key={b.id} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                  <td className="px-4 py-2.5 text-on-surface-variant text-xs w-12">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-on-surface font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-secondary"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                        business_center
                      </span>
                      {b.name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                        disabled={saving}
                        onClick={() => openEdit(b.id, b.name)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-error hover:underline disabled:opacity-50"
                        disabled={saving}
                        onClick={() => openDel(b.id, b.name)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Mekanisme Bisnis">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Mekanisme Bisnis" icon="business_center">
            <input
              type="text"
              placeholder="Contoh: BLU Pusat"
              className={inputCls}
              value={addName}
              onChange={e => { setAddName(e.target.value); setFormError(null) }}
              autoFocus
            />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleAdd}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Mekanisme Bisnis">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Mekanisme Bisnis" icon="business_center">
            <input
              type="text"
              className={inputCls}
              value={editName}
              onChange={e => { setEditName(e.target.value); setFormError(null) }}
              autoFocus
            />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleEdit}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Mekanisme Bisnis">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-surface-variant font-body">
            Yakin ingin menghapus mekanisme bisnis{' '}
            <span className="font-semibold text-on-surface">"{delName}"</span>?
          </p>
          <p className="text-xs text-on-surface-variant font-body bg-surface-container rounded-lg px-3 py-2">
            Jika masih terhubung ke kategori penerimaan, penghapusan akan gagal secara otomatis.
          </p>
          {delError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {delError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDelOpen(false)}>Batal</Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-error text-on-error hover:bg-error/90"
              disabled={saving}
              onClick={handleDelete}
            >
              {saving ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Tab Rekening Bank ───────────────────────────────────────────────────────

const EMPTY_REKENING: BankAccountInput = { bank_name: '', account_number: '', account_name: '' }

function RekeningTab() {
  const { accounts, loading, refetch } = useBankAccounts()
  const { createAccount, updateAccount, toggleActive, deleteAccount, saving, error } = useManageBankAccounts()

  type ModalMode = 'create' | 'edit'
  const [modalOpen,   setModalOpen]   = useState(false)
  const [modalMode,   setModalMode]   = useState<ModalMode>('create')
  const [editId,      setEditId]      = useState<string | null>(null)
  const [form,        setForm]        = useState<BankAccountInput>(EMPTY_REKENING)
  const [formError,   setFormError]   = useState<string | null>(null)
  const [success,     setSuccess]     = useState<string | null>(null)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)

  const openCreate = () => {
    setModalMode('create'); setEditId(null)
    setForm(EMPTY_REKENING); setFormError(null); setModalOpen(true)
  }

  const openEdit = (a: { id: string; bank_name: string; account_number: string; account_name: string }) => {
    setModalMode('edit'); setEditId(a.id)
    setForm({ bank_name: a.bank_name, account_number: a.account_number, account_name: a.account_name })
    setFormError(null); setModalOpen(true)
  }

  const handleSave = async () => {
    setFormError(null)
    if (!form.bank_name || !form.account_number || !form.account_name) {
      setFormError('Semua field wajib diisi.'); return
    }
    const err = modalMode === 'edit' && editId
      ? await updateAccount(editId, form)
      : await createAccount(form)
    if (err) { setFormError(err); return }
    setModalOpen(false)
    setSuccess(modalMode === 'edit' ? 'Rekening berhasil diperbarui.' : 'Rekening berhasil ditambahkan.')
    refetch()
    setTimeout(() => setSuccess(null), 4000)
  }

  const handleToggle = async (id: string, current: boolean) => {
    await toggleActive(id, !current)
    refetch()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const err = await deleteAccount(deleteId)
    setDeleteId(null)
    if (err) return
    setSuccess('Rekening berhasil dihapus.')
    refetch()
    setTimeout(() => setSuccess(null), 4000)
  }

  const deleteTarget = accounts.find(a => a.id === deleteId)

  return (
    <>
      <Card padding="sm">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-on-surface font-headline">Rekening Bank Penerimaan</h3>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              {accounts.length} rekening terdaftar
            </p>
          </div>
          <Button variant="primary" size="sm" icon="add" onClick={openCreate}>
            Tambah Rekening
          </Button>
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-primary-fixed/30 text-sm text-primary font-body">
            {success}
          </div>
        )}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-error-container text-sm text-on-error-container font-body">
            {error}
          </div>
        )}

        {loading ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">Memuat...</p>
        ) : accounts.length === 0 ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Belum ada rekening. Klik "Tambah Rekening" untuk menambahkan.
          </p>
        ) : (
          <Table>
            <TableHead>
              <TableHeadCell>Bank</TableHeadCell>
              <TableHeadCell>No. Rekening</TableHeadCell>
              <TableHeadCell>Atas Nama</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Aksi</TableHeadCell>
            </TableHead>
            <TableBody>
              {accounts.map((a, idx) => (
                <TableRow key={a.id} even={idx % 2 === 0}>
                  <TableCell><span className="font-medium">{a.bank_name}</span></TableCell>
                  <TableCell>{a.account_number}</TableCell>
                  <TableCell>{a.account_name}</TableCell>
                  <TableCell>
                    <span className={[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      a.is_active
                        ? 'bg-primary/20 text-primary'
                        : 'bg-white/10 text-white/40',
                    ].join(' ')}>
                      {a.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                        disabled={saving}
                        onClick={() => openEdit(a)}
                      >
                        Edit
                      </button>
                      <button
                        className={`text-xs hover:underline disabled:opacity-50 ${a.is_active ? 'text-error' : 'text-primary'}`}
                        disabled={saving}
                        onClick={() => handleToggle(a.id, a.is_active)}
                      >
                        {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        className="text-xs text-error hover:underline disabled:opacity-50"
                        disabled={saving}
                        onClick={() => setDeleteId(a.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Tambah / Edit */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'edit' ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}
      >
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Bank" icon="account_balance">
            <input
              type="text"
              placeholder="Contoh: Bank BRI"
              className={inputCls}
              value={form.bank_name}
              onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
            />
          </FormField>
          <FormField label="Nomor Rekening" icon="tag">
            <input
              type="text"
              placeholder="Contoh: 0001-01-000001-30-7"
              className={inputCls}
              value={form.account_number}
              onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
            />
          </FormField>
          <FormField label="Atas Nama" icon="badge">
            <input
              type="text"
              placeholder="Contoh: UIN Palopo - Penerimaan UKT"
              className={inputCls}
              value={form.account_name}
              onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
            />
          </FormField>

          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleSave}>
              {saving ? 'Menyimpan...' : modalMode === 'edit' ? 'Simpan Perubahan' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Rekening Bank">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-on-surface font-body">
            Yakin ingin menghapus rekening berikut?
          </p>
          {deleteTarget && (
            <div className="rounded-xl bg-surface-container px-4 py-3 text-sm font-body space-y-1">
              <p><span className="text-on-surface-variant">Bank:</span> <span className="font-medium text-on-surface">{deleteTarget.bank_name}</span></p>
              <p><span className="text-on-surface-variant">No. Rekening:</span> <span className="font-medium text-on-surface">{deleteTarget.account_number}</span></p>
              <p><span className="text-on-surface-variant">Atas Nama:</span> <span className="font-medium text-on-surface">{deleteTarget.account_name}</span></p>
            </div>
          )}
          <p className="text-xs text-on-surface-variant font-body">
            Rekening yang dihapus tidak akan muncul di daftar maupun form input transaksi.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="primary" size="sm" icon="delete" disabled={saving} onClick={handleDelete}
              className="bg-error text-on-error hover:bg-error/90">
              {saving ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Tab User ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'Admin',    label: 'Admin Sistem' },
  { value: 'Approver', label: 'Pimpinan (Rektor)' },
  { value: 'Operator', label: 'Bendahara (Operator)' },
]

const KATEGORI_OPTIONS: { value: BendaharaKategori; label: string }[] = [
  { value: 'bendahara_penerimaan', label: 'Bendahara Penerimaan' },
  { value: 'bendahara_induk',      label: 'Bendahara Induk Pengeluaran' },
  { value: 'bendahara_pembantu',   label: 'Bendahara Pengeluaran Pembantu' },
]

const inputCls = 'w-full px-3 py-2 rounded-xl border border-outline bg-surface-container-lowest text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary'

function FormField({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-on-surface-variant font-body mb-1.5">
        <span className="material-symbols-outlined text-[0.85rem]"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
          {icon}
        </span>
        {label}
      </label>
      {children}
    </div>
  )
}

const EMPTY_FORM: CreateUserPayload = {
  email: '', password: '', nama: '', role: 'Operator',
  category: 'bendahara_penerimaan', work_unit_id: '',
}

const EMPTY_EDIT: EditUserPayload = {
  email: '', password: '', nama: '', role: 'Operator', category: 'bendahara_penerimaan', work_unit_id: '',
}

function UserTab({
  usersState,
  currentUserId,
}: {
  usersState: ReturnType<typeof useUsers>
  currentUserId: string
}) {
  const { createUser, editUser, deleteUser } = useUserManagement()
  const { workUnits } = useWorkUnits()

  const [modalOpen, setModalOpen]   = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [form, setForm]             = useState<CreateUserPayload>(EMPTY_FORM)
  const [editForm, setEditForm]     = useState<EditUserPayload>(EMPTY_EDIT)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [editError, setEditError]   = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

  const openModal = () => { setForm(EMPTY_FORM); setError(null); setModalOpen(true) }

  const openEdit = (u: ReturnType<typeof useUsers>['users'][number]) => {
    setEditForm({
      email:    u.email,
      password: '',
      nama:     u.email.split('@')[0],
      role:     u.roleName as UserRole,
      category: u.role.startsWith('bendahara') ? u.role as BendaharaKategori : 'bendahara_penerimaan',
      work_unit_id: '',
    })
    setEditError(null)
    setEditOpen(true)
  }

  const handleCreate = async () => {
    setError(null)
    if (!form.email || !form.password || !form.nama) {
      setError('Email, password, dan nama wajib diisi.'); return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.'); return
    }
    if (form.role === 'Operator' && form.category === 'bendahara_pembantu' && !form.work_unit_id) {
      setError('Unit Kerja wajib dipilih untuk Bendahara Pengeluaran Pembantu.'); return
    }
    setSaving(true)
    const err = await createUser(form)
    setSaving(false)
    if (err) { setError(err); return }
    setModalOpen(false)
    setSuccess(`User ${form.email} berhasil dibuat.`)
    usersState.refetch()
    setTimeout(() => setSuccess(null), 4000)
  }

  const handleEdit = async () => {
    setEditError(null)
    if (!editForm.nama) { setEditError('Nama wajib diisi.'); return }
    if (editForm.password && editForm.password.length < 6) {
      setEditError('Password minimal 6 karakter.'); return
    }
    if (editForm.role === 'Operator' && editForm.category === 'bendahara_pembantu' && !editForm.work_unit_id) {
      setEditError('Unit Kerja wajib dipilih untuk Bendahara Pengeluaran Pembantu.'); return
    }
    setSaving(true)
    const err = await editUser(editForm)
    setSaving(false)
    if (err) { setEditError(err); return }
    setEditOpen(false)
    setSuccess(`User ${editForm.email} berhasil diperbarui.`)
    usersState.refetch()
    setTimeout(() => setSuccess(null), 4000)
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Hapus user ${email}? Tindakan ini tidak dapat diurungkan.`)) return
    setDeleting(userId)
    const err = await deleteUser(userId)
    setDeleting(null)
    if (err) { setError(err); return }
    setSuccess(`User ${email} berhasil dihapus.`)
    usersState.refetch()
    setTimeout(() => setSuccess(null), 4000)
  }

  return (
    <>
      <Card padding="sm">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-on-surface font-headline">Daftar Pengguna</h3>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              {usersState.users.length} pengguna terdaftar
            </p>
          </div>
          <Button variant="primary" size="sm" icon="person_add" onClick={openModal}>
            Tambah User
          </Button>
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-primary-fixed/30 text-sm text-primary font-body">
            {success}
          </div>
        )}
        {error && !modalOpen && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-error-container text-sm text-on-error-container font-body">
            {error}
          </div>
        )}

        {usersState.loading ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">Memuat...</p>
        ) : usersState.users.length === 0 ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Belum ada pengguna. Klik "Tambah User" untuk membuat yang pertama.
          </p>
        ) : (
          <table className="w-full text-sm font-body mt-1">
            <thead className="bg-surface-container-low">
              <tr>
                {['Email','Role','Aksi'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-on-surface-variant uppercase tracking-label font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersState.users.map((u, idx) => (
                <tr key={u.userId} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                  <td className="px-4 py-2.5 text-on-surface">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container">
                      {USER_ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.userId !== currentUserId ? (
                      <div className="flex items-center gap-3">
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-xs text-error hover:underline disabled:opacity-50"
                          disabled={deleting === u.userId}
                          onClick={() => handleDelete(u.userId, u.email)}
                        >
                          {deleting === u.userId ? 'Menghapus...' : 'Hapus'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">Anda</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal edit user */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Pengguna">
        <div className="px-6 py-5 space-y-5">
          <div className="space-y-3">
            <FormField label="Email" icon="alternate_email">
              <input type="email" className={inputCls + ' opacity-60 cursor-not-allowed'} value={editForm.email} readOnly />
            </FormField>
            <FormField label="Nama Lengkap" icon="badge">
              <input
                type="text"
                placeholder="Nama lengkap"
                className={inputCls}
                value={editForm.nama}
                onChange={e => setEditForm(f => ({ ...f, nama: e.target.value }))}
              />
            </FormField>
            <FormField label="Password Baru" icon="lock">
              <input
                type="password"
                placeholder="Kosongkan jika tidak diubah"
                className={inputCls}
                value={editForm.password}
                onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="border-t border-outline-variant" />

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-on-surface-variant font-body block mb-2">Role</label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, role: o.value }))}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium font-body border transition-colors',
                      editForm.role === o.value
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container text-on-surface-variant border-outline hover:bg-surface-container-high',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-[0.9rem]"
                      style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                      {o.value === 'Admin' ? 'admin_panel_settings' : o.value === 'Approver' ? 'verified_user' : 'manage_accounts'}
                    </span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {editForm.role === 'Operator' && (
              <>
                <FormField label="Kategori Bendahara" icon="category">
                  <select
                    className={inputCls}
                    value={editForm.category}
                    onChange={e => setEditForm(f => ({ ...f, category: e.target.value as BendaharaKategori }))}
                  >
                    {KATEGORI_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </FormField>
                {editForm.category === 'bendahara_pembantu' && (
                  <FormField label="Unit Kerja" icon="corporate_fare">
                    <select
                      className={inputCls}
                      value={editForm.work_unit_id}
                      onChange={e => setEditForm(f => ({ ...f, work_unit_id: e.target.value }))}
                    >
                      <option value="">— Pilih Unit Kerja —</option>
                      {workUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </FormField>
                )}
              </>
            )}
          </div>

          {editError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {editError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleEdit}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal tambah user */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Pengguna Baru">
        <div className="px-6 py-5 space-y-5">

          {/* Seksi: Identitas */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest font-body mb-3">
              Identitas
            </p>
            <div className="space-y-3">
              <FormField label="Nama Lengkap" icon="badge">
                <input
                  type="text"
                  placeholder="Contoh: Rizal Mappasomba"
                  className={inputCls}
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                />
              </FormField>
              <FormField label="Email" icon="alternate_email">
                <input
                  type="email"
                  placeholder="nama@uinpalopo.ac.id"
                  className={inputCls}
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </FormField>
              <FormField label="Password" icon="lock">
                <input
                  type="password"
                  placeholder="Min. 8 karakter"
                  className={inputCls}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </FormField>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-outline-variant" />

          {/* Seksi: Hak Akses */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest font-body mb-3">
              Hak Akses
            </p>
            <div className="space-y-3">
              {/* Role pills */}
              <div>
                <label className="text-xs font-medium text-on-surface-variant font-body block mb-2">Role</label>
                <div className="flex gap-2 flex-wrap">
                  {ROLE_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, role: o.value }))}
                      className={[
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium font-body border transition-colors',
                        form.role === o.value
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container text-on-surface-variant border-outline hover:bg-surface-container-high',
                      ].join(' ')}
                    >
                      <span className="material-symbols-outlined text-[0.9rem]"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                        {o.value === 'Admin' ? 'admin_panel_settings' : o.value === 'Approver' ? 'verified_user' : 'manage_accounts'}
                      </span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.role === 'Operator' && (
                <>
                  <FormField label="Kategori Bendahara" icon="category">
                    <select
                      className={inputCls}
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value as BendaharaKategori }))}
                    >
                      {KATEGORI_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FormField>

                  {form.category === 'bendahara_pembantu' && (
                    <FormField label="Unit Kerja" icon="corporate_fare">
                      <select
                        className={inputCls}
                        value={form.work_unit_id}
                        onChange={e => setForm(f => ({ ...f, work_unit_id: e.target.value }))}
                      >
                        <option value="">— Pilih Unit Kerja —</option>
                        {workUnits.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </FormField>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button variant="primary" size="sm" icon="person_add" disabled={saving} onClick={handleCreate}>
              {saving ? 'Membuat...' : 'Buat User'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Tab: Sumber Pendapatan Bisnis ────────────────────────────────────────────

function SumberPendapatanBisnisTab() {
  const { items, loading, refetch } = useSumberPendapatanBisnis()
  const { create, update, remove, saving, error } = useManageSumberPendapatanBisnis()

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen,  setDelOpen]  = useState(false)

  const [formName,      setFormName]      = useState('')
  const [formKode,      setFormKode]      = useState('')
  const [formDeskripsi, setFormDeskripsi] = useState('')
  const [editId,        setEditId]        = useState('')
  const [delId,         setDelId]         = useState('')
  const [delName,       setDelName]       = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [delError,  setDelError]  = useState<string | null>(null)

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000) }

  const openAdd = () => {
    setFormName(''); setFormKode(''); setFormDeskripsi(''); setFormError(null); setAddOpen(true)
  }

  const openEdit = (id: string, name: string, kode: string | null, deskripsi: string | null) => {
    setEditId(id); setFormName(name); setFormKode(kode ?? ''); setFormDeskripsi(deskripsi ?? '')
    setFormError(null); setEditOpen(true)
  }

  const openDel = (id: string, name: string) => {
    setDelId(id); setDelName(name); setDelError(null); setDelOpen(true)
  }

  const handleAdd = async () => {
    setFormError(null)
    if (!formName.trim()) { setFormError('Nama wajib diisi.'); return }
    if (items.some(i => i.name.toLowerCase() === formName.trim().toLowerCase())) {
      setFormError('Nama ini sudah terdaftar.'); return
    }
    const err = await create(formName, formKode, formDeskripsi)
    if (err) { setFormError(err); return }
    setAddOpen(false); flash(`Sumber pendapatan "${formName.trim()}" berhasil ditambahkan.`); refetch()
  }

  const handleEdit = async () => {
    setFormError(null)
    if (!formName.trim()) { setFormError('Nama wajib diisi.'); return }
    if (items.some(i => i.id !== editId && i.name.toLowerCase() === formName.trim().toLowerCase())) {
      setFormError('Nama ini sudah terdaftar.'); return
    }
    const err = await update(editId, formName, formKode, formDeskripsi)
    if (err) { setFormError(err); return }
    setEditOpen(false); flash('Sumber pendapatan berhasil diperbarui.'); refetch()
  }

  const handleDelete = async () => {
    setDelError(null)
    const err = await remove(delId)
    if (err) { setDelError(err); return }
    setDelOpen(false); flash(`Sumber pendapatan "${delName}" berhasil dihapus.`); refetch()
  }

  const formFieldsJsx = (
    <div className="space-y-3 px-6 py-4">
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">Nama <span className="text-error">*</span></label>
        <input
          type="text"
          placeholder="Contoh: Pendapatan Jasa Layanan"
          value={formName}
          onChange={e => { setFormName(e.target.value); setFormError(null) }}
          className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">Kode <span className="text-on-surface-variant font-normal">(opsional)</span></label>
        <input
          type="text"
          placeholder="Contoh: SPB-001"
          value={formKode}
          onChange={e => setFormKode(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary font-mono"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">Deskripsi <span className="text-on-surface-variant font-normal">(opsional)</span></label>
        <textarea
          rows={2}
          placeholder="Keterangan singkat tentang sumber pendapatan ini"
          value={formDeskripsi}
          onChange={e => setFormDeskripsi(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary resize-none"
        />
      </div>
      {formError && (
        <p className="text-xs text-error bg-error-container rounded-lg px-3 py-2">{formError}</p>
      )}
    </div>
  )

  return (
    <>
      <Card padding="sm">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-on-surface font-headline">Sumber Pendapatan Bisnis</h3>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              {items.length} sumber terdaftar
            </p>
          </div>
          <Button variant="primary" size="sm" icon="add" onClick={openAdd}>
            Tambah Sumber
          </Button>
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-primary-fixed/30 text-sm text-primary font-body">{success}</div>
        )}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-error-container text-sm text-on-error-container font-body">{error}</div>
        )}

        {loading ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">Memuat...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Belum ada sumber pendapatan bisnis. Klik "Tambah Sumber" untuk menambahkan.
          </p>
        ) : (
          <table className="w-full text-sm font-body mt-1">
            <thead className="bg-surface-container-low">
              <tr>
                {['No', 'Nama', 'Kode', 'Deskripsi', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-on-surface-variant uppercase tracking-label font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                  <td className="px-4 py-2.5 text-on-surface-variant text-xs w-12">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-on-surface font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-tertiary"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                        account_balance
                      </span>
                      {item.name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {item.kode ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container text-xs font-mono font-semibold">
                        {item.kode}
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-on-surface-variant max-w-xs truncate">
                    {item.deskripsi || <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(item.id, item.name, item.kode, item.deskripsi)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                          edit
                        </span>
                      </button>
                      <button
                        onClick={() => openDel(item.id, item.name)}
                        className="p-1.5 rounded-lg text-error hover:bg-error-container transition-colors"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Sumber Pendapatan Bisnis" maxWidth="sm">
        {formFieldsJsx}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Batal</Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleAdd}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Sumber Pendapatan Bisnis" maxWidth="sm">
        {formFieldsJsx}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Batal</Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleEdit}>
            {saving ? 'Menyimpan...' : 'Perbarui'}
          </Button>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Sumber Pendapatan Bisnis" maxWidth="sm">
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-on-surface">
            Hapus sumber pendapatan <span className="font-semibold">"{delName}"</span>?
            Transaksi yang sudah menggunakan sumber ini tidak akan terpengaruh.
          </p>
          {delError && (
            <p className="text-xs text-error bg-error-container rounded-lg px-3 py-2">{delError}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={() => setDelOpen(false)}>Batal</Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleDelete}
            className="!bg-error !text-on-error">
            {saving ? 'Menghapus...' : 'Hapus'}
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------------
// Tab Unit Kerja
// ---------------------------------------------------------------------------
function UnitKerjaTab() {
  const { workUnits, loading, refetch } = useWorkUnits()
  const { createWorkUnit, updateWorkUnit, deleteWorkUnit, saving } = useManageWorkUnits()

  const [addOpen,   setAddOpen]   = useState(false)
  const [editOpen,  setEditOpen]  = useState(false)
  const [delOpen,   setDelOpen]   = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [delId,     setDelId]     = useState<string | null>(null)
  const [delName,   setDelName]   = useState('')
  const [formName,  setFormName]  = useState('')
  const [parentId,  setParentId]  = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [delError,  setDelError]  = useState<string | null>(null)

  const roots   = workUnits.filter(u => !u.parent_id)
  const children = workUnits.filter(u => u.parent_id)

  const openAdd = () => {
    setFormName(''); setParentId(''); setFormError(null); setAddOpen(true)
  }

  const openEdit = (u: { id: string; name: string; parent_id: string | null }) => {
    setEditId(u.id); setFormName(u.name); setParentId(u.parent_id ?? ''); setFormError(null); setEditOpen(true)
  }

  const openDel = (id: string, name: string) => {
    setDelId(id); setDelName(name); setDelError(null); setDelOpen(true)
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg); setTimeout(() => setSuccess(null), 4000)
  }

  const handleAdd = async () => {
    setFormError(null)
    if (!formName.trim()) { setFormError('Nama unit kerja wajib diisi.'); return }
    const err = await createWorkUnit(formName.trim(), parentId || null)
    if (err) { setFormError(err); return }
    setAddOpen(false); refetch(); showSuccess('Unit kerja berhasil ditambahkan.')
  }

  const handleEdit = async () => {
    setFormError(null)
    if (!formName.trim()) { setFormError('Nama unit kerja wajib diisi.'); return }
    if (!editId) return
    const err = await updateWorkUnit(editId, formName.trim(), parentId || null)
    if (err) { setFormError(err); return }
    setEditOpen(false); refetch(); showSuccess('Unit kerja berhasil diperbarui.')
  }

  const handleDelete = async () => {
    if (!delId) return
    setDelError(null)
    const hasChildren = children.some(c => c.parent_id === delId)
    if (hasChildren) { setDelError('Unit kerja ini memiliki sub-unit. Hapus sub-unit terlebih dahulu.'); return }
    const err = await deleteWorkUnit(delId)
    if (err) { setDelError(err); return }
    setDelOpen(false); refetch(); showSuccess('Unit kerja berhasil dihapus.')
  }

  const formFieldsJsx = (
    <div className="px-6 py-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">
          Nama Unit Kerja <span className="text-error">*</span>
        </label>
        <input
          type="text"
          placeholder="Contoh: FUAD, FTIK, LP2M"
          value={formName}
          onChange={e => { setFormName(e.target.value); setFormError(null) }}
          className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1">
          Induk Unit Kerja <span className="text-on-surface-variant font-normal">(opsional)</span>
        </label>
        <select
          value={parentId}
          onChange={e => setParentId(e.target.value)}
          className="w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
        >
          <option value="">— Tidak ada (unit utama) —</option>
          {roots.filter(r => r.id !== editId).map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      {formError && (
        <p className="text-xs text-error bg-error-container rounded-lg px-3 py-2">{formError}</p>
      )}
    </div>
  )

  return (
    <>
      <Card padding="sm">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white font-headline">Unit Kerja</h3>
            <p className="text-xs text-white/60 font-body mt-0.5">
              {workUnits.length} unit terdaftar
            </p>
          </div>
          <Button variant="primary" size="sm" icon="add" onClick={openAdd}>
            Tambah Unit Kerja
          </Button>
        </div>

        {success && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-primary-fixed/30 text-sm text-primary font-body">
            {success}
          </div>
        )}

        {loading ? (
          <p className="px-4 py-8 text-sm text-white/60 font-body text-center">Memuat...</p>
        ) : workUnits.length === 0 ? (
          <p className="px-4 py-8 text-sm text-white/60 font-body text-center">
            Belum ada unit kerja. Klik "Tambah Unit Kerja" untuk menambahkan.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-white/10">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide">Nama Unit Kerja</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide">Induk</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide">Sub-Unit</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-white uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {workUnits.map((u, idx) => {
                const parent = workUnits.find(p => p.id === u.parent_id)
                const subCount = children.filter(c => c.parent_id === u.id).length
                return (
                  <tr key={u.id} className={idx % 2 === 0 ? 'bg-white/5' : ''}>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-white">{u.name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {parent
                        ? <span className="text-white/80">{parent.name}</span>
                        : <span className="text-white/30 italic">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      {subCount > 0
                        ? <span className="text-xs bg-primary/30 text-primary-container px-2 py-0.5 rounded-full font-medium">{subCount} sub-unit</span>
                        : <span className="text-white/30">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => openDel(u.id, u.name)}
                          className="p-1.5 rounded-lg text-error hover:bg-error-container transition-colors"
                          title="Hapus"
                        >
                          <span className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Unit Kerja" maxWidth="sm">
        {formFieldsJsx}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Batal</Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleAdd}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Unit Kerja" maxWidth="sm">
        {formFieldsJsx}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Batal</Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleEdit}>
            {saving ? 'Menyimpan...' : 'Perbarui'}
          </Button>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Unit Kerja" maxWidth="sm">
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-on-surface">
            Hapus unit kerja <span className="font-semibold">"{delName}"</span>?
            Transaksi yang sudah menggunakan unit ini tidak akan terpengaruh.
          </p>
          {delError && (
            <p className="text-xs text-error bg-error-container rounded-lg px-3 py-2">{delError}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={() => setDelOpen(false)}>Batal</Button>
          <Button variant="primary" size="sm" disabled={saving} onClick={handleDelete}
            className="!bg-error !text-on-error">
            {saving ? 'Menghapus...' : 'Hapus'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
