import { useAppContext } from '../../context/AppContext'
import { USER_ROLE_LABELS } from '../../types'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarSection } from './SidebarSection'

export function Sidebar() {
  const { currentUser, signOut } = useAppContext()
  const role = currentUser.role

  return (
    <aside className="w-64 flex-shrink-0 h-screen bg-surface-container-low flex flex-col overflow-y-auto relative">

      {/* Islamic geometric pattern texture — ~4% opacity, purely decorative */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.04] z-0"
        style={{ backgroundImage: 'var(--pattern-islamic)', backgroundSize: '60px 60px' }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-gradient flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[1.1rem]">account_balance</span>
          </div>
          <div>
            <p className="text-sm font-bold text-primary font-headline leading-tight">SIMAK BKU</p>
            <p className="text-[0.65rem] text-on-surface-variant font-body leading-tight">UIN Palopo</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-4">
          <SidebarSection label="Utama">
            <SidebarNavItem to="/dashboard" icon="dashboard" label="Dashboard" />
          </SidebarSection>

          {(role === 'bendahara_penerimaan' || role === 'bendahara_induk' || role === 'admin') && (
            <SidebarSection label="Transaksi">
              {(role === 'bendahara_penerimaan' || role === 'admin') && (
                <SidebarNavItem to="/penerimaan/bpn"     icon="receipt_long"  label="Penerimaan (BPN)" />
              )}
              {(role === 'bendahara_induk' || role === 'admin') && (
                <SidebarNavItem to="/pengeluaran/bpk"    icon="payments"      label="Pengeluaran (BPK)" />
              )}
              {(role === 'bendahara_induk' || role === 'admin') && (
                <SidebarNavItem to="/pengeluaran/up-tup" icon="request_quote" label="Pengajuan UP/TUP" />
              )}
            </SidebarSection>
          )}

          {role === 'bendahara_pembantu' && (
            <SidebarSection label="Transaksi Unit">
              <SidebarNavItem to="/pengeluaran/bpk"    icon="payments"      label="Bukti Pengeluaran" />
              <SidebarNavItem to="/pengeluaran/up-tup" icon="request_quote" label="Pengajuan UP/TUP" />
            </SidebarSection>
          )}

          <SidebarSection label="Buku Kas Umum">
            {(role === 'bendahara_penerimaan' || role === 'admin') && (
              <SidebarNavItem to="/bku/penerimaan" icon="menu_book"     label="BKU Penerimaan" />
            )}
            {(role === 'bendahara_induk' || role === 'admin') && (
              <SidebarNavItem to="/bku/induk"      icon="book"          label="BKU Induk" />
            )}
            {(role === 'bendahara_pembantu' || role === 'bendahara_induk' || role === 'admin') && (
              <SidebarNavItem to="/bku/pembantu"   icon="library_books" label="BKU Pembantu" />
            )}
            {(role === 'bendahara_induk' || role === 'admin') && (
              <SidebarNavItem to="/bku/penutupan"  icon="lock_clock"    label="Penutupan Harian" />
            )}
          </SidebarSection>

          {(role === 'bendahara_induk' || role === 'admin') && (
            <SidebarSection label="Rekonsiliasi">
              <SidebarNavItem to="/rekonsiliasi"          icon="sync_alt" label="Rekonsiliasi Bank" />
              <SidebarNavItem to="/rekonsiliasi/opname"   icon="balance"  label="Opname Kas" />
            </SidebarSection>
          )}

          {(role === 'pimpinan' || role === 'admin') && (
            <SidebarSection label="Persetujuan">
              <SidebarNavItem to="/approval" icon="fact_check" label="Persetujuan Transaksi" />
            </SidebarSection>
          )}

          <SidebarSection label="Laporan">
            <SidebarNavItem to="/laporan" icon="summarize" label="Laporan" />
          </SidebarSection>

          {role === 'admin' ? (
            <SidebarSection label="Sistem">
              <SidebarNavItem to="/pengaturan/users" icon="manage_accounts" label="Manajemen User" />
              <SidebarNavItem to="/pengaturan/units" icon="corporate_fare"  label="Unit Kerja" />
              <SidebarNavItem to="/pengaturan"       icon="settings"        label="Pengaturan" />
            </SidebarSection>
          ) : (
            <SidebarSection label="Sistem">
              <SidebarNavItem to="/pengaturan" icon="settings" label="Pengaturan" />
            </SidebarSection>
          )}
        </nav>

        {/* User Card + Logout */}
        <div className="mx-3 mb-4 p-3 bg-surface-container rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary font-headline">
                {currentUser.nama.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-on-surface font-body truncate">{currentUser.nama}</p>
              <p className="text-[0.6rem] text-on-surface-variant font-body truncate">
                {USER_ROLE_LABELS[currentUser.role]}
              </p>
            </div>
            <button
              onClick={signOut}
              title="Keluar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[1rem]"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                logout
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
