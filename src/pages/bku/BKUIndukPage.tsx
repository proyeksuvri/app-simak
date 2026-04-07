import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
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
        <BKULedger type="induk" />
      </Card>
    </PageContainer>
  )
}
