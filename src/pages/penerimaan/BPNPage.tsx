import { useState } from 'react'
import { TransactionTable }     from '../../components/domain/TransactionTable'
import { TransactionFormModal } from '../../components/domain/TransactionFormModal'
import { Card }                 from '../../components/ui/Card'
import { Button }               from '../../components/ui/Button'
import { PageContainer }        from '../../components/layout/PageContainer'
import { useTransactions }      from '../../hooks/useTransactions'

export function BPNPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { refetch } = useTransactions({ type: 'penerimaan' })

  return (
    <PageContainer
      title="Bukti Penerimaan (BPN)"
      actions={
        <Button icon="add" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          Input BPN Baru
        </Button>
      }
    >
      <Card padding="sm">
        <TransactionTable filterType="penerimaan" />
      </Card>

      <TransactionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        txType="IN"
        onSuccess={refetch}
      />
    </PageContainer>
  )
}
