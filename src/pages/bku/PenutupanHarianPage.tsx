import { useEffect, useState } from 'react'
import { Card }          from '../../components/ui/Card'
import { Button }        from '../../components/ui/Button'
import { PageContainer } from '../../components/layout/PageContainer'
import { usePenutupanHarian } from '../../hooks/usePenutupanHarian'
import { formatRupiah, formatTanggal, formatTanggalPanjang } from '../../lib/formatters'

export function PenutupanHarianPage() {
  const { ringkasan, riwayat, loading, load, tutupBuku } = usePenutupanHarian()
  const [closing, setClosing] = useState(false)
  const [msg,     setMsg]     = useState<{ text: string; isErr: boolean } | null>(null)

  const today = new Date().toISOString().split('T')[0]!

  useEffect(() => { load() }, [load])

  const handleTutup = async () => {
    setMsg(null)
    setClosing(true)
    const err = await tutupBuku()
    setClosing(false)
    if (err) setMsg({ text: err, isErr: true })
    else     setMsg({ text: 'BKU berhasil ditutup untuk hari ini.', isErr: false })
  }

  const sudahTutup = riwayat.some(r => r.closingDate === today)

  return (
    <PageContainer title="Penutupan Harian BKU">
      {loading && (
        <p className="text-sm text-on-surface-variant font-body mb-4">Memuat data...</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Ringkasan hari ini */}
        <Card accent padding="md">
          <h3 className="text-sm font-semibold text-on-surface font-headline mb-1">
            Ringkasan Hari Ini
          </h3>
          <p className="text-xs text-on-surface-variant font-body mb-4">
            {formatTanggalPanjang(today)}
          </p>

          {ringkasan ? (
            <div className="space-y-3">
              {[
                { label: 'Saldo Awal',       value: ringkasan.saldoAwal,   color: 'text-on-surface' },
                { label: 'Total Penerimaan', value: ringkasan.totalMasuk,  color: 'text-primary' },
                { label: 'Total Pengeluaran',value: ringkasan.totalKeluar, color: 'text-on-surface' },
                { label: 'Saldo Akhir',      value: ringkasan.saldoAkhir,  color: 'text-primary font-bold' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
                  <span className="text-sm text-on-surface-variant font-body">{item.label}</span>
                  <span className={['font-data tabular-nums tracking-financial text-sm', item.color].join(' ')}>
                    {formatRupiah(item.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {['Saldo Awal','Total Penerimaan','Total Pengeluaran','Saldo Akhir'].map(l => (
                <div key={l} className="flex justify-between py-2 border-b border-outline-variant last:border-0">
                  <span className="text-sm text-on-surface-variant font-body">{l}</span>
                  <span className="w-24 h-4 rounded bg-surface-container-high" />
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-2">
            {msg && (
              <p className={['text-sm font-body', msg.isErr ? 'text-error' : 'text-primary'].join(' ')}>
                {msg.text}
              </p>
            )}
            <Button
              variant="primary"
              className="w-full"
              icon={sudahTutup ? 'check_circle' : 'lock'}
              disabled={closing || sudahTutup || loading}
              onClick={handleTutup}
            >
              {sudahTutup ? 'Sudah Ditutup Hari Ini' : closing ? 'Memproses...' : 'Tutup Buku Hari Ini'}
            </Button>
          </div>
        </Card>

        {/* Riwayat penutupan */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-on-surface font-headline mb-4">
            Riwayat Penutupan
          </h3>
          {riwayat.length === 0 ? (
            <p className="text-sm text-on-surface-variant font-body text-center py-4">
              Belum ada riwayat penutupan.
            </p>
          ) : (
            <div className="space-y-2">
              {riwayat.map((log, idx) => (
                <div
                  key={log.id}
                  className={[
                    'px-3 py-3 rounded-xl',
                    idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-on-surface font-body">
                      {log.closingDate ? formatTanggal(log.closingDate) : '—'}
                    </p>
                    <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-body">
                      Selesai
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[0.65rem] text-on-surface-variant font-body">
                    <span>Masuk: <strong className="text-primary">{formatRupiah(log.totalMasuk)}</strong></span>
                    <span>Keluar: <strong>{formatRupiah(log.totalKeluar)}</strong></span>
                    <span>Saldo: <strong>{formatRupiah(log.saldoAkhir)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
