import { useState, useEffect, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import logoUinPalopo from '../../assets/logo-uinpalopo.png'

export function LoginPage() {
  const { session, authLoading, signIn, setTahunAnggaran } = useAppContext()
  const [nip,            setNip]            = useState('')
  const [nipError,       setNipError]       = useState<string | null>(null)
  const [password,       setPassword]       = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const [capsLock,       setCapsLock]       = useState(false)
  const [tahunPilihan,   setTahunPilihan]   = useState(2026)
  const [availableYears, setAvailableYears] = useState<number[]>([2026])
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('periods')
      .select('year')
      .order('year', { ascending: false })
      .then(({ data }) => {
        const years = [...new Set((data ?? []).map((p: { year: number }) => p.year))]
          .filter(Boolean) as number[]
        if (years.length > 0) {
          setAvailableYears(years)
          setTahunPilihan(years[0])
        }
      })
  }, [])

  if (authLoading && !submitting) return null
  if (session) return <Navigate to="/dashboard" replace />

  const validateNip = (value: string): string | null => {
    if (!value) return 'NIP wajib diisi'
    if (value.length !== 18) return 'NIP harus 18 digit angka'
    return null
  }

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    setNip(digits)
    if (nipError) setNipError(validateNip(digits))
  }

  const handleNipBlur = () => {
    setNipError(validateNip(nip))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nipErr = validateNip(nip)
    if (nipErr) { setNipError(nipErr); return }
    setError(null)
    setSubmitting(true)
    const email = `${nip}@uinpalopo.ac.id`
    const ok = await signIn(email, password)
    if (ok) {
      setTahunAnggaran(tahunPilihan)
    } else {
      setError('NIP atau kata sandi tidak valid')
    }
    setSubmitting(false)
  }

  // ── Dark theme tokens ──────────────────────────────────────────────────────
  const dk = {
    bg:          '#09090b',
    bgCard:      'rgba(255,255,255,0.04)',
    bgInput:     'rgba(255,255,255,0.06)',
    border:      'rgba(255,255,255,0.08)',
    borderFocus: 'rgba(99,102,241,0.6)',
    borderError: 'rgba(239,68,68,0.5)',
    text:        '#f4f4f5',
    textMuted:   'rgba(244,244,245,0.45)',
    textSubtle:  'rgba(244,244,245,0.25)',
    accent:      '#6366f1',
    accentHover: '#818cf8',
    accentDim:   'rgba(99,102,241,0.15)',
    divider:     'rgba(255,255,255,0.06)',
    errorBg:     'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.3)',
    errorText:   '#fca5a5',
    warnBg:      'rgba(234,179,8,0.1)',
    warnBorder:  'rgba(234,179,8,0.3)',
    warnText:    '#fde047',
  } as const

  return (
    <div className="min-h-screen flex flex-col" style={{ background: dk.bg, color: dk.text, fontFamily: 'Inter, sans-serif' }}>
      {/* ── Hero background ── */}
      <main className="flex-grow flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 z-10" style={{ background: `linear-gradient(to right, ${dk.bg} 0%, rgba(9,9,11,0.85) 50%, rgba(9,9,11,0.4) 100%)` }} />
          <img
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(100%) brightness(0.25)' }}
            alt="Gedung UIN Palopo"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6NDfr27MdLT0fMd7c7YjgkaN-IQJydo93XmUHdwxAbYnTJVpQmuUZyoSrYUdOr9cD_0WMALBKBwTxLpVxIun6wx22dpXtVYyOQoos3DeaDDDdau5PakXZJ6Op7pHywT0giH-cTldanJ8C449NM_3a6Ofs2mHEMmY5U7iIbFCEzryOJ2Egn9xF8avNDd-YMMupOS9VQJrWQmNT7l3_j97w0smgj3Gvyglhcgv72rzMyW3hbZHD0C4aj8YgZxImHDwz52Ch-69Zscn6"
          />
        </div>

        {/* ── Content ── */}
        <div className="container mx-auto px-6 relative z-20 flex flex-col lg:flex-row items-center justify-between gap-12 py-16">

          {/* Left — Branding */}
          <div className="w-full lg:w-1/2 max-w-xl text-center lg:text-left">
            <div className="mb-8 flex justify-center lg:justify-start">
              <div className="relative flex items-center justify-center" style={{ width: '7rem', height: '7rem' }}>
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(21,128,61,0.35) 0%, rgba(21,128,61,0.12) 45%, transparent 72%)',
                    filter: 'blur(8px)',
                    transform: 'scale(1.3)',
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '1px solid rgba(21,128,61,0.2)',
                    boxShadow: '0 0 32px rgba(21,128,61,0.15)',
                  }}
                />
                <img
                  className="relative z-10 h-20 lg:h-24 rounded-full object-contain"
                  alt="Lambang UIN Palopo"
                  src={logoUinPalopo}
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(21,128,61,0.5))',
                  }}
                />
              </div>
            </div>
            <h1
              className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight font-headline"
              style={{ color: dk.text }}
            >
              <span style={{ color: dk.accent }}>SIMAK</span>{' '}
              <span style={{ color: dk.text }}>UIN PALOPO</span>
            </h1>
            <p className="text-xl lg:text-2xl font-light leading-relaxed max-w-lg mx-auto lg:mx-0 font-body" style={{ color: dk.textMuted }}>
              Platform Administrasi Keuangan Pengelolaan Badan Layanan Umum (BLU)
            </p>
            <div className="mt-10 hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: dk.accent, fontSize: '1.1rem' }}>security</span>
                <span className="text-xs font-label uppercase tracking-widest" style={{ color: dk.textSubtle }}>Akses Aman</span>
              </div>
              <div className="w-px h-4" style={{ background: dk.divider }} />
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: dk.accent, fontSize: '1.1rem' }}>analytics</span>
                <span className="text-xs font-label uppercase tracking-widest" style={{ color: dk.textSubtle }}>Data Real-time</span>
              </div>
            </div>
          </div>

          {/* Right — Login Card */}
          <div className="w-full lg:w-[440px]">
            <div
              className="rounded-2xl shadow-2xl"
              style={{
                background: dk.bgCard,
                backdropFilter: 'blur(24px)',
                border: `1px solid ${dk.border}`,
                padding: '2.5rem',
              }}
            >
              {/* Card header + Tahun Anggaran chip */}
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1 font-headline" style={{ color: dk.text }}>Masuk</h2>
                  <p className="text-sm font-body" style={{ color: dk.textMuted }}>
                    Akses sistem manajemen keuangan institusi.
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
                  <span className="text-[0.6rem] font-label uppercase tracking-widest" style={{ color: dk.textSubtle }}>
                    Tahun Anggaran
                  </span>
                  <select
                    value={tahunPilihan}
                    onChange={e => setTahunPilihan(Number(e.target.value))}
                    className="rounded-full py-1 pl-3 pr-2 text-xs font-semibold font-label appearance-none cursor-pointer outline-none transition-colors"
                    style={{
                      background: dk.accentDim,
                      border: `1px solid rgba(99,102,241,0.3)`,
                      color: dk.accentHover,
                      backgroundImage: 'none',
                    }}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y} style={{ background: '#18181b' }}>TA {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* NIP */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-label uppercase tracking-wider" style={{ color: dk.textMuted }}>
                    NIP
                  </label>
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none"
                      style={{ fontSize: '1.1rem', color: nipError ? dk.errorText : dk.textSubtle }}
                    >person</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="username"
                      maxLength={18}
                      required
                      value={nip}
                      onChange={handleNipChange}
                      onBlur={handleNipBlur}
                      placeholder="Masukkan NIP"
                      className="w-full rounded-lg py-3.5 pl-11 pr-4 text-sm font-body outline-none transition-all"
                      style={{
                        background: dk.bgInput,
                        border: `1px solid ${nipError ? dk.borderError : dk.border}`,
                        color: dk.text,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = nipError ? dk.borderError : dk.borderFocus)}
                      onBlurCapture={e => (e.currentTarget.style.borderColor = nipError ? dk.borderError : dk.border)}
                    />
                  </div>
                  {nipError && (
                    <p className="text-xs" style={{ color: dk.errorText }}>{nipError}</p>
                  )}
                </div>

                {/* Kata Sandi */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-label uppercase tracking-wider" style={{ color: dk.textMuted }}>
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ fontSize: '1.1rem', color: dk.textSubtle }}
                    >lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg py-3.5 pl-11 pr-12 text-sm font-body outline-none transition-all"
                      style={{
                        background: dk.bgInput,
                        border: `1px solid ${dk.border}`,
                        color: dk.text,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = dk.borderFocus)}
                      onBlur={e  => (e.currentTarget.style.borderColor = dk.border)}
                      onKeyDown={e => setCapsLock(e.getModifierState('CapsLock'))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                      style={{ color: dk.textMuted }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                        {showPassword ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>
                  </div>
                  {capsLock && (
                    <div
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: dk.warnBg, border: `1px solid ${dk.warnBorder}`, color: dk.warnText }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>keyboard_capslock</span>
                      Caps Lock aktif
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-body"
                    style={{ background: dk.errorBg, border: `1px solid ${dk.errorBorder}`, color: dk.errorText }}
                  >
                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '1rem' }}>error</span>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl font-bold text-sm font-body flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                  style={{
                    background: `linear-gradient(135deg, ${dk.accent}, ${dk.accentHover})`,
                    color: '#fff',
                    boxShadow: `0 4px 24px rgba(99,102,241,0.25)`,
                  }}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_forward</span>
                    </>
                  )}
                </button>

                {/* Lupa kata sandi */}
                <p className="text-center text-xs" style={{ color: dk.textMuted }}>
                  Lupa kata sandi?{' '}
                  <span style={{ color: dk.textMuted }}>Hubungi admin SIMAK</span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-6 relative z-20" style={{ borderTop: `1px solid ${dk.divider}` }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-center md:text-left">
            <div className="space-y-0.5">
              <p className="text-[0.65rem] font-label uppercase tracking-widest font-body" style={{ color: dk.textMuted }}>
                © 2026 UIN Palopo — Sistem Informasi Manajemen Administrasi Keuangan (SIMAK)
              </p>
              <p className="text-[0.6rem] font-label uppercase tracking-widest font-body" style={{ color: dk.textSubtle }}>
                Dioperasikan oleh Bagian Keuangan UIN Palopo
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
