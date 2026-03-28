import { useState } from 'react'
import { TransactionTable }     from '../../components/domain/TransactionTable'
import { TransactionFormModal } from '../../components/domain/TransactionFormModal'
import { Card }                 from '../../components/ui/Card'
import { Button }               from '../../components/ui/Button'
import { PageContainer }        from '../../components/layout/PageContainer'
import { useTransactions }      from '../../hooks/useTransactions'

export function BPKPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { refetch } = useTransactions({ type: 'pengeluaran' })

  return (
    <PageContainer
      title="Bukti Pengeluaran (BPK)"
      actions={
        <Button icon="add" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          Input BPK Baru
        </Button>
      }
    >
      <Card padding="sm">
        <TransactionTable filterType="pengeluaran" />
      </Card>

      <TransactionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        txType="OUT"
        onSuccess={refetch}
      />
    </PageContainer>
  )
}
