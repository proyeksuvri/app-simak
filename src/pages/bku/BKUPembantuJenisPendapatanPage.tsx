import { useMemo, useState } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKU } from '../../hooks/useBKU'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useFundingSources } from '../../hooks/useFundingSources'
import { useBankAccounts } from '../../hooks/useBankAccounts'
import { useAppContext } from '../../context/AppContext'

export function BKUPembantuJenisPendapatanPage() {
  const { entries, loading: loadingEntries } = useBKU('penerimaan')
  const { fundingSources, loading: loadingFS } = useFundingSources()
  const { accounts, loading: loadingAccounts } = useBankAccounts(true)
  const { printBKU, printing } = usePrintBKU()
  const { tahunAnggaran, currentUser } = useAppContext()

  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [activeAccount, setActiveAccount] = useState<string>('')
  const [activeBulan,   setActiveBulan]   = useState<number | null>(null)
  const [page,          setPage]          = useState(1)
  const [pageSize,      setPageSize]      = useState(10)

  const NAMA_BULAN = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember',
  ]

  const loading = loadingEntries || loadingFS || loadingAccounts

  const activeFS         = activeId ? fundingSources.find(f => f.id === activeId) : null
  const activeAccountObj = accounts.find(a => a.id === activeAccount)

  // Reset halaman saat filter berubah
  const handleJenisChange = (val: string) => {
    setActiveId(val || null)
    setActiveAccount('')
    setPage(1)
  }
  const handleBankChange = (val: string) => {
    setActiveAccount(val)
    setPage(1)
  }
  const handleBulanChange = (val: string) => {
    setActiveBulan(val === '' ? null : Number(val))
    setPage(1)
  }

  const filteredEntries = useMemo(() => {
    let saldo = 0
    return entries
      .filter(e => {
        if (activeId      && e.jenisPendapatanId !== activeId)     return false
        if (activeAccount && e.sourceAccountId   !== activeAccount) return false
        if (activeBulan !== null && Number(e.tanggal.slice(5, 7)) !== activeBulan) return false
        return true
      })
      .map(e => {
        saldo = saldo + e.debit - e.kredit
        return { ...e, saldo }
      })
  }, [entries, activeId, activeAccount, activeBulan])

  const saldoAkhir = filteredEntries.length > 0
    ? filteredEntries[filteredEntries.length - 1].saldo
    : 0

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize))
  const safePage   = Math.min(page, totalPages)

  const pagedEntries = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredEntries.slice(start, start + pageSize)
  }, [filteredEntries, safePage, pageSize])

  const cetakLabel = [
    activeFS ? activeFS.name : 'Semua Jenis Pendapatan',
    activeAccountObj ? `${activeAccountObj.bank_name} (${activeAccountObj.account_number})` : null,
  ].filter(Boolean).join(' — ')

  const handleCetak = () => {
    printBKU({
      entries:          filteredEntries,
      saldoAkhir,
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
          disabled={loading || printing || filteredEntries.length === 0}
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
        entries={filteredEntries}
        saldoAkhir={saldoAkhir}
        loading={loading}
      />

      <Card padding="sm">
        <BKULedger
          type="penerimaan"
          entriesOverride={pagedEntries}
          saldoAkhirOverride={saldoAkhir}
          loadingOverride={loading}
        />
      </Card>

      {!loading && filteredEntries.length > 0 && (
        <BKUPagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredEntries.length}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}
    </PageContainer>
  )
}
