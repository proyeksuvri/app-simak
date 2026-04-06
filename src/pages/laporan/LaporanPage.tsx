import { useState, useEffect } from 'react'
import { Card }           from '../../components/ui/Card'
import { Button }         from '../../components/ui/Button'
import { PageContainer }  from '../../components/layout/PageContainer'
import { useLaporan, type LaporanType } from '../../hooks/useLaporan'
import { useWorkUnits }   from '../../hooks/useWorkUnits'
import { useAppContext }  from '../../context/AppContext'
import { exportTransaksiPdf }   from '../../lib/exportPdf'
import { exportTransaksiExcel } from '../../lib/exportExcel'
import { formatTanggal } from '../../lib/formatters'

const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

const LAPORAN_TYPES: { id: LaporanType; icon: string; label: string; desc: string }[] = [
  { id: 'bku-harian',  icon: 'today',         label: 'BKU Harian',          desc: 'Buku kas umum (seluruh transaksi tahun ini)' },
  { id: 'penerimaan',  icon: 'trending_up',    label: 'Laporan Penerimaan',  desc: 'Rincian seluruh penerimaan BLU' },
  { id: 'bku-bulanan', icon: 'calendar_month', label: 'BKU Bulanan',         desc: 'Rekapitulasi BKU bulan yang dipilih' },
  { id: 'konsolidasi', icon: 'account_tree',   label: 'Laporan Konsolidasi', desc: 'Gabungan seluruh unit BPP' },
  { id: 'per-unit',    icon: 'corporate_fare', label: 'Laporan Per Unit',    desc: 'BKU pembantu tiap unit kerja' },
]

export function LaporanPage() {
  const { tahunAnggaran } = useAppContext()
  const { rows, loading, fetch } = useLaporan()
  const { workUnits } = useWorkUnits()

  const [selectedType, setSelectedType] = useState<LaporanType | null>(null)
  const [bulan,  setBulan]  = useState<number>(new Date().getMonth() + 1)
  const [unitId, setUnitId] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!selectedType) return
    fetch({
      tahun:  tahunAnggaran,
      bulan:  selectedType === 'bku-harian' || selectedType === 'penerimaan' || selectedType === 'konsolidasi' ? undefined : bulan,
      unitId: selectedType === 'per-unit' && unitId ? unitId : undefined,
      type:   selectedType === 'penerimaan' ? 'IN' : undefined,
    })
  }, [selectedType, bulan, unitId, tahunAnggaran, fetch])

  const periodLabel = selectedType === 'bku-harian' || selectedType === 'penerimaan' || selectedType === 'konsolidasi'
    ? String(tahunAnggaran)
    : `${BULAN[bulan - 1]} ${tahunAnggaran}`

  const meta = (label: string) => ({
    judul:     label,
    institusi: 'UIN Palopo',
    periode:   periodLabel,
    dicetak:   new Date().toLocaleString('id-ID'),
  })

  const doSelect = (type: LaporanType) => setSelectedType(type)

  const doPdf = async (e: React.MouseEvent, type: LaporanType, label: string) => {
    e.stopPropagation()
    setExporting(true)
    setSelectedType(type)
    // Beri waktu fetch selesai
    await new Promise(r => setTimeout(r, 800))
    exportTransaksiPdf(rows, meta(label), `${type}-${tahunAnggaran}`)
    setExporting(false)
  }

  const doExcel = async (e: React.MouseEvent, type: LaporanType, label: string) => {
    e.stopPropagation()
    setExporting(true)
    setSelectedType(type)
    await new Promise(r => setTimeout(r, 800))
    exportTransaksiExcel(rows, label, periodLabel, `${type}-${tahunAnggaran}`)
    setExporting(false)
  }

  return (
    <PageContainer title="Laporan">
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2">
          <span className="text-xs text-on-surface-variant font-body">Bulan:</span>
          <select
            className="text-sm font-medium text-on-surface bg-transparent outline-none font-body cursor-pointer"
            value={bulan}
            onChange={e => setBulan(Number(e.target.value))}
          >
            {BULAN.map((b, i) => (
              <option key={b} value={i + 1}>{b} {tahunAnggaran}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-2">
          <span className="text-xs text-on-surface-variant font-body">Unit:</span>
          <select
            className="text-sm font-medium text-on-surface bg-transparent outline-none font-body cursor-pointer"
            value={unitId}
            onChange={e => setUnitId(e.target.value)}
          >
            <option value="">Semua Unit</option>
            {workUnits.map(u => (
              <option key={u.id} value={u.id}>{u.nama}</option>
            ))}
          </select>
        </div>
        {(loading || exporting) && (
          <span className="text-xs text-on-surface-variant font-body">
            {exporting ? 'Menyiapkan ekspor...' : 'Memuat data...'}
          </span>
        )}
      </div>

      {/* Preview data */}
      {selectedType && rows.length > 0 && (
        <Card padding="sm" className="mb-6">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-on-surface font-headline">
              {LAPORAN_TYPES.find(l => l.id === selectedType)?.label}
              <span className="text-on-surface-variant font-normal ml-2 text-xs">
                — {rows.length} transaksi · {periodLabel}
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-body">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Tanggal','No. Bukti','Uraian','Kategori','Penerimaan','Pengeluaran','Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-on-surface-variant uppercase tracking-wide font-medium text-[0.65rem]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low'}>
                    <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{formatTanggal(t.tanggal)}</td>
                    <td className="px-3 py-2 text-primary font-medium">{t.nomorBukti}</td>
                    <td className="px-3 py-2 text-on-surface max-w-[180px] truncate">{t.deskripsi}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{t.kategori}</td>
                    <td className="px-3 py-2 text-right text-primary font-data tabular-nums">
                      {t.type === 'penerimaan' ? t.nominal.toLocaleString('id-ID') : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface font-data tabular-nums">
                      {t.type === 'pengeluaran' ? t.nominal.toLocaleString('id-ID') : '—'}
                    </td>
                    <td className="px-3 py-2 text-on-surface-variant capitalize">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 8 && (
              <p className="text-xs text-on-surface-variant font-body px-4 py-2 text-center italic">
                +{rows.length - 8} transaksi lainnya — tampil lengkap di PDF/Excel
              </p>
            )}
          </div>
        </Card>
      )}

      {selectedType && rows.length === 0 && !loading && (
        <div className="mb-6 px-4 py-3 bg-surface-container rounded-xl text-sm text-on-surface-variant font-body">
          Tidak ada data transaksi untuk filter yang dipilih.
        </div>
      )}

      {/* Kartu jenis laporan */}
      <div className="grid grid-cols-3 gap-4">
        {LAPORAN_TYPES.map(laporan => (
          <Card
            key={laporan.id}
            padding="md"
            className={[
              'flex flex-col gap-4 cursor-pointer transition-all',
              selectedType === laporan.id ? 'ring-2 ring-primary' : 'hover:shadow-md',
            ].join(' ')}
            onClick={() => doSelect(laporan.id)}
          >
            <div className="flex items-start gap-3">
              <div className={[
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                selectedType === laporan.id ? 'bg-emerald-gradient' : 'bg-surface-container-high',
              ].join(' ')}>
                <span
                  className={['material-symbols-outlined text-[1.1rem]', selectedType === laporan.id ? 'text-on-primary' : 'text-primary'].join(' ')}
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                >
                  {laporan.icon}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface font-headline">{laporan.label}</p>
                <p className="text-xs text-on-surface-variant font-body mt-0.5">{laporan.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-auto">
              <Button
                variant="ghost"
                size="sm"
                icon="visibility"
                className="flex-1"
                onClick={e => { e.stopPropagation(); doSelect(laporan.id) }}
              >
                Lihat
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon="picture_as_pdf"
                disabled={exporting}
                onClick={e => doPdf(e, laporan.id, laporan.label)}
              >
                PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon="table_view"
                disabled={exporting}
                onClick={e => doExcel(e, laporan.id, laporan.label)}
              >
                Excel
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  )
}
