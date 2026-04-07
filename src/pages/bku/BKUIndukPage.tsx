import { useState } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKUPage, fetchAllBKUEntries } from '../../hooks/useBKUPage'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useAppContext } from '../../context/AppContext'

export function BKUIndukPage() {
  const { tahunAnggaran, currentUser } = useAppContext()
  const { printBKU, printing } = usePrintBKU()

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { entries, saldoAkhir, total, totalPages, loading } =
    useBKUPage('induk', page, pageSize)

  const handleCetak = async () => {
    const { entries: all, saldoAkhir: sa } = await fetchAllBKUEntries('induk', tahunAnggaran)
    printBKU({
      entries:       all,
      saldoAkhir:    sa,
      tahunAnggaran,
      namaUnit:      'UIN Palopo',
      namaBendahara: currentUser.nama,
      nip:           currentUser.nip,
      tipeBKU:       'induk',
    })
  }

  return (
    <PageContainer
      title="BKU Pengeluaran Induk"
      actions={
        <Button
          icon={printing ? 'hourglass_empty' : 'print'}
          variant="secondary"
          size="sm"
          onClick={handleCetak}
          disabled={loading || printing || total === 0}
        >
          {printing ? 'Menyiapkan PDF...' : 'Cetak BKU'}
        </Button>
      }
    >
      <BKUSummaryCards entries={entries} saldoAkhir={saldoAkhir} loading={loading} />

      <Card padding="sm">
        <BKULedger
          type="induk"
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
