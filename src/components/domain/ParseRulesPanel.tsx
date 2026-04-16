/**
 * ParseRulesPanel.tsx
 * Panel yang menampilkan daftar referensi aturan parsing mutasi bank.
 * Menampilkan setiap aturan: kata kunci Remark, auto-fill, field wajib,
 * dan (opsional) jumlah baris yang cocok dari data yang sudah diparsing.
 */

import { useState } from 'react'
import { PARSE_RULES, evaluateRow } from '../../lib/parseRules'
import type { RowSnapshot, RowStatus } from '../../lib/parseRules'

// ── Tipe Props ────────────────────────────────────────────────────────────────

interface ParseRulesPanelProps {
  /** Baris hasil parsing (opsional). Jika diberikan, tampilkan statistik match. */
  rows?:   RowSnapshot[]
  txType?: 'IN' | 'OUT'
}

// ── Badge Status ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<RowStatus, { bg: string; text: string; label: string; icon: string }> = {
  ok:      { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80', label: 'Siap',        icon: 'check_circle' },
  warning: { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24', label: 'Perlu Diisi', icon: 'warning'      },
  error:   { bg: 'rgba(248,113,113,0.15)', text: '#f87171', label: 'Error',       icon: 'error'        },
}

// ── Komponen utama ────────────────────────────────────────────────────────────

export function ParseRulesPanel({ rows = [], txType = 'IN' }: ParseRulesPanelProps) {
  const [open,        setOpen]        = useState(false)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  // Hitung statistik per aturan
  const statsPerRule = PARSE_RULES.reduce<Record<string, {
    total: number; ok: number; warning: number; error: number
  }>>((acc, rule) => {
    acc[rule.id] = { total: 0, ok: 0, warning: 0, error: 0 }
    return acc
  }, {})

  if (rows.length > 0) {
    for (const row of rows) {
      const result = evaluateRow(row, txType)
      const s = statsPerRule[result.rule.id]
      if (s) {
        s.total++
        s[result.status]++
      }
    }
  }

  const totalRules = PARSE_RULES.length
  const hasData    = rows.length > 0

  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#161a21' }}
    >
      {/* ── Header toggle ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <span
          className="material-symbols-outlined flex-shrink-0"
          style={{ fontSize: '1.1rem', color: '#9B6DFF', fontVariationSettings: "'FILL' 1" }}
        >
          rule
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.75rem] font-semibold text-[#e8eaf0]">
            Referensi Aturan Parsing
          </p>
          <p className="text-[0.65rem] text-[#bfc8c4]/50 mt-0.5">
            {totalRules} aturan aktif — berdasarkan pola kata kunci kolom Remark
            {hasData && ` • ${rows.length} baris dianalisa`}
          </p>
        </div>

        {/* Statistik ringkas jika data ada */}
        {hasData && (
          <div className="flex items-center gap-2 mr-2">
            {(['ok', 'warning', 'error'] as RowStatus[]).map(s => {
              const total = rows.filter(r => evaluateRow(r, txType).status === s).length
              if (total === 0) return null
              const st = STATUS_STYLE[s]
              return (
                <span
                  key={s}
                  className="flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: st.bg, color: st.text }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.7rem', fontVariationSettings: "'FILL' 1" }}>
                    {st.icon}
                  </span>
                  {total}
                </span>
              )
            })}
          </div>
        )}

        <span
          className="material-symbols-outlined flex-shrink-0 transition-transform"
          style={{
            fontSize: '1rem',
            color: 'rgba(232,234,240,0.3)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          expand_more
        </span>
      </button>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {open && (
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

          {/* Sub-header */}
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <span className="material-symbols-outlined text-[#fbbf24]" style={{ fontSize: '0.85rem', fontVariationSettings: "'FILL' 1" }}>
              info
            </span>
            <p className="text-[0.65rem] text-[#bfc8c4]/60">
              Aturan dievaluasi berurutan. Aturan pertama yang cocok dengan Remark akan digunakan.
              Kata kunci diperiksa secara <em>case-insensitive</em>.
            </p>
          </div>

          {/* Daftar aturan */}
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {PARSE_RULES.map((rule, idx) => {
              const st      = statsPerRule[rule.id]
              const isExpand = expandedId === rule.id
              const isCatch  = idx === PARSE_RULES.length - 1

              return (
                <div key={rule.id}>
                  {/* Baris aturan */}
                  <button
                    onClick={() => setExpandedId(isExpand ? null : rule.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    {/* Nomor urut */}
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold mt-0.5"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#bfc8c4' }}
                    >
                      {idx + 1}
                    </span>

                    {/* Ikon aturan */}
                    <span
                      className="material-symbols-outlined flex-shrink-0 mt-0.5"
                      style={{
                        fontSize: '1rem',
                        color: rule.color,
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      {rule.icon}
                    </span>

                    {/* Label + deskripsi */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[0.75rem] font-semibold" style={{ color: rule.color }}>
                          {rule.label}
                        </p>
                        {isCatch && (
                          <span
                            className="text-[0.58rem] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                          >
                            catch-all
                          </span>
                        )}
                      </div>
                      <p className="text-[0.65rem] text-[#bfc8c4]/55 mt-0.5 leading-relaxed">
                        {rule.description}
                      </p>

                      {/* Keywords preview */}
                      {rule.matchKeywords && rule.matchKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {rule.matchKeywords.map(kw => (
                            <span
                              key={kw}
                              className="text-[0.6rem] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'rgba(255,255,255,0.07)', color: '#e8eaf0' }}
                            >
                              {kw}
                            </span>
                          ))}
                          {rule.matchRegex && (
                            <span
                              className="text-[0.6rem] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'rgba(108,72,209,0.2)', color: '#c4b5fd' }}
                              title="Pola regex tambahan"
                            >
                              {rule.matchRegex.source}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Statistik match */}
                    {hasData && st && (
                      <div className="flex-shrink-0 text-right ml-2">
                        <p className="text-[0.7rem] font-bold text-[#e8eaf0]">{st.total}</p>
                        <p className="text-[0.58rem] text-[#bfc8c4]/40">baris</p>
                        {st.total > 0 && (
                          <div className="flex gap-1 mt-1 justify-end">
                            {st.ok      > 0 && <span className="text-[0.58rem] text-[#4ade80]">✓{st.ok}</span>}
                            {st.warning > 0 && <span className="text-[0.58rem] text-[#fbbf24]">⚠{st.warning}</span>}
                            {st.error   > 0 && <span className="text-[0.58rem] text-[#f87171]">✗{st.error}</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expand chevron */}
                    <span
                      className="material-symbols-outlined flex-shrink-0 mt-0.5 transition-transform"
                      style={{
                        fontSize: '0.9rem',
                        color: 'rgba(232,234,240,0.25)',
                        transform: isExpand ? 'rotate(180deg)' : 'none',
                      }}
                    >
                      expand_more
                    </span>
                  </button>

                  {/* Detail aturan (jika diexpand) */}
                  {isExpand && (
                    <div
                      className="px-4 pb-4"
                      style={{ background: 'rgba(0,0,0,0.15)' }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-8 pt-1">

                        {/* Auto-fill */}
                        <div>
                          <p className="text-[0.62rem] uppercase tracking-widest text-[#bfc8c4]/40 mb-2 font-semibold">
                            Otomatis Diisi
                          </p>
                          {Object.keys(rule.fill).length === 0 ? (
                            <p className="text-[0.68rem] text-[#bfc8c4]/40 italic">
                              Tidak ada auto-fill — semua field perlu diisi manual
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {Object.entries(rule.fill).map(([k, v]) => (
                                <div key={k} className="flex gap-2 items-start">
                                  <span
                                    className="text-[0.6rem] px-1.5 py-0.5 rounded flex-shrink-0 font-mono"
                                    style={{ background: 'rgba(108,72,209,0.2)', color: '#c4b5fd' }}
                                  >
                                    {k.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[0.65rem] text-[#e8eaf0]/80 leading-tight">{v as string}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Field wajib */}
                        <div>
                          <p className="text-[0.62rem] uppercase tracking-widest text-[#bfc8c4]/40 mb-2 font-semibold">
                            Field Wajib Diisi
                          </p>
                          <div className="space-y-1">
                            {rule.requireFields.map(rf => (
                              <div key={rf.field} className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[#fbbf24]" style={{ fontSize: '0.7rem', fontVariationSettings: "'FILL' 1" }}>
                                  check_box_outline_blank
                                </span>
                                <span className="text-[0.65rem] text-[#bfc8c4]/70">{rf.label}</span>
                              </div>
                            ))}
                          </div>
                          {rule.criticalCheck && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="material-symbols-outlined text-[#f87171]" style={{ fontSize: '0.7rem', fontVariationSettings: "'FILL' 1" }}>
                                error
                              </span>
                              <span className="text-[0.62rem] text-[#f87171]/70">
                                Nominal {txType === 'IN' ? 'kredit' : 'debet'} harus &gt; 0
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer legenda */}
          <div
            className="px-4 py-2.5 flex flex-wrap items-center gap-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}
          >
            {(['ok', 'warning', 'error'] as RowStatus[]).map(s => {
              const st = STATUS_STYLE[s]
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: st.text, fontVariationSettings: "'FILL' 1" }}>
                    {st.icon}
                  </span>
                  <span className="text-[0.65rem]" style={{ color: st.text }}>{st.label}</span>
                  <span className="text-[0.65rem] text-[#bfc8c4]/40">—</span>
                  <span className="text-[0.62rem] text-[#bfc8c4]/40">
                    {s === 'ok'      && 'Semua field wajib terisi, nominal valid'}
                    {s === 'warning' && 'Ada field wajib yang belum diisi'}
                    {s === 'error'   && 'Nominal = 0 atau kondisi kritis lainnya'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
