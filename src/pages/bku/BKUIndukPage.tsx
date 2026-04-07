import { useMemo, useState } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKU } from '../../hooks/useBKU'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useAppContext } from '../../context/AppContext'

export function BKUIndukPage() {
  const { entries, saldoAkhir, loading } = useBKU('induk')
  const { printBKU, printing } = usePrintBKU()
  const { tahunAnggaran, currentUser } = useAppContext()

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
  const safePage   = Math.min(page, totalPages)

  const pagedEntries = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return entries.slice(start, start + pageSize)
  }, [entries, safePage, pageSize])

  const handleCetak = () => {
    printBKU({
      entries,
      saldoAkhir,
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
          disabled={loading || printing || entries.length === 0}
        >
          {printing ? 'Menyiapkan PDF...' : 'Cetak BKU'}
        </Button>
      }
    >
      <BKUSummaryCards entries={entries} saldoAkhir={saldoAkhir} loading={loading} />

      <Card padding="sm">
        <BKULedger
          type="induk"
          entriesOverride={pagedEntries}
          saldoAkhirOverride={saldoAkhir}
          loadingOverride={loading}
        />
      </Card>

      {!loading && entries.length > 0 && (
        <BKUPagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={entries.length}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}
    </PageContainer>
  )
}
