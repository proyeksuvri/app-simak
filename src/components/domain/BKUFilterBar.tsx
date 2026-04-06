import type { Dispatch, SetStateAction } from 'react'

export interface BKUFilter {
  bulan:      number | null   // 1–12, null = semua
  tanggalDari: string         // YYYY-MM-DD, '' = tidak ada
  tanggalSampai: string       // YYYY-MM-DD, '' = tidak ada
}

export const FILTER_DEFAULT: BKUFilter = {
  bulan:        null,
  tanggalDari:  '',
  tanggalSampai: '',
}

const BULAN_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

interface BKUFilterBarProps {
  filter:     BKUFilter
  onChange:   Dispatch<SetStateAction<BKUFilter>>
  totalSemua: number   // jumlah entri sebelum filter
  totalFilter: number  // jumlah entri sesudah filter
}

export function BKUFilterBar({ filter, onChange, totalSemua, totalFilter }: BKUFilterBarProps) {
  const isActive = filter.bulan !== null || filter.tanggalDari !== '' || filter.tanggalSampai !== ''

  const handleBulan = (val: string) => {
    onChange(prev => ({
      ...prev,
      bulan: val === '' ? null : Number(val),
      // reset rentang jika pilih bulan
      tanggalDari:   '',
      tanggalSampai: '',
    }))
  }

  const handleReset = () => onChange(FILTER_DEFAULT)

  const inputStyle: React.CSSProperties = {
    background:  '#1e2430',
    border:      '1px solid rgba(255,255,255,0.12)',
    color:       '#e8eaf0',
    borderRadius: '0.625rem',
    padding:     '0.375rem 0.625rem',
    fontSize:    '0.8125rem',
    outline:     'none',
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl mb-3"
      style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Icon */}
      <span
        className="material-symbols-outlined flex-shrink-0"
        style={{ fontSize: '1.1rem', color: '#9B6DFF' }}
      >
        filter_list
      </span>

      {/* Pilih Bulan */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.5)' }}>Bulan</label>
        <select
          style={inputStyle}
          value={filter.bulan ?? ''}
          onChange={e => handleBulan(e.target.value)}
        >
          <option value="">Semua Bulan</option>
          {BULAN_LABELS.map((label, idx) => (
            <option key={idx + 1} value={idx + 1}>{label}</option>
          ))}
        </select>
      </div>

      {/* Pemisah */}
      <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

      {/* Dari Tanggal */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.5)' }}>Dari</label>
        <input
          type="date"
          style={inputStyle}
          value={filter.tanggalDari}
          onChange={e =>
            onChange(prev => ({ ...prev, tanggalDari: e.target.value, bulan: null }))
          }
        />
      </div>

      {/* Sampai Tanggal */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.5)' }}>Sampai</label>
        <input
          type="date"
          style={inputStyle}
          value={filter.tanggalSampai}
          onChange={e =>
            onChange(prev => ({ ...prev, tanggalSampai: e.target.value, bulan: null }))
          }
        />
      </div>

      {/* Badge hasil */}
      {isActive && (
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full font-body"
          style={{ background: 'rgba(108,72,209,0.2)', color: '#c4b5fd' }}
        >
          {totalFilter} dari {totalSemua} entri
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reset */}
      {isActive && (
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs font-body rounded-lg px-2.5 py-1 transition-colors"
          style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span>
          Reset
        </button>
      )}
    </div>
  )
}
