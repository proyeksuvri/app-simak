import { useState, useEffect } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKUPage, fetchAllBKUEntries } from '../../hooks/useBKUPage'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useBankAccounts } from '../../hooks/useBankAccounts'
import { useAppContext } from '../../context/AppContext'

export function BKUPembantuRekeningPage() {
  const { tahunAnggaran, currentUser } = useAppContext()
  const { accounts, loading: loadingAccounts } = useBankAccounts(true)
  const { printBKU, printing } = usePrintBKU()

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [page,            setPage]            = useState(1)
  const [pageSize,        setPageSize]        = useState(10)

  useEffect(() => {
    if (!activeAccountId && accounts.length > 0) {
      setActiveAccountId(accounts[0].id)
    }
  }, [accounts, activeAccountId])

  const activeAccount = accounts.find(a => a.id === activeAccountId)

  const { entries, saldoAkhir, totalDebit, totalKredit, total, totalPages, loading: loadingBKU } =
    useBKUPage('penerimaan', page, pageSize, { accountId: activeAccountId })

  const loading = loadingAccounts || loadingBKU

  const handleSelectAccount = (id: string) => {
    setActiveAccountId(id)
    setPage(1)
  }

  const pageTitle = activeAccount
    ? `BKU Pembantu: ${activeAccount.bank_name} - ${activeAccount.account_number}`
    : 'BKU Pembantu Rekening'

  const handleCetak = async () => {
    const { entries: all, saldoAkhir: sa } = await fetchAllBKUEntries(
      'penerimaan', tahunAnggaran, { accountId: activeAccountId }
    )
    printBKU({
      entries:          all,
      saldoAkhir:       sa,
      tahunAnggaran,
      namaUnit:         'UIN Palopo',
      namaBendahara:    currentUser.nama,
      nip:              currentUser.nip,
      kategoriPembantu: activeAccount
        ? `${activeAccount.bank_name} (${activeAccount.account_number})`
        : undefined,
      tipeBKU: 'pembantu',
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
      {/* Rekening Selector */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {loadingAccounts ? (
          <span className="text-xs text-on-surface-variant font-body">Memuat rekening...</span>
        ) : accounts.length === 0 ? (
          <span className="text-xs text-on-surface-variant font-body">Belum ada rekening bank aktif.</span>
        ) : (
          accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => handleSelectAccount(acc.id)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-medium font-body transition-colors',
                activeAccountId === acc.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              ].join(' ')}
            >
              <span className="font-semibold">{acc.bank_name}</span>
              <span className="ml-1 opacity-70">{acc.account_number}</span>
            </button>
          ))
        )}
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
    </PageContainer>
  )
}
