import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface SearchItem {
  label:    string
  desc:     string
  path:     string
  icon:     string
  keywords: string[]
}

const ALL_ITEMS: SearchItem[] = [
  { label: 'Dashboard',                path: '/dashboard',                         icon: 'grid_view',          desc: 'Overview KPI keuangan',                      keywords: ['overview', 'kpi', 'ringkasan'] },
  { label: 'BPN – Bukti Penerimaan',   path: '/penerimaan/bpn',                    icon: 'south_west',         desc: 'Input & kelola penerimaan kas masuk',         keywords: ['penerimaan', 'bpn', 'kas masuk', 'ukt', 'pnbp'] },
  { label: 'BPN Keluar',               path: '/penerimaan/bpn-keluar',             icon: 'north_east',         desc: 'Penerimaan yang dikembalikan',                keywords: ['bpn keluar', 'pengembalian', 'penerimaan keluar'] },
  { label: 'Mutasi Bank Parser',       path: '/penerimaan/mutasi-parser',          icon: 'receipt_long',       desc: 'Parse mutasi rekening bank',                  keywords: ['mutasi', 'parser', 'bank', 'rekening'] },
  { label: 'BPK – Bukti Pengeluaran',  path: '/pengeluaran/bpk',                   icon: 'payments',           desc: 'Input & kelola pengeluaran kas',              keywords: ['pengeluaran', 'bpk', 'kas keluar', 'belanja'] },
  { label: 'UP / TUP',                 path: '/pengeluaran/up-tup',                icon: 'account_balance_wallet', desc: 'Uang Persediaan & Tambahan Uang Persediaan', keywords: ['up', 'tup', 'uang persediaan'] },
  { label: 'BKU Penerimaan',           path: '/bku/penerimaan',                    icon: 'menu_book',          desc: 'Buku Kas Umum penerimaan',                    keywords: ['bku', 'buku kas', 'penerimaan'] },
  { label: 'BKU Induk',                path: '/bku/induk',                         icon: 'book',               desc: 'Buku Kas Umum induk pengeluaran',             keywords: ['bku', 'buku kas', 'induk', 'pengeluaran'] },
  { label: 'BKU Pembantu',             path: '/bku/pembantu',                      icon: 'library_books',      desc: 'Buku Kas Umum unit pembantu',                 keywords: ['bku', 'pembantu', 'unit'] },
  { label: 'BKU Pembantu Penerimaan',  path: '/bku/pembantu-penerimaan',           icon: 'library_books',      desc: 'BKU pembantu per penerimaan',                 keywords: ['bku', 'pembantu', 'penerimaan'] },
  { label: 'BKU Pembantu Rekening',    path: '/bku/pembantu-rekening',             icon: 'account_balance',    desc: 'BKU pembantu per rekening',                   keywords: ['bku', 'rekening', 'bank'] },
  { label: 'BKU Jenis Pendapatan',     path: '/bku/pembantu-jenis-pendapatan',     icon: 'category',           desc: 'BKU pembantu per jenis pendapatan',           keywords: ['bku', 'jenis', 'pendapatan', 'kategori'] },
  { label: 'Penutupan Harian',         path: '/bku/penutupan',                     icon: 'lock_clock',         desc: 'Tutup buku kas harian',                       keywords: ['penutupan', 'tutup buku', 'harian'] },
  { label: 'Approval',                 path: '/approval',                          icon: 'task_alt',           desc: 'Persetujuan transaksi pending',               keywords: ['approval', 'persetujuan', 'pending', 'submitted'] },
  { label: 'Rekonsiliasi',             path: '/rekonsiliasi',                      icon: 'compare_arrows',     desc: 'Rekonsiliasi kas & bank',                     keywords: ['rekonsiliasi', 'opname', 'kas', 'bank'] },
  { label: 'Laporan',                  path: '/laporan',                           icon: 'bar_chart',          desc: 'Laporan keuangan & ekspor',                   keywords: ['laporan', 'laporan keuangan', 'ekspor', 'cetak'] },
  { label: 'Laporan Pendapatan',       path: '/laporan/pendapatan-summary',        icon: 'trending_up',        desc: 'Ringkasan pendapatan per sumber & unit',      keywords: ['pendapatan', 'summary', 'ringkasan', 'laporan'] },
  { label: 'Pengaturan',               path: '/pengaturan',                        icon: 'settings',           desc: 'Profil & konfigurasi akun',                   keywords: ['pengaturan', 'profil', 'akun', 'password'] },
  { label: 'Manajemen Pengguna',        path: '/pengaturan/users',                  icon: 'manage_accounts',    desc: 'Tambah & kelola pengguna',                    keywords: ['pengguna', 'user', 'manajemen', 'akun'] },
  { label: 'Manajemen Unit',           path: '/pengaturan/units',                  icon: 'domain',             desc: 'Kelola unit kerja & satuan kerja',            keywords: ['unit', 'satker', 'unit kerja'] },
]

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(155,109,255,0.35)', color: '#e8eaf0', borderRadius: '2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

interface Props { onClose: () => void }

export function SearchDropdown({ onClose }: Props) {
  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const results = query.trim()
    ? ALL_ITEMS.filter(item => {
        const q = query.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.keywords.some(k => k.includes(q))
        )
      })
    : ALL_ITEMS

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setFocused(0) }, [query])

  const go = useCallback((path: string) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused(f => Math.min(f + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused(f => Math.max(f - 1, 0))
    } else if (e.key === 'Enter') {
      if (results[focused]) go(results[focused].path)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-focused="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [focused])

  // Close on outside click
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={wrapRef}
      className="absolute left-0 top-full mt-2 z-50 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      style={{
        width: '340px',
        background: '#161b27',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Input */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="material-symbols-outlined flex-shrink-0"
          style={{ fontSize: '0.95rem', color: 'rgba(232,234,240,0.35)', fontVariationSettings: "'FILL' 0" }}
        >search</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Cari laporan atau unit..."
          className="flex-1 bg-transparent outline-none text-xs font-body"
          style={{ color: '#e8eaf0' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ color: 'rgba(232,234,240,0.3)', lineHeight: 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span>
          </button>
        )}
      </div>

      {/* Results */}
      <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: '360px' }}>
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.6rem', color: 'rgba(232,234,240,0.2)', fontVariationSettings: "'FILL' 0" }}
            >search_off</span>
            <p className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.3)' }}>
              Tidak ditemukan
            </p>
          </div>
        ) : (
          results.map((item, i) => (
            <button
              key={item.path}
              data-focused={i === focused ? 'true' : undefined}
              onClick={() => go(item.path)}
              onMouseEnter={() => setFocused(i)}
              className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 transition-colors"
              style={{
                background: i === focused ? 'rgba(155,109,255,0.1)' : 'transparent',
                borderLeft: i === focused ? '2px solid #9B6DFF' : '2px solid transparent',
              }}
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{
                  fontSize: '1rem',
                  color: i === focused ? '#9B6DFF' : 'rgba(232,234,240,0.4)',
                  fontVariationSettings: "'FILL' 0",
                }}
              >{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold font-body truncate" style={{ color: i === focused ? '#e8eaf0' : 'rgba(232,234,240,0.8)' }}>
                  {highlight(item.label, query)}
                </p>
                <p className="text-[0.6rem] font-body truncate mt-0.5" style={{ color: 'rgba(232,234,240,0.35)' }}>
                  {item.desc}
                </p>
              </div>
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{ fontSize: '0.75rem', color: i === focused ? 'rgba(155,109,255,0.6)' : 'transparent', fontVariationSettings: "'FILL' 0" }}
              >keyboard_return</span>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {[
          { key: '↑↓', label: 'navigasi' },
          { key: '↵',  label: 'buka' },
          { key: 'Esc', label: 'tutup' },
        ].map(k => (
          <span key={k.key} className="flex items-center gap-1">
            <kbd
              className="text-[9px] font-body px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(232,234,240,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
            >{k.key}</kbd>
            <span className="text-[9px] font-body" style={{ color: 'rgba(232,234,240,0.25)' }}>{k.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
