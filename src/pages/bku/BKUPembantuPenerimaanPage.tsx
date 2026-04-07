import { useMemo, useState, useEffect } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUPagination } from '../../components/domain/BKUPagination'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKU } from '../../hooks/useBKU'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useAppContext } from '../../context/AppContext'

export function BKUPembantuPenerimaanPage() {
  const { entries, loading } = useBKU('penerimaan')
  const { printBKU, printing } = usePrintBKU()
  const { tahunAnggaran, currentUser } = useAppContext()

  const [activeKategori, setActiveKategori] = useState<string | null>(null)
  const [page,           setPage]           = useState(1)
  const [pageSize,       setPageSize]       = useState(10)

  const categories = useMemo(() => {
    const cats = entries
      .map(e => e.kategori?.trim())
      .filter(Boolean) as string[]
    return [...new Set(cats)].sort()
  }, [entries])

  useEffect(() => {
    if (!activeKategori && categories.length > 0) {
      setActiveKategori(categories[0])
    }
  }, [categories, activeKategori])

  const filteredEntries = useMemo(() => {
    if (!activeKategori) return []
    let saldo = 0
    return entries
      .filter(e => e.kategori?.trim() === activeKategori)
      .map(e => {
        saldo = saldo + e.debit - e.kredit
        return { ...e, saldo }
      })
  }, [entries, activeKategori])

  const saldoAkhir = filteredEntries.length > 0
    ? filteredEntries[filteredEntries.length - 1].saldo
    : 0

  // Reset ke halaman 1 saat kategori berubah
  const handleKategoriChange = (kat: string) => {
    setActiveKategori(kat)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize))
  const safePage   = Math.min(page, totalPages)

  const pagedEntries = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredEntries.slice(start, start + pageSize)
  }, [filteredEntries, safePage, pageSize])

  const handleCetak = () => {
    printBKU({
      entries:          filteredEntries,
      saldoAkhir,
      tahunAnggaran,
      namaUnit:         'UIN Palopo',
      namaBendahara:    currentUser.nama,
      nip:              currentUser.nip,
      kategoriPembantu: activeKategori ?? undefined,
      tipeBKU:          'pembantu',
    })
  }

  return (
    <PageContainer
      title={activeKategori ? `BKU Pembantu: ${activeKategori}` : 'BKU Pembantu Penerimaan'}
      actions={
        <Button
          icon={printing ? 'hourglass_empty' : 'print'}
          variant="secondary"
          size="sm"
          onClick={handleCetak}
          disabled={loading || printing || filteredEntries.length === 0}
        >
          {printing ? 'Menyiapkan PDF...' : 'Cetak Pembantu'}
        </Button>
      }
    >
      {/* Kategori Selector */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {loading ? (
          <span className="text-xs text-on-surface-variant font-body">Memuat data...</span>
        ) : categories.length === 0 ? (
          <span className="text-xs text-on-surface-variant font-body">Belum ada data penerimaan.</span>
        ) : (
          categories.map(kat => (
            <button
              key={kat}
              onClick={() => handleKategoriChange(kat)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-medium font-body transition-colors',
                activeKategori === kat
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              ].join(' ')}
            >
              {kat}
            </button>
          ))
        )}
      </div>

      <BKUSummaryCards
        entries={filteredEntries}
        saldoAkhir={saldoAkhir}
        loading={loading}
      />

      <Card padding="sm">
        <BKULedger
          type="penerimaan"
          entriesOverride={pagedEntries}
          saldoAkhirOverride={saldoAkhir}
          loadingOverride={loading}
        />
      </Card>

      {!loading && filteredEntries.length > 0 && (
        <BKUPagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredEntries.length}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}
    </PageContainer>
  )
}
