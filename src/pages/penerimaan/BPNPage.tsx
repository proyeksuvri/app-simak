import { useState } from 'react'
import { TransactionTable }     from '../../components/domain/TransactionTable'
import { TransactionFormModal } from '../../components/domain/TransactionFormModal'
import { BulkUploadModal }      from '../../components/domain/BulkUploadModal'
import { Card }                 from '../../components/ui/Card'
import { Button }               from '../../components/ui/Button'
import { PageContainer }        from '../../components/layout/PageContainer'
import { useTransactions }      from '../../hooks/useTransactions'

export function BPNPage() {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const { refetch } = useTransactions({ type: 'penerimaan' })

  return (
    <PageContainer
      title="Bukti Penerimaan (BPN)"
      actions={
        <div className="flex gap-2">
          <Button icon="upload_file" variant="secondary" size="sm" onClick={() => setUploadOpen(true)}>
            Upload Massal
          </Button>
          <Button icon="add" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Input BPN Baru
          </Button>
        </div>
      }
    >

      <Card padding="sm" className="-mx-4">
        <TransactionTable
          filterType="penerimaan"
          onMutated={refetch}
        />
      </Card>

      <TransactionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        txType="IN"
        onSuccess={refetch}
      />

      <BulkUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        txType="IN"
        onSuccess={refetch}
      />
    </PageContainer>
  )
}
