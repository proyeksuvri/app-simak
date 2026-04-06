import { useMemo, useState, useCallback } from 'react'
import { BKULedger } from '../../components/domain/BKULedger'
import { BKUSummaryCards } from '../../components/domain/BKUSummaryCards'
import { BKUFilterBar, FILTER_DEFAULT } from '../../components/domain/BKUFilterBar'
import { BKUPagination } from '../../components/domain/BKUPagination'
import type { BKUFilter } from '../../components/domain/BKUFilterBar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { useBKU } from '../../hooks/useBKU'
import { usePrintBKU } from '../../hooks/usePrintBKU'
import { useAppContext } from '../../context/AppContext'

export function BKUPenerimaanPage() {
  const { entries, saldoAkhir, loading } = useBKU('penerimaan')
  const { printBKU, printing } = usePrintBKU()
  const { tahunAnggaran, currentUser } = useAppContext()

  const [filter,   setFilter]   = useState<BKUFilter>(FILTER_DEFAULT)
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [printCategory, setPrintCategory] = useState<string>('')

  const categories = useMemo(() => {
    const cats = entries.map(e => e.kategori).filter(Boolean) as string[]
    return [...new Set(cats)].sort()
  }, [entries])

  // Reset ke halaman 1 saat filter berubah
  const handleFilterChange = useCallback((f: React.SetStateAction<BKUFilter>) => {
    setFilter(f)
    setPage(1)
  }, [])

  // ── Filter entries client-side ──────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (filter.bulan !== null) {
        const bulanEntri = Number(e.tanggal.slice(5, 7))
        if (bulanEntri !== filter.bulan) return false
      }
      if (filter.tanggalDari   && e.tanggal < filter.tanggalDari)   return false
      if (filter.tanggalSampai && e.tanggal > filter.tanggalSampai) return false
      return true
    })
  }, [entries, filter])

  // Recalculate saldo berjalan untuk entri yang terfilter
  const filteredWithSaldo = useMemo(() => {
    let saldo = 0
    return filteredEntries.map(e => {
      saldo = saldo + e.debit - e.kredit
      return { ...e, saldo }
    })
  }, [filteredEntries])

  const filteredSaldoAkhir = filteredWithSaldo.length > 0
    ? filteredWithSaldo[filteredWithSaldo.length - 1].saldo
    : 0

  // ── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredWithSaldo.length / pageSize))
  const safePage   = Math.min(page, totalPages)

  const pagedEntries = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredWithSaldo.slice(start, start + pageSize)
  }, [filteredWithSaldo, safePage, pageSize])

  const isFiltered = filter.bulan !== null || filter.tanggalDari !== '' || filter.tanggalSampai !== ''

  const handleCetak = () => {
    if (printCategory) {
      const pembantuEntries = entries.filter(e => e.kategori === printCategory)
      let saldoPembantu = 0
      const pembantuWithSaldo = pembantuEntries.map(e => {
        saldoPembantu = saldoPembantu + e.debit - e.kredit
        return { ...e, saldo: saldoPembantu }
      })
      const pembantuSaldoAkhir = pembantuWithSaldo.length > 0 
        ? pembantuWithSaldo[pembantuWithSaldo.length - 1].saldo 
        : 0

      printBKU({
        entries:       pembantuWithSaldo,
        saldoAkhir:    pembantuSaldoAkhir,
        tahunAnggaran,
        namaUnit:      'UIN Palopo',
        namaBendahara: currentUser.nama,
        nip:           currentUser.nip,
        kategoriPembantu: printCategory,
      })
      return
    }

    // Cetak sesuai data yang sedang ditampilkan (terfilter jika aktif)
    printBKU({
      entries:       isFiltered ? filteredWithSaldo : entries,
      saldoAkhir:    isFiltered ? filteredSaldoAkhir : saldoAkhir,
      tahunAnggaran,
      namaUnit:      'UIN Palopo',
      namaBendahara: currentUser.nama,
      nip:           currentUser.nip,
    })
  }

  return (
    <PageContainer
      title="BKU Penerimaan"
      actions={
        <div className="flex items-center gap-3">
          {categories.length > 0 && (
            <select
              value={printCategory}
              onChange={e => setPrintCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-colors hover:bg-white/5 cursor-pointer outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8eaf0' }}
            >
              <option value="" style={{ background: '#1e2430' }}>Semua (BKU Umum)</option>
              {categories.map(c => (
                <option key={c} value={c} style={{ background: '#1e2430' }}>BKP: {c}</option>
              ))}
            </select>
          )}
          <Button
            icon={printing ? 'hourglass_empty' : 'print'}
            variant="secondary"
            size="sm"
            onClick={handleCetak}
            disabled={loading || printing || entries.length === 0}
          >
            {printing ? 'Menyiapkan PDF...' : (printCategory ? 'Cetak Pembantu' : 'Cetak BKU')}
          </Button>
        </div>
      }
    >
      {/* Summary Cards — ikut filter jika aktif */}
      <BKUSummaryCards
        entries={isFiltered ? filteredWithSaldo : entries}
        saldoAkhir={isFiltered ? filteredSaldoAkhir : saldoAkhir}
        loading={loading}
      />

      {/* Filter Bar */}
      {!loading && entries.length > 0 && (
        <BKUFilterBar
          filter={filter}
          onChange={handleFilterChange}
          totalSemua={entries.length}
          totalFilter={filteredWithSaldo.length}
        />
      )}

      {/* Tabel BKU — hanya entri halaman aktif */}
      <Card padding="sm">
        <BKULedger
          type="penerimaan"
          entriesOverride={pagedEntries}
          saldoAkhirOverride={filteredSaldoAkhir}
          loadingOverride={loading}
        />
      </Card>

      {/* Pagination */}
      {!loading && filteredWithSaldo.length > 0 && (
        <BKUPagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredWithSaldo.length}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}
    </PageContainer>
  )
}
