import { Card }            from '../../components/ui/Card'
import { PageContainer }  from '../../components/layout/PageContainer'
import { TransactionTable } from '../../components/domain/TransactionTable'

export function ApprovalPage() {
  return (
    <PageContainer title="Persetujuan Transaksi">
      <div className="space-y-6">
        <Card padding="sm">
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-sm font-semibold text-on-surface font-headline">
              Transaksi Menunggu Persetujuan
            </h3>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">
              Daftar transaksi yang telah diajukan oleh bendahara dan memerlukan persetujuan Anda.
            </p>
          </div>
          <TransactionTable filterStatus="diajukan" />
        </Card>
      </div>
    </PageContainer>
  )
}
