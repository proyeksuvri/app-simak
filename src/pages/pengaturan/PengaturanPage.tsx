import { useMemo, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { ThemeCard, ThemeTabNav, ThemeButton } from '../../components/ui/Theme'
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
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileName, setProfileName] = useState(currentUser.nama === '...' ? '' : currentUser.nama)
  const [profilePassword, setProfilePassword] = useState('')
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  // Avatar CRUD
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError]         = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview]     = useState<string | null>(currentUser.avatar_url)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!avatarInputRef.current) avatarInputRef.current = e.target
    e.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Ukuran file maksimal 2 MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setAvatarError('Hanya file gambar yang diizinkan.')
      return
    }
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${currentUser.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const cacheBusted = `${publicUrl}?t=${Date.now()}`
      await supabase.auth.updateUser({ data: { avatar_url: cacheBusted } })
      setAvatarPreview(cacheBusted)
      setProfileSuccess('Foto profil berhasil diperbarui.')
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Gagal mengunggah foto.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarDelete = async () => {
    setAvatarError(null)
    setAvatarUploading(true)
    try {
      // Try to remove all common extensions
      const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
      await Promise.allSettled(
        exts.map(ext =>
          supabase.storage.from('avatars').remove([`${currentUser.id}/avatar.${ext}`])
        )
      )
      await supabase.auth.updateUser({ data: { avatar_url: null } })
      setAvatarPreview(null)
      setProfileSuccess('Foto profil berhasil dihapus.')
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Gagal menghapus foto.')
    } finally {
      setAvatarUploading(false)
    }
  }

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

  const openProfileModal = () => {
    setProfileName(currentUser.nama === '...' ? '' : currentUser.nama)
    setProfilePassword('')
    setProfilePasswordConfirm('')
    setProfileError(null)
    setProfileModalOpen(true)
  }

  const handleSaveProfile = async () => {
    const nama = profileName.trim()
    setProfileError(null)
    setProfileSuccess(null)

    if (!nama) {
      setProfileError('Nama wajib diisi.')
      return
    }

    if (profilePassword && profilePassword.length < 8) {
      setProfileError('Password baru minimal 8 karakter.')
      return
    }

    if (profilePassword !== profilePasswordConfirm) {
      setProfileError('Konfirmasi password belum sesuai.')
      return
    }

    setProfileSaving(true)

    const { data: authData, error: getUserError } = await supabase.auth.getUser()
    if (getUserError || !authData.user) {
      setProfileSaving(false)
      setProfileError(getUserError?.message ?? 'Sesi login tidak ditemukan.')
      return
    }

    const userMetadata = (authData.user.user_metadata ?? {}) as Record<string, unknown>
    const payload = {
      data: {
        ...userMetadata,
        nama,
      },
      ...(profilePassword ? { password: profilePassword } : {}),
    }

    const { error } = await supabase.auth.updateUser(payload)
    setProfileSaving(false)

    if (error) {
      setProfileError(error.message)
      return
    }

    setProfileModalOpen(false)
    setProfileSuccess(profilePassword
      ? 'Profil dan password berhasil diperbarui.'
      : 'Profil berhasil diperbarui.')
  }

  const allTabs = useMemo(() => {
    const base = [{ key: 'profil' as PengaturanTab, label: 'Profil' }]
    if (!isAdmin) return base
    return [
      ...base,
      { key: 'periode'   as PengaturanTab, label: 'Periode' },
      { key: 'user'      as PengaturanTab, label: 'User' },
      { key: 'rekening'  as PengaturanTab, label: 'Rekening Bank' },
      { key: 'kategori'  as PengaturanTab, label: 'Kategori Penerimaan' },
      { key: 'mekanisme' as PengaturanTab, label: 'Mekanisme Bisnis' },
      { key: 'jenis'     as PengaturanTab, label: 'Jenis Pendapatan' },
      { key: 'sumber'    as PengaturanTab, label: 'Sumber Pendapatan Bisnis' },
      { key: 'unit-kerja'as PengaturanTab, label: 'Unit Kerja' },
    ]
  }, [isAdmin])

  return (
    <PageContainer title="Pengaturan">
      <ThemeTabNav
        tabs={allTabs}
        activeTab={activeTab}
        onTabChange={(key) => setManualTab(key as PengaturanTab)}
        className="mb-6"
      />

      {activeTab === 'profil' && (
        <div className="grid grid-cols-2 gap-4">
          <ThemeCard className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                account_circle
              </span>
              <h3 className="text-sm font-semibold text-white font-headline tracking-wide uppercase">Profil Pengguna</h3>
            </div>
            <div className="flex items-center gap-4 mb-5">
              {/* Avatar with CRUD overlay */}
              <div className="relative flex-shrink-0 group">
                {/* Hidden file input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />

                {/* Avatar circle */}
                <div
                  className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#009B72,#006650)' }}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white font-headline select-none">
                      {currentUser.nama.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Upload overlay on hover */}
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                  title="Ganti foto"
                >
                  {avatarUploading ? (
                    <span className="material-symbols-outlined text-white animate-spin" style={{ fontSize: '1.1rem' }}>
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '1.1rem' }}>
                      photo_camera
                    </span>
                  )}
                </button>

                {/* Delete badge — top-right corner */}
                {avatarPreview && !avatarUploading && (
                  <button
                    type="button"
                    onClick={handleAvatarDelete}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: '#ef4444', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                    title="Hapus foto"
                  >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '0.65rem', fontVariationSettings: "'FILL' 1" }}>
                      close
                    </span>
                  </button>
                )}
              </div>

              <div>
                <p className="font-semibold text-white font-body">{currentUser.nama}</p>
                <p className="text-xs text-white/50 font-body">{USER_ROLE_LABELS[currentUser.role]}</p>
                <p className="text-xs text-white/40 font-body mt-0.5">{currentUser.email}</p>
                {avatarError && (
                  <p className="text-xs text-red-400 font-body mt-1">{avatarError}</p>
                )}
                <p className="text-[10px] text-white/25 font-body mt-1">
                  Hover foto untuk ganti · maks. 2 MB
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: 'NIP', value: currentUser.nip || '-' },
                { label: 'Role', value: USER_ROLE_LABELS[currentUser.role] },
                { label: 'Tahun Anggaran Aktif', value: String(tahunAnggaran) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/5">
                  <span className="text-xs text-white/50 font-body">{item.label}</span>
                  <span className="text-sm font-medium text-white font-body">{item.value}</span>
                </div>
              ))}
            </div>
            {profileSuccess && (
              <div className="mt-4 px-4 py-2.5 rounded-xl bg-[#009B72]/10 border border-[#009B72]/30 text-sm text-[#009B72] font-body">
                {profileSuccess}
              </div>
            )}
            <ThemeButton variant="text-primary" className="mt-4 w-full justify-center" onClick={openProfileModal}>
              <span className="material-symbols-outlined text-base">edit</span>
              Edit Profil
            </ThemeButton>
          </ThemeCard>

          <ThemeCard className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                settings
              </span>
              <h3 className="text-sm font-semibold text-white font-headline tracking-wide uppercase">Konfigurasi Sistem</h3>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Institusi', value: 'UIN Palopo' },
                { label: 'Jenis', value: 'BLU (Badan Layanan Umum)' },
                { label: 'Metode Akuntansi', value: 'Cash Basis' },
                { label: 'Tahun Anggaran', value: `${tahunAnggaran}` },
                { label: 'Versi Aplikasi', value: 'v1.0.0' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/5">
                  <span className="text-xs text-white/50 font-body">{item.label}</span>
                  <span className="text-sm font-medium text-white font-body">{item.value}</span>
                </div>
              ))}
            </div>
          </ThemeCard>
        </div>
      )}

      {activeTab === 'periode' && isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          {/* ── Buka Periode ── */}
          <ThemeCard className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                event_available
              </span>
              <h3 className="text-sm font-semibold text-white font-headline tracking-wide uppercase">
                Buka Periode
              </h3>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-white/60 mb-1.5">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white
                    bg-white/5 border border-white/10
                    focus:outline-none focus:ring-2 focus:ring-[#009B72]/50
                    transition-all appearance-none"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {periodsState.BULAN.map((label, idx) => {
                    if (!label) return null
                    return <option key={idx} value={idx} className="bg-[#1a2236] text-white">{label}</option>
                  })}
                </select>
              </div>
              <ThemeButton onClick={handleOpenPeriod} disabled={saving}>
                <span className="material-symbols-outlined text-base"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                  event_available
                </span>
                {saving ? 'Memproses...' : 'Buka Periode'}
              </ThemeButton>
            </div>

            {periodActionMsg && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-[#009B72]/10 border border-[#009B72]/30 text-sm text-[#009B72] font-body">
                {periodActionMsg}
              </div>
            )}
            {periodActionErr && (
              <div className="mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">
                {periodActionErr}
              </div>
            )}
          </ThemeCard>

          {/* ── Daftar Periode ── */}
          <ThemeCard>
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1E293B]">
              <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                calendar_month
              </span>
              <h3 className="text-sm font-semibold text-white font-headline tracking-wide uppercase">
                Periode Tahun {tahunAnggaran}
              </h3>
            </div>

            <div className="p-4">
              {periodsState.loading ? (
                <p className="text-sm text-white/40 font-body py-4 text-center">Memuat periode...</p>
              ) : periodsState.periods.length === 0 ? (
                <p className="text-sm text-white/40 font-body py-4 text-center">Belum ada periode untuk tahun ini.</p>
              ) : (
                <div className="space-y-2">
                  {periodsState.periods.map(period => (
                    <div
                      key={period.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div>
                        <p className="text-sm text-white font-body">
                          {period.code || `${periodsState.BULAN[period.month]}-${period.year}`}
                        </p>
                        <p className="text-xs mt-0.5 font-body">
                          {period.isClosed
                            ? <span className="text-red-400/80">Ditutup</span>
                            : <span className="text-[#009B72]">Aktif</span>
                          }
                        </p>
                      </div>
                      {!period.isClosed && (
                        <ThemeButton
                          variant="danger"
                          disabled={saving}
                          onClick={() => handleClosePeriod(period.id, period.month)}
                        >
                          <span className="material-symbols-outlined text-base"
                            style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                            lock
                          </span>
                          Tutup
                        </ThemeButton>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ThemeCard>
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

      <Modal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} title="Edit Profil" maxWidth="sm">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Lengkap" icon="badge">
            <input
              type="text"
              value={profileName}
              onChange={e => {
                setProfileName(e.target.value)
                setProfileError(null)
              }}
              placeholder="Masukkan nama lengkap"
              className={inputCls}
            />
          </FormField>

          <FormField label="NIP" icon="badge">
            <input
              type="text"
              value={currentUser.nip || currentUser.email.split('@')[0] || '-'}
              readOnly
              className={inputCls + ' cursor-not-allowed opacity-70'}
            />
          </FormField>

          <FormField label="Email Login" icon="mail">
            <input
              type="text"
              value={currentUser.email}
              readOnly
              className={inputCls + ' cursor-not-allowed opacity-70'}
            />
          </FormField>

          <FormField label="Password Baru" icon="lock">
            <input
              type="password"
              value={profilePassword}
              onChange={e => {
                setProfilePassword(e.target.value)
                setProfileError(null)
              }}
              placeholder="Kosongkan jika tidak ingin mengganti password"
              className={inputCls}
            />
          </FormField>

          <FormField label="Konfirmasi Password Baru" icon="lock_reset">
            <input
              type="password"
              value={profilePasswordConfirm}
              onChange={e => {
                setProfilePasswordConfirm(e.target.value)
                setProfileError(null)
              }}
              placeholder="Ulangi password baru"
              className={inputCls}
            />
          </FormField>

          {profileError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {profileError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5">
          <ThemeButton variant="text-primary" onClick={() => setProfileModalOpen(false)}>
            Batal
          </ThemeButton>
          <ThemeButton disabled={profileSaving} onClick={handleSaveProfile}>
            <span className="material-symbols-outlined text-base">save</span>
            {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </ThemeButton>
        </div>
      </Modal>
    </PageContainer>
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
      <ThemeCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>label</span>
            <div>
              <h3 className="text-sm font-semibold text-white font-headline">Kategori Penerimaan</h3>
              <p className="text-xs text-white/40 font-body">{categories.length} kategori terdaftar</p>
            </div>
          </div>
          <ThemeButton onClick={openAdd}>
            <span className="material-symbols-outlined text-base">add</span>
            Tambah Kategori
          </ThemeButton>
        </div>

        {success && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-[#009B72]/10 border border-[#009B72]/30 text-sm text-[#009B72] font-body">{success}</div>
        )}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">{error}</div>
        )}

        {loading ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Memuat...</p>
        ) : categories.length === 0 ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Belum ada kategori. Klik "Tambah Kategori" untuk menambahkan.</p>
        ) : (
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/10">
                {['No', 'Nama Kategori', 'Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-white/40 uppercase tracking-wide font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id} className={idx % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                  <td className="px-5 py-3.5 text-white/40 text-xs w-12">{idx + 1}</td>
                  <td className="px-5 py-3.5 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#009B72]"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>label</span>
                      {cat.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ThemeButton variant="text-primary" disabled={saving} onClick={() => openEdit(cat.id, cat.name)}>Edit</ThemeButton>
                      <ThemeButton variant="text-danger" disabled={saving} onClick={() => openDel(cat.id, cat.name)}>Hapus</ThemeButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ThemeCard>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Kategori Penerimaan">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Kategori" icon="label">
            <input type="text" placeholder="Contoh: Dana Hibah" className={inputCls}
              value={addName} onChange={e => { setAddName(e.target.value); setFormError(null) }} autoFocus />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setAddOpen(false)}>Batal</ThemeButton>
            <ThemeButton disabled={saving} onClick={handleAdd}>
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </ThemeButton>
          </div>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Kategori Penerimaan">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Kategori" icon="label">
            <input type="text" className={inputCls} value={editName}
              onChange={e => { setEditName(e.target.value); setFormError(null) }} autoFocus />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setEditOpen(false)}>Batal</ThemeButton>
            <ThemeButton disabled={saving} onClick={handleEdit}>
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </ThemeButton>
          </div>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Kategori">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-white/60 font-body">
            Yakin ingin menghapus kategori <span className="font-semibold text-white">"{delName}"</span>?
            Transaksi yang sudah menggunakan kategori ini tidak akan terpengaruh.
          </p>
          <div className="flex justify-end gap-2">
            <ThemeButton variant="text-primary" onClick={() => setDelOpen(false)}>Batal</ThemeButton>
            <ThemeButton variant="danger" disabled={saving} onClick={handleDelete}>
              {saving ? 'Menghapus...' : 'Hapus'}
            </ThemeButton>
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
      <ThemeCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>payments</span>
            <div>
              <h3 className="text-sm font-semibold text-white font-headline">Jenis Pendapatan</h3>
              <p className="text-xs text-white/40 font-body">{fundingSources.length} jenis terdaftar</p>
            </div>
          </div>
          <ThemeButton onClick={openAdd}>
            <span className="material-symbols-outlined text-base">add</span>
            Tambah Jenis
          </ThemeButton>
        </div>

        {success && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-[#009B72]/10 border border-[#009B72]/30 text-sm text-[#009B72] font-body">{success}</div>
        )}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">{error}</div>
        )}

        {loading ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Memuat...</p>
        ) : fundingSources.length === 0 ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Belum ada jenis pendapatan. Klik "Tambah Jenis" untuk menambahkan.</p>
        ) : (
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/10">
                {['No', 'Nama Jenis Pendapatan', 'Kode Akun BAS', 'Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-white/40 uppercase tracking-wide font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fundingSources.map((f, idx) => (
                <tr key={f.id} className={idx % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                  <td className="px-5 py-3.5 text-white/40 text-xs w-12">{idx + 1}</td>
                  <td className="px-5 py-3.5 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#009B72]"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>payments</span>
                      {f.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {f.kode_akun ? (
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-xs font-mono font-semibold border border-white/10">{f.kode_akun}</span>
                        <p className="text-xs text-white/40 mt-0.5 leading-tight">{getBasUraian(f.kode_akun)}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-white/25 italic">— Belum dipetakan —</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ThemeButton variant="text-primary" disabled={saving} onClick={() => openEdit(f.id, f.kode_akun)}>Edit</ThemeButton>
                      <ThemeButton variant="text-danger" disabled={saving} onClick={() => openDel(f.id, f.name)}>Hapus</ThemeButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ThemeCard>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Jenis Pendapatan" maxWidth="md">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Kode Akun BAS Pendapatan BLU" icon="tag">
            <select className={inputCls} value={addKodeAkun}
              onChange={e => { setAddKodeAkun(e.target.value); setFormError(null) }} autoFocus>
              <option value="" className="bg-[#1a2236]">— Pilih Kode Akun —</option>
              {BAS_PENDAPATAN_BLU.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(item => (
                    <option key={item.kode} value={item.kode} className="bg-[#1a2236]">{item.kode} — {item.uraian}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {addKodeAkun && (
              <p className="text-xs text-white/50 mt-1.5">Akan disimpan sebagai: <span className="font-semibold text-white">{getBasUraian(addKodeAkun)}</span></p>
            )}
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setAddOpen(false)}>Batal</ThemeButton>
            <ThemeButton disabled={saving} onClick={handleAdd}>
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </ThemeButton>
          </div>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Jenis Pendapatan" maxWidth="md">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Kode Akun BAS Pendapatan BLU" icon="tag">
            <select className={inputCls} value={editKodeAkun}
              onChange={e => { setEditKodeAkun(e.target.value); setFormError(null) }} autoFocus>
              <option value="" className="bg-[#1a2236]">— Pilih Kode Akun —</option>
              {BAS_PENDAPATAN_BLU.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(item => (
                    <option key={item.kode} value={item.kode} className="bg-[#1a2236]">{item.kode} — {item.uraian}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {editKodeAkun && (
              <p className="text-xs text-white/50 mt-1.5">Akan disimpan sebagai: <span className="font-semibold text-white">{getBasUraian(editKodeAkun)}</span></p>
            )}
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setEditOpen(false)}>Batal</ThemeButton>
            <ThemeButton disabled={saving} onClick={handleEdit}>
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </ThemeButton>
          </div>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Jenis Pendapatan">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-white/60 font-body">
            Yakin ingin menghapus jenis pendapatan <span className="font-semibold text-white">"{delName}"</span>?
          </p>
          <p className="text-xs text-white/40 font-body bg-white/5 rounded-lg px-3 py-2 border border-white/10">
            Jika masih digunakan oleh transaksi, penghapusan akan gagal secara otomatis.
          </p>
          {delError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{delError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <ThemeButton variant="text-primary" onClick={() => setDelOpen(false)}>Batal</ThemeButton>
            <ThemeButton variant="danger" disabled={saving} onClick={handleDelete}>
              {saving ? 'Menghapus...' : 'Hapus'}
            </ThemeButton>
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
      <ThemeCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>business_center</span>
            <div>
              <h3 className="text-sm font-semibold text-white font-headline">Mekanisme Bisnis</h3>
              <p className="text-xs text-white/40 font-body">{businessUnits.length} mekanisme terdaftar</p>
            </div>
          </div>
          <ThemeButton onClick={openAdd}>
            <span className="material-symbols-outlined text-base">add</span>
            Tambah Mekanisme
          </ThemeButton>
        </div>

        {success && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-[#009B72]/10 border border-[#009B72]/30 text-sm text-[#009B72] font-body">{success}</div>
        )}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">{error}</div>
        )}

        {loading ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Memuat...</p>
        ) : businessUnits.length === 0 ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Belum ada mekanisme bisnis. Klik "Tambah Mekanisme" untuk menambahkan.</p>
        ) : (
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/10">
                {['No', 'Nama Mekanisme Bisnis', 'Aksi'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-white/40 uppercase tracking-wide font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {businessUnits.map((b, idx) => (
                <tr key={b.id} className={idx % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                  <td className="px-5 py-3.5 text-white/40 text-xs w-12">{idx + 1}</td>
                  <td className="px-5 py-3.5 text-white font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#009B72]"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>business_center</span>
                      {b.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ThemeButton variant="text-primary" disabled={saving} onClick={() => openEdit(b.id, b.name)}>Edit</ThemeButton>
                      <ThemeButton variant="text-danger" disabled={saving} onClick={() => openDel(b.id, b.name)}>Hapus</ThemeButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ThemeCard>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Mekanisme Bisnis">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Mekanisme Bisnis" icon="business_center">
            <input type="text" placeholder="Contoh: BLU Pusat" className={inputCls}
              value={addName} onChange={e => { setAddName(e.target.value); setFormError(null) }} autoFocus />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setAddOpen(false)}>Batal</ThemeButton>
            <ThemeButton disabled={saving} onClick={handleAdd}>
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </ThemeButton>
          </div>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Mekanisme Bisnis">
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Mekanisme Bisnis" icon="business_center">
            <input type="text" className={inputCls} value={editName}
              onChange={e => { setEditName(e.target.value); setFormError(null) }} autoFocus />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setEditOpen(false)}>Batal</ThemeButton>
            <ThemeButton disabled={saving} onClick={handleEdit}>
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </ThemeButton>
          </div>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Mekanisme Bisnis">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-white/60 font-body">
            Yakin ingin menghapus mekanisme bisnis <span className="font-semibold text-white">"{delName}"</span>?
          </p>
          <p className="text-xs text-white/40 font-body bg-white/5 rounded-lg px-3 py-2 border border-white/10">
            Jika masih terhubung ke kategori penerimaan, penghapusan akan gagal secara otomatis.
          </p>
          {delError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{delError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <ThemeButton variant="text-primary" onClick={() => setDelOpen(false)}>Batal</ThemeButton>
            <ThemeButton variant="danger" disabled={saving} onClick={handleDelete}>
              {saving ? 'Menghapus...' : 'Hapus'}
            </ThemeButton>
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
      <ThemeCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>account_balance</span>
            <div>
              <h3 className="text-sm font-semibold text-white font-headline">Rekening Bank Penerimaan</h3>
              <p className="text-xs text-white/40 font-body">{accounts.length} rekening terdaftar</p>
            </div>
          </div>
          <ThemeButton onClick={openCreate}>
            <span className="material-symbols-outlined text-base">add</span>
            Tambah Rekening
          </ThemeButton>
        </div>

        {success && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-[#009B72]/10 border border-[#009B72]/30 text-sm text-[#009B72] font-body">{success}</div>
        )}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">{error}</div>
        )}

        {loading ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Memuat...</p>
        ) : accounts.length === 0 ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Belum ada rekening. Klik "Tambah Rekening" untuk menambahkan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-white/10">
                  {['Bank', 'No. Rekening', 'Atas Nama', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-white/40 uppercase tracking-wide font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                    <td className="px-5 py-3.5 text-white font-medium">{a.bank_name}</td>
                    <td className="px-5 py-3.5 text-white/70 font-mono text-xs">{a.account_number}</td>
                    <td className="px-5 py-3.5 text-white/70">{a.account_name}</td>
                    <td className="px-5 py-3.5">
                      <span className={[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        a.is_active ? 'bg-[#009B72]/15 text-[#009B72]' : 'bg-white/10 text-white/40',
                      ].join(' ')}>
                        {a.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <ThemeButton variant="text-primary" disabled={saving} onClick={() => openEdit(a)}>Edit</ThemeButton>
                        <ThemeButton
                          variant={a.is_active ? 'text-danger' : 'text-primary'}
                          disabled={saving}
                          onClick={() => handleToggle(a.id, a.is_active)}
                        >
                          {a.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </ThemeButton>
                        <ThemeButton variant="text-danger" disabled={saving} onClick={() => setDeleteId(a.id)}>Hapus</ThemeButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ThemeCard>

      {/* Modal Tambah / Edit */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={modalMode === 'edit' ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}>
        <div className="px-6 py-5 space-y-4">
          <FormField label="Nama Bank" icon="account_balance">
            <input type="text" placeholder="Contoh: Bank BRI" className={inputCls}
              value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
          </FormField>
          <FormField label="Nomor Rekening" icon="tag">
            <input type="text" placeholder="Contoh: 0001-01-000001-30-7" className={inputCls}
              value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} />
          </FormField>
          <FormField label="Atas Nama" icon="badge">
            <input type="text" placeholder="Contoh: UIN Palopo - Penerimaan UKT" className={inputCls}
              value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} />
          </FormField>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setModalOpen(false)}>Batal</ThemeButton>
            <ThemeButton disabled={saving} onClick={handleSave}>
              <span className="material-symbols-outlined text-base">save</span>
              {saving ? 'Menyimpan...' : modalMode === 'edit' ? 'Simpan Perubahan' : 'Simpan'}
            </ThemeButton>
          </div>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Rekening Bank">
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-white/60 font-body">Yakin ingin menghapus rekening berikut?</p>
          {deleteTarget && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-body space-y-1">
              <p><span className="text-white/40">Bank:</span> <span className="font-medium text-white">{deleteTarget.bank_name}</span></p>
              <p><span className="text-white/40">No. Rekening:</span> <span className="font-medium text-white">{deleteTarget.account_number}</span></p>
              <p><span className="text-white/40">Atas Nama:</span> <span className="font-medium text-white">{deleteTarget.account_name}</span></p>
            </div>
          )}
          <p className="text-xs text-white/40 font-body">Rekening yang dihapus tidak akan muncul di daftar maupun form input transaksi.</p>
          <div className="flex justify-end gap-2 pt-1">
            <ThemeButton variant="text-primary" onClick={() => setDeleteId(null)}>Batal</ThemeButton>
            <ThemeButton variant="danger" disabled={saving} onClick={handleDelete}>
              <span className="material-symbols-outlined text-base">delete</span>
              {saving ? 'Menghapus...' : 'Hapus'}
            </ThemeButton>
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

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-body focus:outline-none focus:ring-2 focus:ring-[#009B72]/50 focus:border-[#009B72]/50 transition-all placeholder:text-white/30'

function FormField({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-white/60 font-body mb-1.5">
        <span className="material-symbols-outlined text-[0.85rem] text-[#009B72]"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
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
  const [nipCreate, setNipCreate]   = useState('')
  const [nipEdit, setNipEdit]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [editError, setEditError]   = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

  const openModal = () => { setForm(EMPTY_FORM); setNipCreate(''); setError(null); setModalOpen(true) }

  const openEdit = (u: ReturnType<typeof useUsers>['users'][number]) => {
    const nip = u.email.replace('@uinpalopo.ac.id', '')
    setNipEdit(nip)
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
    if (!nipCreate || nipCreate.length !== 18) {
      setError('NIP harus 18 digit angka.'); return
    }
    if (!form.password || !form.nama) {
      setError('Nama dan password wajib diisi.'); return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.'); return
    }
    if (form.role === 'Operator' && form.category === 'bendahara_pembantu' && !form.work_unit_id) {
      setError('Unit Kerja wajib dipilih untuk Bendahara Pengeluaran Pembantu.'); return
    }
    const email = `${nipCreate}@uinpalopo.ac.id`
    setSaving(true)
    const err = await createUser({ ...form, email })
    setSaving(false)
    if (err) { setError(err); return }
    setModalOpen(false)
    setSuccess(`User NIP ${nipCreate} berhasil dibuat.`)
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
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-white/40 font-body">
            {usersState.users.length} pengguna terdaftar
          </p>
          <ThemeButton onClick={openModal}>
            <span className="material-symbols-outlined text-base">person_add</span>
            Tambah User
          </ThemeButton>
        </div>

        {success && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-sm text-emerald-400 font-body">
            {success}
          </div>
        )}
        {error && !modalOpen && (
          <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">
            {error}
          </div>
        )}

        {/* Table */}
        <ThemeCard>
          <div className="overflow-x-auto">
            {usersState.loading ? (
              <p className="text-center py-10 text-white/40 text-sm font-body">Memuat...</p>
            ) : (
              <table className="w-full text-sm font-body">
                <thead className="text-white/40 uppercase tracking-wide text-xs">
                  <tr className="border-b border-white/10">
                    {['NIP', 'Nama', 'Role', 'Aksi'].map(h => (
                      <th key={h} className="text-left px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usersState.users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-white/30">
                        Belum ada pengguna. Klik "Tambah User" untuk membuat yang pertama.
                      </td>
                    </tr>
                  ) : usersState.users.map((u) => {
                    const nip = u.email.replace('@uinpalopo.ac.id', '')
                    const isMe = u.userId === currentUserId
                    return (
                      <tr key={u.userId} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                        <td className="px-6 py-4 font-mono text-white/70">{nip}</td>
                        <td className="px-6 py-4 text-white/90 font-medium">{u.email.split('@')[0]}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs">
                            {USER_ROLE_LABELS[u.role]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {isMe ? (
                            <span className="italic text-white/30">Anda</span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                className="text-blue-400 hover:text-blue-300 transition"
                                onClick={() => openEdit(u)}
                              >
                                Edit
                              </button>
                              <button
                                className="text-red-400 hover:text-red-300 transition disabled:opacity-40"
                                disabled={deleting === u.userId}
                                onClick={() => handleDelete(u.userId, u.email)}
                              >
                                {deleting === u.userId ? 'Menghapus...' : 'Hapus'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </ThemeCard>
      </div>

      {/* Modal edit user */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Pengguna">
        <div className="px-6 py-5 space-y-5 font-body">

          {/* ── NIP (readonly) ── */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">NIP</label>
            <input
              type="text"
              value={nipEdit}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white/40 font-mono tracking-wider
                bg-white/10 border border-white/10 cursor-not-allowed"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="material-symbols-outlined text-[0.85rem] text-white/25">mail</span>
              <p className="text-[11px] text-white/30">
                Email: <span className="font-mono text-white/50">{editForm.email}</span>
              </p>
            </div>
          </div>

          {/* ── Nama ── */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Nama Lengkap <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Nama lengkap"
              value={editForm.nama}
              onChange={e => setEditForm(f => ({ ...f, nama: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25
                bg-white/5 border border-white/10
                focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                transition-all"
            />
          </div>

          {/* ── Password ── */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Password Baru</label>
            <input
              type="password"
              placeholder="Kosongkan jika tidak diubah"
              value={editForm.password ?? ''}
              onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25
                bg-white/5 border border-white/10
                focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                transition-all"
            />
            {(editForm.password?.length ?? 0) > 0 && (editForm.password?.length ?? 0) < 6 && (
              <p className="text-[11px] text-amber-400/80 mt-1">
                Password minimal 6 karakter
              </p>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-white/8" />

          {/* ── Role ── */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-2.5">Role</label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_OPTIONS.map(o => {
                const active = editForm.role === o.value
                const icon = o.value === 'Admin' ? 'admin_panel_settings'
                  : o.value === 'Approver' ? 'verified_user'
                  : 'manage_accounts'
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, role: o.value }))}
                    className={[
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-150',
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/40'
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-[0.9rem]"
                      style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
                      {icon}
                    </span>
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Kategori Bendahara ── */}
          {editForm.role === 'Operator' && (
            <div className="space-y-3 pl-1 border-l-2 border-emerald-600/30">
              <div className="pl-3">
                <label className="block text-xs font-medium text-white/60 mb-1.5">Kategori Bendahara</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value as BendaharaKategori }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white
                    bg-white/5 border border-white/10
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                    transition-all appearance-none"
                >
                  {KATEGORI_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} className="bg-[#1a2236] text-white">{o.label}</option>
                  ))}
                </select>
              </div>

              {editForm.category === 'bendahara_pembantu' && (
                <div className="pl-3">
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Unit Kerja <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={editForm.work_unit_id}
                    onChange={e => setEditForm(f => ({ ...f, work_unit_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white
                      bg-white/5 border border-white/10
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                      transition-all appearance-none"
                  >
                    <option value="" className="bg-[#1a2236]">— Pilih Unit Kerja —</option>
                    {workUnits.map(u => (
                      <option key={u.id} value={u.id} className="bg-[#1a2236] text-white">{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── Error ── */}
          {editError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {editError}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/50
                bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/70
                transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleEdit}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white
                bg-emerald-600 hover:bg-emerald-500 border border-emerald-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg shadow-emerald-900/30"
            >
              <span className="material-symbols-outlined text-[1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                save
              </span>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal tambah user */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Pengguna Baru">
        <div className="px-6 py-5 space-y-6 font-body">

          {/* ── Seksi: Identitas ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-emerald-500 text-[1.1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                badge
              </span>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.12em]">
                Identitas
              </p>
            </div>

            <div className="space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rizal Mappasomba"
                  value={form.nama}
                  onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25
                    bg-white/5 border border-white/10
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                    transition-all"
                />
              </div>

              {/* NIP */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  NIP <span className="text-red-400">*</span>
                  <span className="ml-2 text-white/30 font-normal">18 digit angka</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={18}
                  placeholder="197711172010011015"
                  value={nipCreate}
                  onChange={e => setNipCreate(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 font-mono tracking-wider
                    bg-white/5 border border-white/10
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                    transition-all"
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="material-symbols-outlined text-[0.85rem] text-white/25">mail</span>
                  <p className="text-[11px] text-white/30">
                    Login via: <span className="font-mono text-white/50">{nipCreate || '...'}</span>@uinpalopo.ac.id
                  </p>
                </div>
                {nipCreate.length > 0 && nipCreate.length !== 18 && (
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    {nipCreate.length}/18 digit
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Password <span className="text-red-400">*</span>
                  <span className="ml-2 text-white/30 font-normal">min. 8 karakter</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25
                    bg-white/5 border border-white/10
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                    transition-all"
                />
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    {form.password.length}/8 karakter minimum
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-white/8" />

          {/* ── Seksi: Hak Akses ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-emerald-500 text-[1.1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                shield_person
              </span>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.12em]">
                Hak Akses
              </p>
            </div>

            <div className="space-y-4">
              {/* Role chips */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2.5">Role</label>
                <div className="flex gap-2 flex-wrap">
                  {ROLE_OPTIONS.map(o => {
                    const active = form.role === o.value
                    const icon = o.value === 'Admin' ? 'admin_panel_settings'
                      : o.value === 'Approver' ? 'verified_user'
                      : 'manage_accounts'
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: o.value }))}
                        className={[
                          'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-150',
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/40'
                            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80',
                        ].join(' ')}
                      >
                        <span className="material-symbols-outlined text-[0.9rem]"
                          style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
                          {icon}
                        </span>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Kategori Bendahara — tampil jika role = Operator */}
              {form.role === 'Operator' && (
                <div className="space-y-3 pl-1 border-l-2 border-emerald-600/30">
                  <div className="pl-3">
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      Kategori Bendahara
                    </label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value as BendaharaKategori }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white
                        bg-white/5 border border-white/10
                        focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                        transition-all appearance-none"
                    >
                      {KATEGORI_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} className="bg-[#1a2236] text-white">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.category === 'bendahara_pembantu' && (
                    <div className="pl-3">
                      <label className="block text-xs font-medium text-white/60 mb-1.5">
                        Unit Kerja <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={form.work_unit_id}
                        onChange={e => setForm(f => ({ ...f, work_unit_id: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white
                          bg-white/5 border border-white/10
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
                          transition-all appearance-none"
                      >
                        <option value="" className="bg-[#1a2236]">— Pilih Unit Kerja —</option>
                        {workUnits.map(u => (
                          <option key={u.id} value={u.id} className="bg-[#1a2236] text-white">{u.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {error}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/50
                bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/70
                transition-all"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white
                bg-emerald-600 hover:bg-emerald-500 border border-emerald-600
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-lg shadow-emerald-900/30"
            >
              <span className="material-symbols-outlined text-[1rem]"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                person_add
              </span>
              {saving ? 'Membuat...' : 'Buat User'}
            </button>
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

  const darkInput = `w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25
    bg-white/5 border border-white/10
    focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
    transition-all`

  const formFieldsJsx = (
    <div className="space-y-4 px-6 py-5 font-body">
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          Nama <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="Contoh: Pendapatan Jasa Layanan"
          value={formName}
          onChange={e => { setFormName(e.target.value); setFormError(null) }}
          className={darkInput}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          Kode <span className="text-white/30 font-normal">(opsional)</span>
        </label>
        <input
          type="text"
          placeholder="Contoh: SPB-001"
          value={formKode}
          onChange={e => setFormKode(e.target.value)}
          className={darkInput + ' font-mono tracking-wider'}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          Deskripsi <span className="text-white/30 font-normal">(opsional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="Keterangan singkat tentang sumber pendapatan ini"
          value={formDeskripsi}
          onChange={e => setFormDeskripsi(e.target.value)}
          className={darkInput + ' resize-none'}
        />
      </div>
      {formError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <span className="material-symbols-outlined text-[1rem]">error</span>
          {formError}
        </div>
      )}
    </div>
  )

  const modalActions = (onCancel: () => void, onConfirm: () => void, confirmLabel: string) => (
    <div className="flex justify-end gap-2 px-6 pb-5">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl text-sm font-medium text-white/50
          bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/70
          transition-all font-body"
      >
        Batal
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={onConfirm}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white
          bg-emerald-600 hover:bg-emerald-500 border border-emerald-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all shadow-lg shadow-emerald-900/30 font-body"
      >
        {saving ? 'Menyimpan...' : confirmLabel}
      </button>
    </div>
  )

  return (
    <>
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-white/40 font-body">
          {items.length} sumber terdaftar
        </p>
        <ThemeButton onClick={openAdd}>
          <span className="material-symbols-outlined text-base">add</span>
          Tambah Sumber
        </ThemeButton>
      </div>

      {success && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-sm text-emerald-400 font-body">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-body">
          {error}
        </div>
      )}

      {/* ── Tabel ── */}
      <ThemeCard>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center py-10 text-white/40 text-sm font-body">Memuat...</p>
          ) : (
            <table className="w-full text-sm font-body">
              <thead className="text-white/40 uppercase tracking-wide text-xs">
                <tr className="border-b border-white/10">
                  {['No', 'Nama', 'Kode', 'Deskripsi', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-white/30">
                        <span className="material-symbols-outlined text-3xl"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                          account_balance
                        </span>
                        <p>Belum ada sumber pendapatan bisnis</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-all duration-150">
                    <td className="px-5 py-4 text-white/30 text-xs w-12">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-white/30"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                          account_balance
                        </span>
                        <span className="text-white/90 font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {item.kode ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white/10 text-white/70 text-xs font-mono font-semibold border border-white/10">
                          {item.kode}
                        </span>
                      ) : (
                        <span className="text-xs text-white/25 italic">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-white/40 max-w-xs truncate">
                      {item.deskripsi || <span className="italic">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(item.id, item.name, item.kode, item.deskripsi)}
                          className="text-white/40 hover:text-blue-400 transition"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => openDel(item.id, item.name)}
                          className="text-white/40 hover:text-red-400 transition"
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
        </div>
      </ThemeCard>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Sumber Pendapatan Bisnis" maxWidth="sm">
        {formFieldsJsx}
        {modalActions(() => setAddOpen(false), handleAdd, 'Simpan')}
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Sumber Pendapatan Bisnis" maxWidth="sm">
        {formFieldsJsx}
        {modalActions(() => setEditOpen(false), handleEdit, 'Perbarui')}
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Sumber Pendapatan?" maxWidth="sm">
        <div className="px-6 py-5 space-y-3 font-body">
          <p className="text-sm text-white/70">
            Hapus sumber pendapatan <span className="font-semibold text-white">"{delName}"</span>?
            Transaksi yang sudah menggunakan sumber ini tidak akan terpengaruh.
          </p>
          {delError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              <span className="material-symbols-outlined text-[1rem]">error</span>
              {delError}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            type="button"
            onClick={() => setDelOpen(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white/50
              bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/70
              transition-all font-body"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleDelete}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white
              bg-red-600 hover:bg-red-500 border border-red-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all shadow-lg shadow-red-900/30 font-body"
          >
            <span className="material-symbols-outlined text-[1rem]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
              delete
            </span>
            {saving ? 'Menghapus...' : 'Hapus'}
          </button>
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
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          Nama Unit Kerja <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="Contoh: FUAD, FTIK, LP2M"
          value={formName}
          onChange={e => { setFormName(e.target.value); setFormError(null) }}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          Induk Unit Kerja <span className="text-white/40 font-normal">(opsional)</span>
        </label>
        <select
          value={parentId}
          onChange={e => setParentId(e.target.value)}
          className={inputCls}
        >
          <option value="" className="bg-[#1a2236]">— Tidak ada (unit utama) —</option>
          {roots.filter(r => r.id !== editId).map(r => (
            <option key={r.id} value={r.id} className="bg-[#1a2236]">{r.name}</option>
          ))}
        </select>
      </div>
      {formError && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body">
          <span className="material-symbols-outlined text-[1rem]">error</span>{formError}
        </div>
      )}
    </div>
  )

  return (
    <>
      <ThemeCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#009B72] text-[1.1rem]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>corporate_fare</span>
            <div>
              <h3 className="text-sm font-semibold text-white font-headline">Unit Kerja</h3>
              <p className="text-xs text-white/40 font-body">{workUnits.length} unit terdaftar</p>
            </div>
          </div>
          <ThemeButton onClick={openAdd}>
            <span className="material-symbols-outlined text-base">add</span>
            Tambah Unit Kerja
          </ThemeButton>
        </div>

        {success && (
          <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl bg-[#009B72]/10 border border-[#009B72]/30 text-sm text-[#009B72] font-body">{success}</div>
        )}

        {loading ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Memuat...</p>
        ) : workUnits.length === 0 ? (
          <p className="py-10 text-sm text-white/40 font-body text-center">Belum ada unit kerja. Klik "Tambah Unit Kerja" untuk menambahkan.</p>
        ) : (
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 text-left text-xs text-white/40 uppercase tracking-wide font-medium">Nama Unit Kerja</th>
                <th className="px-5 py-3 text-left text-xs text-white/40 uppercase tracking-wide font-medium">Induk</th>
                <th className="px-5 py-3 text-left text-xs text-white/40 uppercase tracking-wide font-medium">Sub-Unit</th>
                <th className="px-5 py-3 text-right text-xs text-white/40 uppercase tracking-wide font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {workUnits.map((u, idx) => {
                const parent = workUnits.find(p => p.id === u.parent_id)
                const subCount = children.filter(c => c.parent_id === u.id).length
                return (
                  <tr key={u.id} className={idx % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-white">{u.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {parent
                        ? <span className="text-white/70">{parent.name}</span>
                        : <span className="text-white/25 italic">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      {subCount > 0
                        ? <span className="text-xs bg-[#009B72]/15 text-[#009B72] px-2.5 py-0.5 rounded-full font-medium">{subCount} sub-unit</span>
                        : <span className="text-white/25">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-3">
                        <ThemeButton variant="text-primary" onClick={() => openEdit(u)}>Edit</ThemeButton>
                        <ThemeButton variant="text-danger" onClick={() => openDel(u.id, u.name)}>Hapus</ThemeButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </ThemeCard>

      {/* Modal Tambah */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Unit Kerja" maxWidth="sm">
        {formFieldsJsx}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <ThemeButton variant="text-primary" onClick={() => setAddOpen(false)}>Batal</ThemeButton>
          <ThemeButton disabled={saving} onClick={handleAdd}>
            <span className="material-symbols-outlined text-base">save</span>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </ThemeButton>
        </div>
      </Modal>

      {/* Modal Edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Unit Kerja" maxWidth="sm">
        {formFieldsJsx}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <ThemeButton variant="text-primary" onClick={() => setEditOpen(false)}>Batal</ThemeButton>
          <ThemeButton disabled={saving} onClick={handleEdit}>
            <span className="material-symbols-outlined text-base">save</span>
            {saving ? 'Menyimpan...' : 'Perbarui'}
          </ThemeButton>
        </div>
      </Modal>

      {/* Modal Hapus */}
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus Unit Kerja" maxWidth="sm">
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-white/60 font-body">
            Hapus unit kerja <span className="font-semibold text-white">"{delName}"</span>?
            Transaksi yang sudah menggunakan unit ini tidak akan terpengaruh.
          </p>
          {delError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body">
              <span className="material-symbols-outlined text-[1rem]">error</span>{delError}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <ThemeButton variant="text-primary" onClick={() => setDelOpen(false)}>Batal</ThemeButton>
          <ThemeButton variant="danger" disabled={saving} onClick={handleDelete}>
            {saving ? 'Menghapus...' : 'Hapus'}
          </ThemeButton>
        </div>
      </Modal>
    </>
  )
}
