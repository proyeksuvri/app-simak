import { useState, useEffect, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const { session, authLoading, signIn, setTahunAnggaran } = useAppContext()
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [tahunPilihan, setTahunPilihan] = useState(2026)
  const [availableYears, setAvailableYears] = useState<number[]>([2026])
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

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
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="fixed top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0, 105, 92, 0.08) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-gradient flex items-center justify-center mb-4 shadow-float">
            <span className="material-symbols-outlined text-on-primary text-[1.6rem]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
              account_balance
            </span>
          </div>
          <h1 className="text-xl font-bold text-on-surface font-headline">SIMAK BKU</h1>
          <p className="text-xs text-on-surface-variant font-body mt-1">UIN Palopo — Sistem Manajemen Keuangan</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-card p-6">
          <h2 className="text-sm font-semibold text-on-surface font-headline mb-5">Masuk ke akun Anda</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Tahun Anggaran */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant font-body">Tahun Anggaran</label>
              <div className="relative flex items-center">
                <span
                  className="absolute left-3.5 material-symbols-outlined text-[1rem] text-on-surface-variant"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                >
                  calendar_today
                </span>
                <select
                  value={tahunPilihan}
                  onChange={e => setTahunPilihan(Number(e.target.value))}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface font-body outline-none focus:ring-2 focus:ring-primary/40 transition-shadow appearance-none cursor-pointer"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>TA {y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant font-body">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@uinpalopo.ac.id"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface font-body outline-none focus:ring-2 focus:ring-primary/40 transition-shadow placeholder:text-on-surface-variant/40"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant font-body">Kata Sandi</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface font-body outline-none focus:ring-2 focus:ring-primary/40 transition-shadow placeholder:text-on-surface-variant/40"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-error-container">
                <span className="material-symbols-outlined text-error text-[1rem]"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>
                  error
                </span>
                <p className="text-xs text-on-error-container font-body">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-1 py-2.5 rounded-xl bg-emerald-gradient text-on-primary text-sm font-semibold font-body transition-opacity disabled:opacity-60"
            >
              {submitting ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-on-surface-variant/50 font-body mt-6">
          SIMAK BKU v1.0 — UIN Palopo © 2024
        </p>
      </div>
    </div>
  )
}
