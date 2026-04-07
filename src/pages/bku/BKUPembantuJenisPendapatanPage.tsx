import { useMemo, useState, useEffect } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
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
  const [activeAccount, setActiveAccount] = useState<string>('')  // '' = semua bank
  const [pageSize,      setPageSize]      = useState<number>(20)

  const activeFS = activeId ? fundingSources.find(f => f.id === activeId) : null
  const activeAccountObj = accounts.find(a => a.id === activeAccount)

  const filteredEntries = useMemo(() => {
    let saldo = 0
    return entries
      .filter(e => {
        if (activeId && e.jenisPendapatanId !== activeId) return false
        if (activeAccount && e.sourceAccountId !== activeAccount) return false
        return true
      })
      .map(e => {
        saldo = saldo + e.debit - e.kredit
        return { ...e, saldo }
      })
  }, [entries, activeId, activeAccount])

  const saldoAkhir = filteredEntries.length > 0
    ? filteredEntries[filteredEntries.length - 1].saldo
    : 0

  const loading = loadingEntries || loadingFS || loadingAccounts

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
      {/* Jenis Pendapatan Selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-[#e8eaf0] font-body">Jenis Pendapatan:</span>
        {loadingFS ? (
          <span className="text-xs text-on-surface-variant font-body">Memuat...</span>
        ) : (
          <select
            value={activeId ?? ''}
            onChange={e => { setActiveId(e.target.value || null); setActiveAccount('') }}
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

      {/* Filter Bank + Per Halaman */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!loadingAccounts && accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#e8eaf0] font-body">Bank:</span>
            <select
              value={activeAccount}
              onChange={e => setActiveAccount(e.target.value)}
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

        {/* Per halaman */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-[#bfc8c4] font-body whitespace-nowrap">Baris per halaman:</span>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-sm bg-[#1e2430] border border-[#2a303c] text-[#e8eaf0] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors cursor-pointer"
          >
            {[10, 20, 50, 100].map(n => (
              <option key={n} value={n} style={{ background: '#1e2430' }}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <BKUSummaryCards
        entries={filteredEntries}
        saldoAkhir={saldoAkhir}
        loading={loading}
      />

      {/* Tabel Ledger */}
      <Card padding="sm">
        <BKULedger
          type="penerimaan"
          entriesOverride={filteredEntries}
          saldoAkhirOverride={saldoAkhir}
          loadingOverride={loading}
          pageSize={pageSize}
        />
      </Card>
    </PageContainer>
  )
}
