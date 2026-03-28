import { MetricCard } from '../components/domain/MetricCard'
import { CashFlowChart } from '../components/domain/CashFlowChart'
import { AlertBanner } from '../components/domain/AlertBanner'
import { PendingApprovals } from '../components/domain/PendingApprovals'
import { TransactionTable } from '../components/domain/TransactionTable'
import { Card } from '../components/ui/Card'
import { PageContainer } from '../components/layout/PageContainer'
import { useDashboardData } from '../hooks/useDashboardData'

const CARD_DELAYS = [
  'animate-delay-75',
  'animate-delay-150',
  'animate-delay-225',
  'animate-delay-300',
] as const

export function DashboardPage() {
  const { metrics, chartData, approvals, deadlineTutupBuku } = useDashboardData()

  return (
    <PageContainer>
      {/* Alert — pertama muncul */}
      <div className="mb-6 animate-fade-up animate-delay-0">
        <AlertBanner deadline={deadlineTutupBuku} />
      </div>

      {/* Metric Cards — staggered satu per satu */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div key={m.id} className={['animate-fade-up', CARD_DELAYS[i] ?? 'animate-delay-300'].join(' ')}>
            <MetricCard data={m} animDelay={CARD_DELAYS[i] ?? 'animate-delay-300'} />
          </div>
        ))}
      </div>

      {/* Chart + Pending Approvals */}
      <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-up animate-delay-400">
        <Card className="col-span-2" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface font-headline">Arus Kas 6 Bulan</h3>
            <span className="text-xs text-on-surface-variant font-body">Jan — Jun 2024</span>
          </div>
          <CashFlowChart data={chartData} />
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface font-headline">Menunggu Persetujuan</h3>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-error text-on-error text-xs font-bold">
              {approvals.length}
            </span>
          </div>
          <PendingApprovals items={approvals.slice(0, 4)} />
        </Card>
      </div>

      {/* Transaksi Terkini — terakhir muncul */}
      <div className="animate-fade-up animate-delay-600">
        <Card padding="md" noLift>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface font-headline">Transaksi Terkini</h3>
            <a href="/penerimaan/bpn" className="text-xs text-primary font-medium font-body hover:underline">
              Lihat semua →
            </a>
          </div>
          <TransactionTable limit={5} />
        </Card>
      </div>
    </PageContainer>
  )
}
