import { useState } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKUPage, fetchAllBKUEntries } from '../../hooks/useBKUPage'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useFundingSources } from '../../hooks/useFundingSources'
import { useBankAccounts } from '../../hooks/useBankAccounts'
import { useAppContext } from '../../context/AppContext'

const NAMA_BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

export function BKUPembantuJenisPendapatanPage() {
  const { tahunAnggaran, currentUser } = useAppContext()
  const { fundingSources, loading: loadingFS } = useFundingSources()
  const { accounts, loading: loadingAccounts } = useBankAccounts(true)
  const { printBKU, printing } = usePrintBKU()

  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [activeAccount, setActiveAccount] = useState<string>('')
  const [activeBulan,   setActiveBulan]   = useState<number | null>(null)
  const [page,          setPage]          = useState(1)
  const [pageSize,      setPageSize]      = useState(10)

  const handleJenisChange = (val: string) => { setActiveId(val || null); setPage(1) }
  const handleBankChange  = (val: string) => { setActiveAccount(val);    setPage(1) }
  const handleBulanChange = (val: string) => {
    setActiveBulan(val === '' ? null : Number(val))
    setPage(1)
  }

  const { entries, saldoAkhir, totalDebit, totalKredit, total, totalPages, loading: loadingBKU } =
    useBKUPage('penerimaan', page, pageSize, {
      jenisPendapatanId: activeId,
      accountId:         activeAccount || null,
      bulan:             activeBulan,
    })

  const loading = loadingBKU || loadingFS || loadingAccounts

  const activeFS         = activeId      ? fundingSources.find(f => f.id === activeId) : null
  const activeAccountObj = activeAccount ? accounts.find(a => a.id === activeAccount)  : null

  const cetakLabel = [
    activeFS ? activeFS.name : 'Semua Jenis Pendapatan',
    activeAccountObj ? `${activeAccountObj.bank_name} (${activeAccountObj.account_number})` : null,
    activeBulan      ? NAMA_BULAN[activeBulan - 1] : null,
  ].filter(Boolean).join(' — ')

  const handleCetak = async () => {
    const { entries: all, saldoAkhir: sa } = await fetchAllBKUEntries(
      'penerimaan', tahunAnggaran, {
        jenisPendapatanId: activeId,
        accountId:         activeAccount || null,
        bulan:             activeBulan,
      }
    )
    printBKU({
      entries:          all,
      saldoAkhir:       sa,
      tahunAnggaran,
      namaUnit:         'UIN Palopo',
      namaBendahara:    currentUser.nama,
      nip:              currentUser.nip,
      kategoriPembantu: cetakLabel || undefined,
      tipeBKU:          'pembantu',
    })
  }

  return (
    <PageContainer
      title={activeFS ? `BKU Pembantu: ${activeFS.name}` : 'BKU Pembantu: Semua Jenis Pendapatan'}
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
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Jenis Pendapatan */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#e8eaf0] font-body whitespace-nowrap">Jenis Pendapatan:</span>
          {loadingFS ? (
            <span className="text-xs text-on-surface-variant font-body">Memuat...</span>
          ) : (
            <select
              value={activeId ?? ''}
              onChange={e => handleJenisChange(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
            >
              <option value="" style={{ background: '#1e2430' }}>Semua Jenis Pendapatan</option>
              {fundingSources.map(fs => (
                <option key={fs.id} value={fs.id} style={{ background: '#1e2430' }}>
                  {fs.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Bank */}
        {!loadingAccounts && accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#e8eaf0] font-body whitespace-nowrap">Bank:</span>
            <select
              value={activeAccount}
              onChange={e => handleBankChange(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
            >
              <option value="" style={{ background: '#1e2430' }}>Semua Bank</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} style={{ background: '#1e2430' }}>
                  {acc.bank_name} — {acc.account_number}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bulan */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#e8eaf0] font-body whitespace-nowrap">Bulan:</span>
          <select
            value={activeBulan ?? ''}
            onChange={e => handleBulanChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
          >
            <option value="" style={{ background: '#1e2430' }}>Semua Bulan</option>
            {NAMA_BULAN.map((nama, idx) => (
              <option key={idx + 1} value={idx + 1} style={{ background: '#1e2430' }}>
                {nama}
              </option>
            ))}
          </select>
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
        <BKULedger
          type="penerimaan"
          entriesOverride={entries}
          saldoAkhirOverride={saldoAkhir}
          loadingOverride={loading}
        />
      </Card>

      {!loading && total > 0 && (
        <BKUPagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          onPage={p => setPage(p)}
          onPageSize={s => { setPageSize(s); setPage(1) }}
        />
      )}
    </PageContainer>
  )
}
