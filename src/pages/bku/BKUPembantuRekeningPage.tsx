import { useState, useEffect } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { RekeningKoranCard } from '../../components/domain/RekeningKoranCard'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKUPage, fetchAllBKUEntries } from '../../hooks/useBKUPage'
import { usePrintBKUPembantuRekening } from '../../hooks/usePrintBKUPembantuRekening'
import { useBankAccounts } from '../../hooks/useBankAccounts'
import { useAppContext } from '../../context/AppContext'

const NAMA_BULAN = [
  'Jan','Feb','Mar','Apr','Mei','Jun',
  'Jul','Agu','Sep','Okt','Nov','Des',
]
const NAMA_BULAN_FULL = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

/** Singkat nama bank: ambil konten dalam kurung jika ada, atau hapus prefiks "Bank" */
function abbrevBank(name: string): string {
  const m = name.match(/\(([^)]+)\)/)
  if (m) return m[1]!
  return name.replace(/^bank\s+/i, '').split(' ').slice(0, 2).join(' ')
}

export function BKUPembantuRekeningPage() {
  const { tahunAnggaran, currentUser } = useAppContext()
  const { accounts, loading: loadingAccounts } = useBankAccounts(true)
  const { printRekening, printing } = usePrintBKUPembantuRekening()

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [activeBulan,     setActiveBulan]     = useState<number | null>(null)
  const [page,            setPage]            = useState(1)
  const [pageSize,        setPageSize]        = useState(10)

  useEffect(() => {
    if (!activeAccountId && accounts.length > 0) {
      setActiveAccountId(accounts[0].id)
    }
  }, [accounts, activeAccountId])

  const activeAccount = accounts.find(a => a.id === activeAccountId)

  const { entries, saldoAkhir, totalDebit, totalKredit, total, totalPages, loading: loadingBKU } =
    useBKUPage('penerimaan', page, pageSize, {
      accountId: activeAccountId,
      bulan:     activeBulan,
    })

  const loading = loadingAccounts || loadingBKU

  const handleSelectAccount = (id: string) => {
    setActiveAccountId(id)
    setPage(1)
  }

  const handleSelectBulan = (bulan: number | null) => {
    setActiveBulan(bulan)
    setPage(1)
  }

  const pageTitle = activeAccount
    ? `BKU Pembantu: ${activeAccount.bank_name} - ${activeAccount.account_number}`
    : 'BKU Pembantu Rekening'

  const handleCetak = async () => {
    const { entries: all, saldoAkhir: sa } = await fetchAllBKUEntries(
      'penerimaan', tahunAnggaran, {
        accountId: activeAccountId,
        bulan:     activeBulan,
      }
    )
    printRekening({
      entries:       all,
      saldoAkhir:    sa,
      tahunAnggaran,
      namaUnit:      'UIN Palopo — Biro Keuangan',
      namaBendahara: currentUser.nama,
      nip:           currentUser.nip,
      namaRekening:  activeAccount
        ? `${activeAccount.bank_name} - ${activeAccount.account_number}`
        : undefined,
      bulanFilter:   activeBulan,
    })
  }

  return (
    <PageContainer
      title={pageTitle}
      actions={
        <Button
          icon={printing ? 'hourglass_empty' : 'print'}
          variant="secondary"
          size="sm"
          onClick={handleCetak}
          disabled={loading || printing || total === 0}
        >
          {printing ? 'Menyiapkan PDF...' : 'Cetak Pembantu'}
        </Button>
      }
    >
      {/* ── Premium Bank Filter ── */}
      {!loadingAccounts && accounts.length > 0 && (
        <div
          className="relative mb-4 rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #004f45 0%, #00695c 60%, #00796b 100%)' }}
        >
          {/* subtle inner glow top-left */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-24 w-24 rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #a0f2e1 0%, transparent 70%)' }}
          />

          <div className="relative flex flex-wrap items-center gap-2 px-4 py-3" style={{ overflow: 'visible' }}>
            {/* Label */}
            <div className="flex items-center gap-1.5 mr-1">
              <span className="font-body text-[10px] font-bold tracking-[0.1em] uppercase text-primary-fixed opacity-80">
                Filter Bank
              </span>
            </div>

            {/* Divider */}
            <div className="mx-1 h-5 w-px bg-white/20" />

            {/* Bank pills dengan tooltip */}
            {accounts.map(acc => {
              const isActive = activeAccountId === acc.id
              const abbrev = abbrevBank(acc.bank_name)
              const masked = acc.account_number.length > 8
                ? `${acc.account_number.slice(0, 3)}···${acc.account_number.slice(-4)}`
                : acc.account_number
              return (
                <div key={acc.id} className="relative group" style={{ overflow: 'visible' }}>
                  <button
                    onClick={() => handleSelectAccount(acc.id)}
                    className={[
                      'rounded-full px-3.5 py-1 text-xs font-medium font-body transition-all duration-150',
                      isActive
                        ? 'bg-white text-primary font-bold shadow-md scale-105'
                        : 'bg-white/10 text-primary-fixed hover:bg-white/20 hover:scale-105',
                    ].join(' ')}
                  >
                    <span className="font-semibold">{abbrev}</span>
                    <span className="ml-1 opacity-60 font-mono text-[10px]">{masked}</span>
                  </button>
                  {/* Tooltip */}
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  >
                    <div
                      className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-body shadow-xl"
                      style={{
                        background: 'rgba(15,22,30,0.95)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#e8eaf0',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <span className="font-semibold">{acc.bank_name}</span>
                      <span className="ml-1.5 font-mono opacity-60">{acc.account_number}</span>
                    </div>
                    {/* Arrow */}
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid rgba(15,22,30,0.95)',
                      }}
                    />
                  </div>
                </div>
              )
            })}

            {/* Active badge — nama singkat bank aktif di kanan */}
            {activeAccount && (
              <div className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 border border-white/25">
                <span className="text-[11px] font-bold font-body text-white">
                  {abbrevBank(activeAccount.bank_name)}
                </span>
                <span className="text-[10px] font-mono text-white/50">
                  ···{activeAccount.account_number.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {loadingAccounts && (
        <div className="mb-4 flex items-center gap-2 px-1" style={{ color: 'rgba(232,234,240,0.4)' }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '1rem' }}>progress_activity</span>
          <span className="text-xs font-body">Memuat rekening...</span>
        </div>
      )}
      {!loadingAccounts && accounts.length === 0 && (
        <p className="mb-4 text-xs text-on-surface-variant font-body">Belum ada rekening bank aktif.</p>
      )}

      {/* ── Premium Month Filter ── */}
      <div className="relative mb-5 overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #004f45 0%, #00695c 60%, #00796b 100%)' }}
      >
        {/* subtle inner glow top-left */}
        <div className="pointer-events-none absolute -top-6 -left-6 h-28 w-28 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a0f2e1 0%, transparent 70%)' }}
        />

        <div className="relative flex flex-wrap items-center gap-2 px-4 py-3">

          {/* Label */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="font-body text-[10px] font-bold tracking-[0.1em] uppercase text-primary-fixed opacity-80">
              Filter Bulan
            </span>
          </div>

          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-white/20" />

          {/* "Semua" pill */}
          <button
            onClick={() => handleSelectBulan(null)}
            className={[
              'rounded-full px-3.5 py-1 text-xs font-semibold font-body transition-all duration-150',
              activeBulan === null
                ? 'bg-white text-primary shadow-md scale-105'
                : 'bg-white/10 text-primary-fixed hover:bg-white/20 hover:scale-105',
            ].join(' ')}
          >
            Semua
          </button>

          {/* Month pills */}
          {NAMA_BULAN.map((nama, idx) => {
            const bulan = idx + 1
            const isActive = activeBulan === bulan
            return (
              <button
                key={bulan}
                onClick={() => handleSelectBulan(bulan)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium font-body transition-all duration-150',
                  isActive
                    ? 'bg-white text-primary font-bold shadow-md scale-105'
                    : 'bg-white/10 text-primary-fixed hover:bg-white/20 hover:scale-105',
                ].join(' ')}
              >
                {nama}
              </button>
            )
          })}

          {/* Active badge */}
          {activeBulan !== null && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 border border-white/25">
              <span className="text-[11px] font-bold font-body text-white">
                {NAMA_BULAN_FULL[activeBulan - 1]}
              </span>
              <button
                onClick={() => handleSelectBulan(null)}
                className="flex items-center text-white/70 hover:text-white transition-colors"
                title="Hapus filter bulan"
              >
                <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>close</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <BKUSummaryCards
        entries={entries}
        saldoAkhir={saldoAkhir}
        totalDebit={totalDebit}
        totalKredit={totalKredit}
        loading={loading}
      />

      <Card padding="sm">
        {activeAccountId ? (
          <BKULedger
            type="penerimaan"
            entriesOverride={entries}
            saldoAkhirOverride={saldoAkhir}
            loadingOverride={loading}
          />
        ) : (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Pilih rekening bank di atas.
          </p>
        )}
      </Card>

      {!loading && activeAccountId && total > 0 && (
        <BKUPagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          onPage={p => setPage(p)}
          onPageSize={s => { setPageSize(s); setPage(1) }}
        />
      )}

      {/* ── Rekening Koran PDF Viewer ── */}
      {activeAccountId && (
        <RekeningKoranCard
          accountId={activeAccountId}
          accountName={
            activeAccount
              ? `${activeAccount.bank_name} - ${activeAccount.account_number}`
              : activeAccountId
          }
          tahun={tahunAnggaran}
        />
      )}
    </PageContainer>
  )
}
