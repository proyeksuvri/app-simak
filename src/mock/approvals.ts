import type { ApprovalItem } from '../types'

export const mockApprovals: ApprovalItem[] = [
  {
    id:        'apv-001',
    title:     'Revisi DIPA Kegiatan PMB 2024',
    requestBy: 'Drs. Rizal Mappasomba, M.Si.',
    dueDate:   '2024-06-28',
    priority:  'high',
    type:      'laporan',
  },
  {
    id:        'apv-002',
    title:     'SPM GUP Pengeluaran Triwulan II',
    requestBy: 'Drs. Rizal Mappasomba, M.Si.',
    dueDate:   '2024-06-30',
    priority:  'high',
    type:      'bpk',
  },
  {
    id:        'apv-003',
    title:     'Pencairan TUP — Kegiatan Wisuda 2024',
    requestBy: 'Sitti Rahayu, S.E. (BPP FTIK)',
    dueDate:   '2024-07-05',
    priority:  'medium',
    type:      'up_tup',
  },
  {
    id:        'apv-004',
    title:     'LPJ Penggunaan UP Triwulan I — FEBI',
    requestBy: 'Muh. Irfan Taufiq, S.Ak. (BPP FEBI)',
    dueDate:   '2024-07-10',
    priority:  'medium',
    type:      'laporan',
  },
  {
    id:        'apv-005',
    title:     'BPN Penerimaan UKT Susulan — FUAD',
    requestBy: 'Andi Pratama, S.E. (BP)',
    dueDate:   '2024-06-29',
    priority:  'low',
    type:      'bpn',
  },
]
