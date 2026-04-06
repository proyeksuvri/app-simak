import { useState } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useWorkUnits } from '../../hooks/useWorkUnits'

export function BKUPembantuPage() {
  const { workUnits, loading } = useWorkUnits()
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)

  // Auto-select unit pertama setelah data loaded
  const activeUnit = selectedUnit ?? workUnits[0]?.id ?? null

  return (
    <PageContainer
      title="BKU Pengeluaran Pembantu"
      actions={
        <Button icon="print" variant="secondary" size="sm">
          Cetak BKU
        </Button>
      }
    >
      {/* Unit Selector */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {loading ? (
          <span className="text-xs text-on-surface-variant font-body">Memuat unit...</span>
        ) : (
          workUnits.map(unit => (
            <button
              key={unit.id}
              onClick={() => setSelectedUnit(unit.id)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-medium font-body transition-colors',
                activeUnit === unit.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              ].join(' ')}
            >
              {unit.name}
            </button>
          ))
        )}
      </div>

      <Card padding="sm">
        {activeUnit
          ? <BKULedger type="pembantu" unitId={activeUnit} />
          : <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">Pilih unit kerja di atas.</p>
        }
      </Card>
    </PageContainer>
  )
}
