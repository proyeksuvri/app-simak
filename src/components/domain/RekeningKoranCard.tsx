/**
 * RekeningKoranCard
 *
 * Displays a premium card listing available rekening koran (bank statement)
 * PDFs stored in Google Drive for the selected account + year.
 *
 * Features:
 *  - List rows per bulan (nama bulan, keterangan, tombol Lihat & Hapus)
 *  - "Tambah" form: pilih bulan + paste Google Drive URL + keterangan
 *  - Modal viewer: Google Drive embedded <iframe> full-height
 *  - Auto-converts share URLs to embed preview URLs
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRekeningKoran } from '../../hooks/useRekeningKoran'
import type { DbRekeningKoran } from '../../types/database'

const NAMA_BULAN_FULL = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

interface Props {
  accountId:   string
  accountName: string   // e.g. "BNI - 1234567890"
  tahun:       number
}

// ── Viewer Modal ─────────────────────────────────────────────────────────────
function ViewerModal({
  record,
  onClose,
}: {
  record: DbRekeningKoran
  onClose: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-white/10"
        style={{ background: '#0d1117' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'linear-gradient(135deg,#004f45,#00695c)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0f2e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </span>
          <div>
            <p className="text-xs font-bold text-white font-body leading-none">
              Rekening Koran — {NAMA_BULAN_FULL[record.bulan - 1]} {record.tahun}
            </p>
            {record.keterangan && (
              <p className="text-[11px] text-white/50 font-body mt-0.5">{record.keterangan}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Open in new tab */}
          <a
            href={record.drive_url.replace('/preview', '/view')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all"
            style={{ background: 'rgba(160,242,225,0.12)', color: '#a0f2e1', border: '1px solid rgba(160,242,225,0.2)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Buka di Drive
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* iFrame */}
      <iframe
        src={record.drive_url}
        title="Rekening Koran PDF"
        className="flex-1 w-full border-0"
        allow="autoplay"
      />
    </div>,
    document.body,
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({
  record,
  onConfirm,
  onCancel,
  loading,
}: {
  record:    DbRekeningKoran
  onConfirm: () => void
  onCancel:  () => void
  loading:   boolean
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-sm font-semibold text-white font-body mb-1">Hapus rekening koran?</p>
        <p className="text-xs text-white/50 font-body mb-5">
          {NAMA_BULAN_FULL[record.bulan - 1]} {record.tahun} akan dihapus dari database.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-medium font-body text-white/70 hover:bg-white/10 transition-all">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-semibold font-body text-white transition-all"
            style={{ background: '#ba1a1a' }}>
            {loading ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function RekeningKoranCard({ accountId, accountName, tahun }: Props) {
  const { records, loading, saving, error, save, remove } =
    useRekeningKoran(accountId, tahun)

  // Form state
  const [showForm,    setShowForm]    = useState(false)
  const [formBulan,   setFormBulan]   = useState<number>(new Date().getMonth() + 1)
  const [formUrl,     setFormUrl]     = useState('')
  const [formNote,    setFormNote]    = useState('')
  const [formError,   setFormError]   = useState<string | null>(null)

  // Viewer
  const [viewing, setViewing] = useState<DbRekeningKoran | null>(null)

  // Delete confirm
  const [deleting, setDeleting] = useState<DbRekeningKoran | null>(null)

  const handleSave = async () => {
    if (!formUrl.trim()) { setFormError('URL Google Drive wajib diisi'); return }
    setFormError(null)
    const err = await save(formBulan, formUrl.trim(), formNote)
    if (err) { setFormError(err); return }
    setShowForm(false)
    setFormUrl('')
    setFormNote('')
  }

  const handleDelete = async () => {
    if (!deleting) return
    await remove(deleting.id)
    setDeleting(null)
  }

  // Months already uploaded
  const uploadedBulans = new Set(records.map(r => r.bulan))

  return (
    <>
      {/* ── Card ── */}
      <div
        className="rounded-2xl mb-5 overflow-hidden"
        style={{ background: '#161a21', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]"
          style={{ background: 'linear-gradient(90deg, rgba(0,79,69,0.35) 0%, transparent 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            {/* PDF icon */}
            <span
              className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#004f45,#00695c)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a0f2e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </span>

            <div>
              <p className="text-sm font-bold text-white font-body leading-tight">
                Rekening Koran
              </p>
              <p className="text-[11px] text-white/40 font-body">{accountName} · {tahun}</p>
            </div>
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-body transition-all"
            style={
              showForm
                ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                : { background: 'linear-gradient(135deg,#004f45,#00695c)', color: '#a0f2e1' }
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {showForm
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
              }
            </svg>
            {showForm ? 'Batal' : 'Tambah'}
          </button>
        </div>

        {/* ── Add form ── */}
        {showForm && (
          <div
            className="px-5 py-4 border-b border-white/[0.06]"
            style={{ background: 'rgba(0,79,69,0.08)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto]">
              {/* Bulan select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-body">Bulan</label>
                <select
                  value={formBulan}
                  onChange={e => setFormBulan(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl text-sm font-body text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  style={{ background: '#1e2430', border: '1px solid rgba(255,255,255,0.12)', minWidth: '130px' }}
                >
                  {NAMA_BULAN_FULL.map((nama, idx) => {
                    const b = idx + 1
                    return (
                      <option key={b} value={b} style={{ background: '#1e2430' }}
                        disabled={uploadedBulans.has(b) && b !== formBulan}>
                        {nama}{uploadedBulans.has(b) ? ' ✓' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* URL input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-body">
                  Link Google Drive
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  className="px-3 py-2 rounded-xl text-sm font-body text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  style={{ background: '#1e2430', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              </div>

              {/* Save button */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-transparent select-none font-body">_</label>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold font-body text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#004f45,#00695c)' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>

            {/* Keterangan (optional) */}
            <div className="mt-2.5">
              <input
                type="text"
                placeholder="Keterangan (opsional, mis: Periode 1–31 Maret 2025)"
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm font-body text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                style={{ background: '#1e2430', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>

            {formError && (
              <p className="mt-2 text-xs text-red-400 font-body">{formError}</p>
            )}
          </div>
        )}

        {/* ── Records list ── */}
        <div className="px-5 py-3">
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <span className="text-xs text-white/40 font-body">Memuat...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center py-7 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="text-xs text-white/30 font-body">Belum ada rekening koran untuk rekening ini.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-1 text-xs font-semibold font-body underline underline-offset-2"
                style={{ color: '#84d5c5' }}
              >
                Tambah sekarang
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {records.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-3">
                  {/* Month badge */}
                  <span
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center"
                    style={{ background: 'rgba(0,79,69,0.3)', border: '1px solid rgba(160,242,225,0.15)' }}
                  >
                    <span className="text-[9px] font-bold text-primary-fixed-dim font-body leading-none">
                      {NAMA_BULAN_FULL[r.bulan - 1].slice(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[11px] font-bold text-primary-fixed font-body leading-none mt-0.5">
                      {r.bulan.toString().padStart(2, '0')}
                    </span>
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white font-body truncate">
                      {NAMA_BULAN_FULL[r.bulan - 1]} {r.tahun}
                    </p>
                    {r.keterangan && (
                      <p className="text-xs text-white/40 font-body truncate">{r.keterangan}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setViewing(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all"
                      style={{ background: 'rgba(0,79,69,0.4)', color: '#a0f2e1', border: '1px solid rgba(160,242,225,0.18)' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      Lihat
                    </button>
                    <button
                      onClick={() => setDeleting(r)}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Hapus"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 font-body mt-2">{error}</p>
          )}
        </div>
      </div>

      {/* Viewer modal */}
      {viewing && (
        <ViewerModal record={viewing} onClose={() => setViewing(null)} />
      )}

      {/* Delete confirm */}
      {deleting && (
        <DeleteConfirm
          record={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          loading={saving}
        />
      )}
    </>
  )
}
