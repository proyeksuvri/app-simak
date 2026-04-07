import { useMemo, useState } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKU } from '../../hooks/useBKU'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useWorkUnits } from '../../hooks/useWorkUnits'
import { useAppContext } from '../../context/AppContext'

export function BKUPembantuPage() {
  const { workUnits, loading: loadingUnits } = useWorkUnits()
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)

  const activeUnit = selectedUnit ?? workUnits[0]?.id ?? null

  const { entries, saldoAkhir, loading: loadingBKU } = useBKU('pembantu', activeUnit ?? undefined)
  const { printBKU, printing } = usePrintBKU()
  const { tahunAnggaran, currentUser } = useAppContext()

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loading = loadingUnits || loadingBKU

  // Reset halaman saat unit berubah
  const handleSelectUnit = (id: string) => {
    setSelectedUnit(id)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
  const safePage   = Math.min(page, totalPages)

  const pagedEntries = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return entries.slice(start, start + pageSize)
  }, [entries, safePage, pageSize])

  const activeUnitName = workUnits.find(u => u.id === activeUnit)?.name ?? 'UIN Palopo'

  const handleCetak = () => {
    printBKU({
      entries,
      saldoAkhir,
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
          disabled={loading || printing || entries.length === 0}
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
            entriesOverride={pagedEntries}
            saldoAkhirOverride={saldoAkhir}
            loadingOverride={loading}
          />
        ) : (
          <p className="px-4 py-8 text-sm text-on-surface-variant font-body text-center">
            Pilih unit kerja di atas.
          </p>
        )}
      </Card>

      {!loading && activeUnit && entries.length > 0 && (
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
