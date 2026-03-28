// Format angka menjadi Rupiah: Rp 2.450.000.000
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style:    'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format singkat untuk chart: 2,45M atau 842jt
export function formatRupiahSingkat(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}M`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}jt`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}rb`
  }
  return String(value)
}

// Format tanggal: 25 Jun 2024
export function formatTanggal(isoDate: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  }).format(new Date(isoDate))
}

// Format tanggal panjang: Senin, 25 Juni 2024
export function formatTanggalPanjang(isoDate: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  }).format(new Date(isoDate))
}

// Format persen dengan tanda: +4.2% atau -2.1%
export function formatPersen(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
