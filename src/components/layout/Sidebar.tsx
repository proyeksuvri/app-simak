import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { USER_ROLE_LABELS } from '../../types'
import { SidebarNavItem } from './SidebarNavItem'

function SidebarGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 mb-1 group"
      >
        <p
          className="text-[0.58rem] font-semibold uppercase tracking-widest font-body transition-colors"
          style={{ color: open ? 'rgba(232,234,240,0.5)' : 'rgba(232,234,240,0.3)' }}
        >
          {label}
        </p>
        <span
          className="material-symbols-outlined transition-transform duration-200"
          style={{
            fontSize: '0.75rem',
            color: 'rgba(232,234,240,0.25)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
          }}
        >
          expand_more
        </span>
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  )
}

export function Sidebar() {
  const { currentUser, signOut } = useAppContext()
  const navigate = useNavigate()
  const role = currentUser.role

  const isBendaharaPenerimaan = role === 'bendahara_penerimaan'
  const isBendaharaInduk      = role === 'bendahara_induk'
  const isBendaharaPembantu   = role === 'bendahara_pembantu'
  const isAdmin               = role === 'admin'
  const isPimpinan            = role === 'pimpinan'

  return (
    <aside
      className="w-52 flex-shrink-0 h-screen flex flex-col overflow-y-auto scrollbar-hide"
      style={{
        scrollbarWidth: 'none',
        background: '#10131a',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
        >
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
          >account_balance</span>
        </div>
        <div>
          <p className="text-sm font-bold font-headline leading-tight" style={{ color: '#e8eaf0' }}>SIMAK UIN</p>
          <p className="text-[0.6rem] font-body leading-tight" style={{ color: 'rgba(232,234,240,0.4)' }}>Palopo Finance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 flex flex-col">

        {/* Beranda */}
        <div className="flex flex-col gap-0.5 mt-1">
          <SidebarNavItem to="/dashboard" icon="dashboard" label="Dashboard" />
        </div>

        {/* Transaksi */}
        {(isBendaharaPenerimaan || isBendaharaInduk || isBendaharaPembantu || isAdmin) && (
          <SidebarGroup label="Transaksi">
            {(isBendaharaPenerimaan || isAdmin) && (
              <SidebarNavItem to="/penerimaan/bpn"        icon="receipt_long"  label="Penerimaan (BPN)" />
            )}
            {(isBendaharaPenerimaan || isAdmin) && (
              <SidebarNavItem to="/penerimaan/bpn-keluar" icon="money_off"     label="Pengeluaran BPN" />
            )}
            {(isBendaharaInduk || isBendaharaPembantu || isAdmin) && (
              <SidebarNavItem to="/pengeluaran/bpk"    icon="payments"      label="Pengeluaran (BPK)" />
            )}
            {(isBendaharaInduk || isBendaharaPembantu || isAdmin) && (
              <SidebarNavItem to="/pengeluaran/up-tup" icon="request_quote" label="Pengajuan UP/TUP" />
            )}
          </SidebarGroup>
        )}

        {/* BKU Penerimaan */}
        {(isBendaharaPenerimaan || isAdmin) && (
          <SidebarGroup label="BKU Penerimaan">
            <SidebarNavItem to="/bku/penerimaan"                icon="menu_book"       label="BKU Penerimaan" />
            <SidebarNavItem to="/bku/pembantu-penerimaan"       icon="library_books"   label="Pembantu Penerimaan" />
            <SidebarNavItem to="/bku/pembantu-rekening"         icon="account_balance" label="Pembantu Rekening" />
            <SidebarNavItem to="/bku/pembantu-jenis-pendapatan" icon="category"        label="Pembantu Jenis" />
          </SidebarGroup>
        )}

        {/* BKU Pengeluaran */}
        {(isBendaharaInduk || isBendaharaPembantu || isAdmin) && (
          <SidebarGroup label="BKU Pengeluaran">
            {(isBendaharaInduk || isAdmin) && (
              <SidebarNavItem to="/bku/induk"     icon="book"          label="BKU Induk" />
            )}
            <SidebarNavItem to="/bku/pembantu"    icon="library_books" label="BKU Pembantu" />
            {(isBendaharaInduk || isAdmin) && (
              <SidebarNavItem to="/bku/penutupan" icon="lock_clock"    label="Penutupan Harian" />
            )}
          </SidebarGroup>
        )}

        {/* Rekonsiliasi */}
        {(isBendaharaInduk || isAdmin) && (
          <SidebarGroup label="Rekonsiliasi">
            <SidebarNavItem to="/rekonsiliasi"        icon="sync_alt" label="Rekonsiliasi Bank" />
            <SidebarNavItem to="/rekonsiliasi/opname" icon="balance"  label="Opname Kas" />
          </SidebarGroup>
        )}

        {/* Persetujuan */}
        {(isPimpinan || isAdmin) && (
          <SidebarGroup label="Persetujuan">
            <SidebarNavItem to="/approval" icon="fact_check" label="Persetujuan" />
          </SidebarGroup>
        )}

        {/* Laporan & Admin */}
        <SidebarGroup label="Laporan">
          <SidebarNavItem to="/laporan"                      icon="summarize"      label="Laporan" />
          <SidebarNavItem to="/laporan/pendapatan-summary"   icon="bar_chart"      label="Ringkasan Pendapatan" />
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup label="Administrasi">
            <SidebarNavItem to="/pengaturan/users" icon="manage_accounts" label="Manajemen User" />
            <SidebarNavItem to="/pengaturan/units" icon="corporate_fare"  label="Unit Kerja" />
          </SidebarGroup>
        )}

      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={() => navigate(isBendaharaPenerimaan ? '/penerimaan/bpn' : '/pengeluaran/bpk')}
          className="w-full py-2.5 rounded-xl text-xs font-semibold font-body text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-75 mb-2"
          style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: "'FILL' 0" }}>add</span>
          Alokasi Baru
        </button>

        <SidebarNavItem to="/pengaturan" icon="settings" label="Pengaturan" />

        {/* User row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-1"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
          >
            {currentUser.nama.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold font-body truncate" style={{ color: '#e8eaf0' }}>
              {currentUser.nama.split(' ')[0]}
            </p>
            <p className="text-[0.6rem] font-body truncate" style={{ color: 'rgba(232,234,240,0.4)' }}>
              {USER_ROLE_LABELS[currentUser.role]}
            </p>
          </div>
          <button
            onClick={signOut}
            title="Keluar"
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ color: 'rgba(232,234,240,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,234,240,0.35)')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: "'FILL' 0" }}>logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
