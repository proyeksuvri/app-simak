import { useState } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKUPage, fetchAllBKUEntries } from '../../hooks/useBKUPage'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useWorkUnits } from '../../hooks/useWorkUnits'
import { useAppContext } from '../../context/AppContext'

export function BKUPembantuPage() {
  const { tahunAnggaran, currentUser } = useAppContext()
  const { workUnits, loading: loadingUnits } = useWorkUnits()
  const { printBKU, printing } = usePrintBKU()

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  const activeUnit = selectedUnit ?? workUnits[0]?.id ?? null

  const { entries, saldoAkhir, total, totalPages, loading: loadingBKU } =
    useBKUPage('pembantu', page, pageSize, { unitId: activeUnit })

  const loading = loadingUnits || loadingBKU

  const handleSelectUnit = (id: string) => {
    setSelectedUnit(id)
    setPage(1)
  }

  const activeUnitName = workUnits.find(u => u.id === activeUnit)?.name ?? 'UIN Palopo'

  const handleCetak = async () => {
    const { entries: all, saldoAkhir: sa } = await fetchAllBKUEntries(
      'pembantu', tahunAnggaran, { unitId: activeUnit }
    )
    printBKU({
      entries:       all,
      saldoAkhir:    sa,
      tahunAnggaran,
      namaUnit:      activeUnitName,
      namaBendahara: currentUser.nama,
      nip:           currentUser.nip,
      tipeBKU:       'pembantu',
    })
  }

  return (
    <PageContainer
      title="BKU Pengeluaran Pembantu"
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
      {/* Unit Selector */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {loadingUnits ? (
          <span className="text-xs text-on-surface-variant font-body">Memuat unit...</span>
        ) : (
          workUnits.map(unit => (
            <button
              key={unit.id}
              onClick={() => handleSelectUnit(unit.id)}
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

      <BKUSummaryCards entries={entries} saldoAkhir={saldoAkhir} loading={loading} />

      <Card padding="sm">
        {activeUnit ? (
          <BKULedger
            type="pembantu"
            entriesOverride={entries}
            saldoAkhirOverride={saldoAkhir}
            loadingOverride={loading}
          />
        ) : (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Pilih unit kerja di atas.
          </p>
        )}
      </Card>

      {!loading && activeUnit && total > 0 && (
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
