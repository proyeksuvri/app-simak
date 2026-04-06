import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAppContext();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0e14', color: '#e8eaf0' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: 'rgba(11,14,20,0.88)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
            >
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
              >account_balance</span>
            </div>
            <span className="text-sm font-bold text-white font-headline tracking-wide">SIMAK UIN PALOPO</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {[
              { label: 'Beranda', active: true },
              { label: 'Fitur',   active: false },
              { label: 'Layanan', active: false },
              { label: 'Kontak',  active: false },
            ].map(({ label, active }) => (
              <a
                key={label}
                href="#"
                className="text-sm font-body transition-colors"
                style={{
                  color: active ? '#e8eaf0' : 'rgba(232,234,240,0.45)',
                  textDecoration: active ? 'underline' : 'none',
                  textUnderlineOffset: '4px',
                }}
              >{label}</a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-body font-medium px-4 py-1.5 rounded-lg transition-colors hover:text-white"
              style={{ color: 'rgba(232,234,240,0.6)' }}
            >Login</button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-body font-semibold px-4 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
            >Mulai</button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1">
        <section className="max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">

          {/* Institution badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold uppercase tracking-widest font-body"
            style={{ border: '1px solid rgba(108,72,209,0.5)', color: '#c4b5fd' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.85rem', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
            >verified</span>
            Universitas Islam Negeri Palopo
          </div>

          {/* Heading */}
          <h1 className="text-5xl font-bold font-headline leading-tight mb-5">
            <span className="text-white">Sistem Manajemen</span><br />
            <span style={{
              background: 'linear-gradient(90deg, #9B6DFF 0%, #FF6EC7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Keuangan BKU
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-sm leading-relaxed mb-9 font-body mx-auto"
            style={{ color: 'rgba(232,234,240,0.55)', maxWidth: '480px' }}
          >
            Platform administrasi keuangan terintegrasi untuk pengelolaan dana{' '}
            <span style={{ color: '#9B6DFF' }}>BLU UIN Palopo</span>{' '}
            yang transparan, akurat, dan futuristik.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: 'receipt_long',   label: 'BPN & BPK'   },
              { icon: 'verified_user',  label: 'Approval'    },
              { icon: 'menu_book',      label: 'BKU Induk'   },
              { icon: 'picture_as_pdf', label: 'Laporan PDF' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium font-body"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(232,234,240,0.75)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '0.9rem', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                >{icon}</span>
                {label}
              </div>
            ))}
          </div>

          {/* CTA Card */}
          <div
            className="mx-auto max-w-xs rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(108,72,209,0.18)', border: '1px solid rgba(108,72,209,0.3)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.75rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48" }}
              >login</span>
            </div>
            <h2 className="text-base font-bold text-white font-headline mb-1">Akses Portal</h2>
            <p className="text-xs mb-5 font-body" style={{ color: 'rgba(232,234,240,0.45)' }}>
              Silakan login menggunakan akun SIMAK Anda
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white font-body flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
            >
              Masuk ke Sistem
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
              >arrow_forward</span>
            </button>
          </div>
        </section>

        {/* ── Feature Section ── */}
        <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
          {/* Left: visual grid card */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              minHeight: '260px',
            }}
          >
            <div className="grid grid-cols-7 gap-1 mb-4" style={{ height: '180px' }}>
              {Array.from({ length: 56 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-sm"
                  style={{ background: `rgba(108,72,209,${0.1 + (i % 7) * 0.05})` }}
                />
              ))}
            </div>
            <div
              className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-body"
              style={{
                background: 'rgba(11,14,20,0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '0.9rem', color: '#a3e635', fontVariationSettings: "'FILL' 1" }}
              >trending_up</span>
              <span style={{ color: 'rgba(232,234,240,0.7)' }}>Status Anggaran:</span>
              <span style={{ color: '#a3e635' }}>Optimal</span>
            </div>
          </div>

          {/* Right: text */}
          <div>
            <h2 className="text-2xl font-bold text-white font-headline mb-3">
              Transparansi Data Keuangan
            </h2>
            <p className="text-sm leading-relaxed mb-6 font-body" style={{ color: 'rgba(232,234,240,0.55)' }}>
              SIMAK UIN Palopo mengadopsi teknologi ledger modern untuk memastikan setiap
              transaksi tercatat secara presisi dan dapat dipertanggungjawabkan sesuai regulasi BLU.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'Validasi otomatis data transaksi harian.',
                'Integrasi langsung dengan sistem pelaporan pusat.',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm font-body" style={{ color: 'rgba(232,234,240,0.7)' }}>
                  <span
                    className="material-symbols-outlined flex-shrink-0"
                    style={{ fontSize: '1.1rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}
                  >check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6C48D1, #9B6DFF)' }}
            >
              <span
                className="material-symbols-outlined text-white"
                style={{ fontSize: '0.85rem', fontVariationSettings: "'FILL' 1" }}
              >account_balance</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white font-headline">SIMAK UIN Palopo</p>
              <p className="text-xs font-body" style={{ color: 'rgba(232,234,240,0.35)' }}>
                © 2026 SIMAK UIN Palopo — Financial Management Information System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {['Kebijakan Privasi', 'Syarat & Ketentuan', 'Pusat Bantuan'].map(link => (
              <a
                key={link}
                href="#"
                className="text-xs font-body transition-colors hover:text-white"
                style={{ color: 'rgba(232,234,240,0.35)' }}
              >{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
