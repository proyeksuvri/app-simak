import { useState } from 'react'
import { TransactionTable }    from '../../components/domain/TransactionTable'
import { BPNKeluarFormModal }  from '../../components/domain/BPNKeluarFormModal'
import { Card }                from '../../components/ui/Card'
import { Button }              from '../../components/ui/Button'
import { PageContainer }       from '../../components/layout/PageContainer'
import { useTransactions }     from '../../hooks/useTransactions'
import { KATEGORI_PENGELUARAN_BPN } from '../../types/transaction'

export function BPNKeluarPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { refetch } = useTransactions({ type: 'pengeluaran' })

  return (
    <PageContainer
      title="Pengeluaran BPN"
      actions={
        <Button icon="add" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          Catat Pengeluaran
        </Button>
      }
    >

      <Card padding="sm" className="-mx-4">
        <TransactionTable
          filterType="pengeluaran"
          filterKategoriList={KATEGORI_PENGELUARAN_BPN}
          onMutated={refetch}
        />
      </Card>

      <BPNKeluarFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refetch}
      />
    </PageContainer>
  )
}
