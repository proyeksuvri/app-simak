import { useState, useEffect, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import logoUinPalopo from '../../assets/logo-uinpalopo.png'

export function LoginPage() {
  const { session, authLoading, signIn, setTahunAnggaran } = useAppContext()
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
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

  if (authLoading) return null
  if (session) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const ok = await signIn(email, password)
    if (ok) {
      setTahunAnggaran(tahunPilihan)
    } else {
      setError('Email atau kata sandi salah. Periksa kembali.')
    }
    setSubmitting(false)
  }

  // ── Dark theme tokens ──────────────────────────────────────────────────────
  const dk = {
    bg:          '#09090b',          // zinc-950
    bgCard:      'rgba(255,255,255,0.04)',
    bgInput:     'rgba(255,255,255,0.06)',
    border:      'rgba(255,255,255,0.08)',
    borderFocus: 'rgba(99,102,241,0.6)',  // indigo focus ring
    text:        '#f4f4f5',          // zinc-100
    textMuted:   'rgba(244,244,245,0.45)',
    textSubtle:  'rgba(244,244,245,0.25)',
    accent:      '#6366f1',          // indigo-500
    accentHover: '#818cf8',          // indigo-400
    accentDim:   'rgba(99,102,241,0.15)',
    divider:     'rgba(255,255,255,0.06)',
    errorBg:     'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.3)',
    errorText:   '#fca5a5',
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
            alt="Modern architectural building"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6NDfr27MdLT0fMd7c7YjgkaN-IQJydo93XmUHdwxAbYnTJVpQmuUZyoSrYUdOr9cD_0WMALBKBwTxLpVxIun6wx22dpXtVYyOQoos3DeaDDDdau5PakXZJ6Op7pHywT0giH-cTldanJ8C449NM_3a6Ofs2mHEMmY5U7iIbFCEzryOJ2Egn9xF8avNDd-YMMupOS9VQJrWQmNT7l3_j97w0smgj3Gvyglhcgv72rzMyW3hbZHD0C4aj8YgZxImHDwz52Ch-69Zscn6"
          />
        </div>

        {/* ── Content ── */}
        <div className="container mx-auto px-6 relative z-20 flex flex-col lg:flex-row items-center justify-between gap-12 py-16">

          {/* Left — Branding */}
          <div className="w-full lg:w-1/2 max-w-xl text-center lg:text-left">
            <div className="mb-8 flex justify-center lg:justify-start">
              <div className="relative flex items-center justify-center" style={{ width: '7rem', height: '7rem' }}>
                {/* Radial glow matching logo green */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(21,128,61,0.35) 0%, rgba(21,128,61,0.12) 45%, transparent 72%)',
                    filter: 'blur(8px)',
                    transform: 'scale(1.3)',
                  }}
                />
                {/* Subtle ring */}
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
                    mixBlendMode: 'multiply',
                    filter: 'drop-shadow(0 0 12px rgba(21,128,61,0.6))',
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
                <span className="text-xs font-label uppercase tracking-widest" style={{ color: dk.textSubtle }}>Secure Access</span>
              </div>
              <div className="w-px h-4" style={{ background: dk.divider }} />
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: dk.accent, fontSize: '1.1rem' }}>analytics</span>
                <span className="text-xs font-label uppercase tracking-widest" style={{ color: dk.textSubtle }}>Real-time Data</span>
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
                  <h2 className="text-2xl font-bold mb-1 font-headline" style={{ color: dk.text }}>Sign In</h2>
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
                {/* Username/NIP */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-label uppercase tracking-wider" style={{ color: dk.textMuted }}>
                    Username / NIP
                  </label>
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none"
                      style={{ fontSize: '1.1rem', color: dk.textSubtle }}
                    >person</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Masukkan NIP anda"
                      className="w-full rounded-lg py-3.5 pl-11 pr-4 text-sm font-body outline-none transition-all"
                      style={{
                        background: dk.bgInput,
                        border: `1px solid ${dk.border}`,
                        color: dk.text,
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = dk.borderFocus)}
                      onBlur={e  => (e.currentTarget.style.borderColor = dk.border)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-label uppercase tracking-wider" style={{ color: dk.textMuted }}>
                      Password
                    </label>
                    <a href="#" className="text-xs font-label transition-colors hover:opacity-80" style={{ color: dk.accent }}>
                      Lupa sandi?
                    </a>
                  </div>
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
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: dk.accent }}
                  />
                  <label htmlFor="remember" className="text-sm font-body cursor-pointer select-none" style={{ color: dk.textMuted }}>
                    Remember this device
                  </label>
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
                  <span>{submitting ? 'Memverifikasi...' : 'Masuk ke SIMAK'}</span>
                  {!submitting && (
                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_forward</span>
                  )}
                </button>
              </form>

              {/* Language switcher */}
              <div
                className="mt-8 pt-6 flex justify-center gap-4"
                style={{ borderTop: `1px solid ${dk.divider}` }}
              >
                <button className="text-xs font-label font-semibold" style={{ color: dk.accent }}>ID</button>
                <span style={{ color: dk.textSubtle }}>|</span>
                <button
                  className="text-xs font-label transition-colors hover:opacity-80"
                  style={{ color: dk.textMuted }}
                >EN</button>
              </div>
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
            <div className="flex gap-6">
              {['Institutional Terms', 'Privacy Policy', 'Support'].map(link => (
                <a
                  key={link}
                  href="#"
                  className="text-[0.65rem] font-label uppercase tracking-widest font-body transition-colors hover:opacity-80"
                  style={{ color: dk.textMuted }}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
