import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { PageContainer } from '../../components/layout/PageContainer'
import { useAppContext } from '../../context/AppContext'
import { useUsers } from '../../hooks/useUsers'
import { useManagePeriods } from '../../hooks/useManagePeriods'
import { useUserManagement, type CreateUserPayload, type EditUserPayload, type UserRole, type BendaharaKategori } from '../../hooks/useUserManagement'
import { useWorkUnits } from '../../hooks/useWorkUnits'
import { useBankAccounts, useManageBankAccounts, type BankAccountInput } from '../../hooks/useBankAccounts'
import { USER_ROLE_LABELS } from '../../types'

type PengaturanTab = 'profil' | 'periode' | 'user' | 'rekening'

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

// ─── Tab Rekening Bank ───────────────────────────────────────────────────────

const EMPTY_REKENING: BankAccountInput = { bank_name: '', account_number: '', account_name: '' }

function RekeningTab() {
  const { accounts, loading, refetch } = useBankAccounts()
  const { createAccount, toggleActive, saving, error } = useManageBankAccounts()

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState<BankAccountInput>(EMPTY_REKENING)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  const openModal = () => { setForm(EMPTY_REKENING); setFormError(null); setModalOpen(true) }

  const handleCreate = async () => {
    setFormError(null)
    if (!form.bank_name || !form.account_number || !form.account_name) {
      setFormError('Semua field wajib diisi.'); return
    }
    const err = await createAccount(form)
    if (err) { setFormError(err); return }
    setModalOpen(false)
    setSuccess('Rekening berhasil ditambahkan.')
    refetch()
    setTimeout(() => setSuccess(null), 4000)
  }

  const handleToggle = async (id: string, current: boolean) => {
    await toggleActive(id, !current)
    refetch()
  }

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
          <Button variant="primary" size="sm" icon="add" onClick={openModal}>
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
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body animate-pulse text-center">Memuat...</p>
        ) : accounts.length === 0 ? (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Belum ada rekening. Klik "Tambah Rekening" untuk menambahkan.
          </p>
        ) : (
          <table className="w-full text-sm font-body mt-1">
            <thead className="bg-surface-container-low">
              <tr>
                {['Bank', 'No. Rekening', 'Atas Nama', 'Status', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-on-surface-variant uppercase tracking-label font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, idx) => (
                <tr key={a.id} className={idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                  <td className="px-4 py-2.5 text-on-surface font-medium">{a.bank_name}</td>
                  <td className="px-4 py-2.5 text-on-surface">{a.account_number}</td>
                  <td className="px-4 py-2.5 text-on-surface">{a.account_name}</td>
                  <td className="px-4 py-2.5">
                    <span className={[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      a.is_active
                        ? 'bg-primary-fixed text-on-primary-fixed-variant'
                        : 'bg-surface-container text-on-surface-variant',
                    ].join(' ')}>
                      {a.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      className={`text-xs hover:underline disabled:opacity-50 ${a.is_active ? 'text-error' : 'text-primary'}`}
                      disabled={saving}
                      onClick={() => handleToggle(a.id, a.is_active)}
                    >
                      {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Rekening Bank">
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
            <Button variant="primary" size="sm" icon="save" disabled={saving} onClick={handleCreate}>
              {saving ? 'Menyimpan...' : 'Simpan'}
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
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body animate-pulse text-center">Memuat...</p>
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
