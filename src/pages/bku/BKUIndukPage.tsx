import { BKULedger } from '../../components/domain/BKULedger'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'

export function BKUIndukPage() {
  return (
    <PageContainer
      title="BKU Pengeluaran Induk"
      actions={
        <Button icon="print" variant="secondary" size="sm">
          Cetak BKU
        </Button>
      }
    >
      <Card padding="sm">
        <BKULedger type="induk" />
      </Card>
    </PageContainer>
  )
}
