interface BKUPaginationProps {
  page:       number
  totalPages: number
  pageSize:   number
  totalItems: number
  onPage:     (page: number) => void
  onPageSize: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function BKUPagination({
  page, totalPages, pageSize, totalItems, onPage, onPageSize,
}: BKUPaginationProps) {
  if (totalPages <= 1 && totalItems <= PAGE_SIZE_OPTIONS[0]) return null

  const from  = (page - 1) * pageSize + 1
  const to    = Math.min(page * pageSize, totalItems)

  const btnBase: React.CSSProperties = {
    display:       'inline-flex',
    alignItems:    'center',
    justifyContent:'center',
    width:         '2rem',
    height:        '2rem',
    borderRadius:  '0.5rem',
    fontSize:      '0.8125rem',
    border:        '1px solid rgba(255,255,255,0.10)',
    background:    'transparent',
    color:         '#e8eaf0',
    cursor:        'pointer',
    transition:    'background 150ms',
  }

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(108,72,209,0.25)',
    border:     '1px solid rgba(108,72,209,0.5)',
    color:      '#c4b5fd',
    fontWeight: 700,
  }

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.35,
    cursor:  'default',
  }

  // Hitung halaman yang ditampilkan (max 5 nomor)
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl mt-3"
      style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Info */}
      <p className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>
        Menampilkan <span style={{ color: '#e8eaf0', fontWeight: 600 }}>{from}–{to}</span> dari{' '}
        <span style={{ color: '#e8eaf0', fontWeight: 600 }}>{totalItems}</span> entri
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Per halaman */}
        <select
          value={pageSize}
          onChange={e => { onPageSize(Number(e.target.value)); onPage(1) }}
          style={{
            background:   '#1e2430',
            border:       '1px solid rgba(255,255,255,0.12)',
            color:        '#e8eaf0',
            borderRadius: '0.5rem',
            padding:      '0.25rem 0.5rem',
            fontSize:     '0.75rem',
          }}
        >
          {PAGE_SIZE_OPTIONS.map(s => (
            <option key={s} value={s}>{s} / hal</option>
          ))}
        </select>

        {/* Prev */}
        <button
          style={page === 1 ? btnDisabled : btnBase}
          onClick={() => page > 1 && onPage(page - 1)}
          disabled={page === 1}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_left</span>
        </button>

        {/* Nomor halaman */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ color: 'rgba(232,234,240,0.3)', fontSize: '0.75rem' }}>…</span>
          ) : (
            <button
              key={p}
              style={p === page ? btnActive : btnBase}
              onClick={() => onPage(p as number)}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          style={page === totalPages ? btnDisabled : btnBase}
          onClick={() => page < totalPages && onPage(page + 1)}
          disabled={page === totalPages}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
        </button>
      </div>
    </div>
  )
}
