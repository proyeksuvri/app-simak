/**
 * Theme.tsx — Komponen UI global bertema gelap untuk SIMAK BKU.
 *
 * Komponen yang tersedia:
 *   ThemeCard      — pembungkus kartu/tabel dengan latar gelap
 *   ThemeTabNav    — navigasi tab global (rounded-full, emerald aktif)
 *   ThemeButton    — tombol aksi bertema (primary | danger | text-primary | text-danger)
 *
 * Catatan: GlobalLayout tidak disertakan di sini karena Sidebar + Header sudah
 * menangani tata letak halaman. Gunakan PageContainer untuk padding halaman.
 */

import type { ReactNode, ButtonHTMLAttributes } from 'react'

// ──────────────────────────────────────────────
// 1. THEME CARD
// ──────────────────────────────────────────────
interface ThemeCardProps {
  children: ReactNode
  className?: string
}

export function ThemeCard({ children, className = '' }: ThemeCardProps) {
  return (
    <div
      className={`rounded-xl border border-[#1E293B] shadow-2xl overflow-hidden ${className}`}
      style={{ background: '#151B28' }}
    >
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────
// 2. TAB NAVIGATION
// ──────────────────────────────────────────────
interface ThemeTabNavProps {
  tabs: { key: string; label: string }[]
  activeTab: string
  onTabChange: (key: string) => void
  className?: string
}

export function ThemeTabNav({ tabs, activeTab, onTabChange, className = '' }: ThemeTabNavProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={[
            'px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 border',
            key === activeTab
              ? 'text-white border-[#009B72]'
              : 'bg-transparent border-[#2A3441] text-gray-400 hover:border-gray-500 hover:text-gray-200',
          ].join(' ')}
          style={
            key === activeTab
              ? {
                  background: '#009B72',
                  boxShadow: '0 0 15px rgba(0,155,114,0.3)',
                }
              : {}
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// 3. THEME BUTTON
// ──────────────────────────────────────────────
interface ThemeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'danger' | 'text-primary' | 'text-danger'
}

const BUTTON_VARIANTS: Record<NonNullable<ThemeButtonProps['variant']>, string> = {
  primary:       'bg-[#009B72] hover:bg-[#008762] text-white px-4 py-2.5 rounded-lg text-sm',
  danger:        'bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm',
  'text-primary':'text-[#009B72] hover:text-[#00C28E] text-xs',
  'text-danger': 'text-red-500 hover:text-red-400 text-xs',
}

export function ThemeButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ThemeButtonProps) {
  return (
    <button
      className={[
        'transition-colors duration-200 flex items-center gap-2 font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
