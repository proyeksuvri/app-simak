import { BKULedger } from '../../components/domain/BKULedger'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'

export function BKUPenerimaanPage() {
  return (
    <PageContainer
      title="BKU Penerimaan"
      actions={
        <Button icon="print" variant="secondary" size="sm">
          Cetak BKU
        </Button>
      }
    >
      <Card padding="sm">
        <BKULedger type="penerimaan" />
      </Card>
    </PageContainer>
  )
}
