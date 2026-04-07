import { createBrowserRouter, redirect } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthGuard } from '../components/auth/AuthGuard'
import { LoginPage } from '../pages/auth/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import LandingPage from '../pages/LandingPage'
import { BPNPage } from '../pages/penerimaan/BPNPage'
import { BPKPage } from '../pages/pengeluaran/BPKPage'
import { UPTUPPage } from '../pages/pengeluaran/UPTUPPage'
import { BKUPenerimaanPage } from '../pages/bku/BKUPenerimaanPage'
import { BKUIndukPage } from '../pages/bku/BKUIndukPage'
import { BKUPembantuPage } from '../pages/bku/BKUPembantuPage'
import { BKUPembantuPenerimaanPage } from '../pages/bku/BKUPembantuPenerimaanPage'
import { BKUPembantuRekeningPage } from '../pages/bku/BKUPembantuRekeningPage'
import { BKUPembantuJenisPendapatanPage } from '../pages/bku/BKUPembantuJenisPendapatanPage'
import { PenutupanHarianPage } from '../pages/bku/PenutupanHarianPage'
import { RekonsiliasiPage } from '../pages/rekonsiliasi/RekonsiliasiPage'
import { LaporanPage } from '../pages/laporan/LaporanPage'
import { PengaturanPage } from '../pages/pengaturan/PengaturanPage'
import { ApprovalPage }  from '../pages/approval/ApprovalPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: 'login', element: <LoginPage /> },
  {
    path:    '',
    element: <AuthGuard />, 
    children: [
      {
        element: <AppLayout />, 
        children: [
          { path: 'dashboard',            element: <DashboardPage /> },
          { path: 'penerimaan/bpn',       element: <BPNPage /> },
          { path: 'pengeluaran/bpk',      element: <BPKPage /> },
          { path: 'pengeluaran/up-tup',   element: <UPTUPPage /> },
          { path: 'bku/penerimaan',       element: <BKUPenerimaanPage /> },
          { path: 'bku/induk',            element: <BKUIndukPage /> },
          { path: 'bku/pembantu',                  element: <BKUPembantuPage /> },
          { path: 'bku/pembantu-penerimaan',  element: <BKUPembantuPenerimaanPage /> },
          { path: 'bku/pembantu-rekening',         element: <BKUPembantuRekeningPage /> },
          { path: 'bku/pembantu-jenis-pendapatan', element: <BKUPembantuJenisPendapatanPage /> },
          { path: 'bku/penutupan',        element: <PenutupanHarianPage /> },
          { path: 'approval',             element: <ApprovalPage /> },
          { path: 'rekonsiliasi',         element: <RekonsiliasiPage /> },
          { path: 'rekonsiliasi/opname',  element: <RekonsiliasiPage /> },
          { path: 'laporan',              element: <LaporanPage /> },
          { path: 'pengaturan',           element: <PengaturanPage /> },
          { path: 'pengaturan/users',     element: <PengaturanPage /> },
          { path: 'pengaturan/units',     element: <PengaturanPage /> },
        ],
      },
    ],
  },
])
