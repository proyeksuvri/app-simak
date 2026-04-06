import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open:       boolean
  onClose:    () => void
  title:      string
  children:   ReactNode
  maxWidth?:  'sm' | 'md' | 'lg'
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={[
          'relative w-full rounded-2xl shadow-xl flex flex-col',
          'max-h-[90vh] overflow-hidden border border-white/5',
          maxWidthMap[maxWidth],
        ].join(' ')}
        style={{ background: '#121620' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-title-medium font-semibold text-[#e8eaf0]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/50 hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
