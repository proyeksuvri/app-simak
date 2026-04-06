import { useState, useEffect, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const { session, authLoading, signIn, setTahunAnggaran } = useAppContext()
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0e14', color: '#e8eaf0' }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
          <span className="text-sm font-bold tracking-widest font-headline" style={{ color: '#e8eaf0' }}>
            SIMAK UIN PALOPO
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>Help</span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(108,72,209,0.2)', border: '1px solid rgba(108,72,209,0.35)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '0.85rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}
              >security</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main split layout ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 grid md:grid-cols-2 gap-12 items-center py-12">

        {/* Left — Hero copy */}
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-bold font-headline leading-tight mb-5">
            <span style={{ color: '#e8eaf0' }}>Manajemen</span><br />
            <span style={{
              background: 'linear-gradient(90deg, #9B6DFF 0%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Keuangan</span><br />
            <span style={{ color: '#e8eaf0' }}>Terpadu.</span>
          </h1>
          <p className="text-sm leading-relaxed mb-8 font-body" style={{ color: 'rgba(232,234,240,0.55)', maxWidth: '380px' }}>
            Ekosistem pengelolaan keuangan BLU generasi baru milik UIN Palopo.
            Transparan, akurat, dan didukung data real-time.
          </p>
          <div className="flex items-center gap-3">
            <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <span
              className="text-xs font-semibold tracking-widest font-body uppercase"
              style={{ color: 'rgba(232,234,240,0.35)' }}
            >
              Integritas Akademik &bull; Presisi Fiskal
            </span>
          </div>
        </div>

        {/* Right — Login card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(22,26,33,0.85)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <h2 className="text-2xl font-bold font-headline mb-1" style={{ color: '#e8eaf0' }}>Login Portal</h2>
          <p className="text-sm font-body mb-7" style={{ color: 'rgba(232,234,240,0.45)' }}>
            Sistem Manajemen Keuangan &mdash; UIN Palopo
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Tahun Anggaran */}
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-widest font-body"
                style={{ color: 'rgba(232,234,240,0.45)' }}
              >Tahun Anggaran</label>
              <select
                value={tahunPilihan}
                onChange={e => setTahunPilihan(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl text-sm font-body outline-none appearance-none cursor-pointer transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e8eaf0',
                }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y} style={{ background: '#161a21' }}>TA {y}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-widest font-body"
                style={{ color: 'rgba(232,234,240,0.45)' }}
              >Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@uinpalopo.ac.id"
                className="w-full px-4 py-3 rounded-xl text-sm font-body outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e8eaf0',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(108,72,209,0.6)')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            {/* Kata Sandi */}
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-widest font-body"
                style={{ color: 'rgba(232,234,240,0.45)' }}
              >Kata Sandi</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm font-body outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e8eaf0',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(108,72,209,0.6)')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-body transition-colors hover:opacity-80"
                  style={{ color: '#9B6DFF' }}
                >
                  Lupa Kata Sandi?
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-body"
                style={{ background: 'rgba(186,26,26,0.15)', border: '1px solid rgba(186,26,26,0.3)', color: '#fca5a5' }}
              >
                <span
                  className="material-symbols-outlined flex-shrink-0"
                  style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}
                >error</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full text-sm font-semibold font-body text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
            >
              {submitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
              {!submitting && (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 0" }}
                >login</span>
              )}
            </button>
          </form>

          {/* Security badge */}
          <div className="flex flex-col items-center gap-1.5 mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.4rem', color: 'rgba(232,234,240,0.25)', fontVariationSettings: "'FILL' 1" }}
            >lock</span>
            <span
              className="text-xs font-semibold uppercase tracking-widest font-body"
              style={{ color: 'rgba(232,234,240,0.2)' }}
            >Enterprise Grade Security Enabled</span>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-headline" style={{ color: '#9B6DFF' }}>SIMAK</span>
            <span className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.3)' }}>
              &copy; 2026 UIN Palopo Financial Management System
            </span>
          </div>
          <div className="flex items-center gap-5">
            {['Kebijakan Privasi', 'Syarat Layanan', 'Keamanan'].map(link => (
              <a
                key={link}
                href="#"
                className="text-xs font-body transition-colors hover:text-white"
                style={{ color: 'rgba(232,234,240,0.3)' }}
              >{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
