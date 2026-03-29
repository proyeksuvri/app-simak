import { MetricCard } from '../components/domain/MetricCard'
import { CashFlowChart } from '../components/domain/CashFlowChart'
import { AlertBanner } from '../components/domain/AlertBanner'
import { PendingApprovals } from '../components/domain/PendingApprovals'
import { TransactionTable } from '../components/domain/TransactionTable'
import { Card } from '../components/ui/Card'
import { PageContainer } from '../components/layout/PageContainer'
import { useDashboardData } from '../hooks/useDashboardData'
import { useAppContext } from '../context/AppContext'

const CARD_DELAYS = [
  'animate-delay-75',
  'animate-delay-150',
  'animate-delay-225',
  'animate-delay-300',
] as const

export function DashboardPage() {
  const { metrics, chartData, approvals, deadlineTutupBuku, loading, isBPN, isBPK } = useDashboardData()
  const { tahunAnggaran, currentUser } = useAppContext()

  const role   = currentUser.role
  const unitId = currentUser.unitId

  // Filter TransactionTable sesuai role
  const txFilterType   = isBPN ? 'penerimaan' : isBPK ? 'pengeluaran' : undefined
  const txFilterUnitId = role === 'bendahara_pembantu' && unitId ? unitId : undefined

  // Label & link "Lihat semua"
  const lihatSemuaHref  = isBPN ? '/penerimaan/bpn' : isBPK ? '/pengeluaran/bpk' : '/penerimaan/bpn'
  const lihatSemuaLabel = isBPN ? 'Lihat BPN →' : isBPK ? 'Lihat BPK →' : 'Lihat semua →'

  // Judul chart
  const chartTitle = isBPN ? 'Grafik Penerimaan Bulanan' : isBPK ? 'Grafik Pengeluaran Bulanan' : 'Arus Kas Bulanan'

  return (
    <PageContainer>
      {/* Alert — pertama muncul */}
      <div className="mb-6 animate-fade-up animate-delay-0">
        <AlertBanner deadline={deadlineTutupBuku} />
      </div>

      {/* Metric Cards — staggered satu per satu */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading
          ? CARD_DELAYS.map((d) => (
              <div key={d} className={['animate-fade-up', d].join(' ')}>
                <div className="bg-surface-container-lowest rounded-xl shadow-card p-5 h-[120px] animate-pulse" />
              </div>
            ))
          : metrics.map((m, i) => (
              <div key={m.id} className={['animate-fade-up', CARD_DELAYS[i] ?? 'animate-delay-300'].join(' ')}>
                <MetricCard data={m} animDelay={CARD_DELAYS[i] ?? 'animate-delay-300'} />
              </div>
            ))
        }
      </div>

      {/* Chart + Pending Approvals */}
      <div className="grid grid-cols-3 gap-4 mb-6 animate-fade-up animate-delay-400">
        <Card className="col-span-2" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface font-headline">{chartTitle}</h3>
            <span className="text-xs text-on-surface-variant font-body">TA {tahunAnggaran}</span>
          </div>
          <CashFlowChart data={chartData} showPenerimaan={!isBPK} showPengeluaran={!isBPN} />
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface font-headline">Menunggu Persetujuan</h3>
            {approvals.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-error text-on-error text-xs font-bold">
                {approvals.length}
              </span>
            )}
          </div>
          <PendingApprovals items={approvals.slice(0, 4)} loading={loading} />
        </Card>
      </div>

      {/* Transaksi Terkini — terakhir muncul */}
      <div className="animate-fade-up animate-delay-600">
        <Card padding="md" noLift>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface font-headline">Transaksi Terkini</h3>
            <a href={lihatSemuaHref} className="text-xs text-primary font-medium font-body hover:underline">
              {lihatSemuaLabel}
            </a>
          </div>
          <TransactionTable limit={5} filterType={txFilterType} filterUnitId={txFilterUnitId} />
        </Card>
      </div>
    </PageContainer>
  )
}
