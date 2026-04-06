import { useState } from 'react'
import { TransactionTable }     from '../../components/domain/TransactionTable'
import { TransactionFormModal } from '../../components/domain/TransactionFormModal'
import { BulkUploadModal }      from '../../components/domain/BulkUploadModal'
import { Card }                 from '../../components/ui/Card'
import { Button }               from '../../components/ui/Button'
import { PageContainer }        from '../../components/layout/PageContainer'
import { useTransactions }      from '../../hooks/useTransactions'

export function BPKPage() {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const { refetch } = useTransactions({ type: 'pengeluaran' })

  return (
    <PageContainer
      title="Bukti Pengeluaran (BPK)"
      actions={
        <div className="flex gap-2">
          <Button icon="upload_file" variant="secondary" size="sm" onClick={() => setUploadOpen(true)}>
            Upload Massal
          </Button>
          <Button icon="add" variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Input BPK Baru
          </Button>
        </div>
      }
    >
      <Card padding="sm">
        <TransactionTable filterType="pengeluaran" onMutated={refetch} />
      </Card>

      <TransactionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        txType="OUT"
        onSuccess={refetch}
      />

      <BulkUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        txType="OUT"
        onSuccess={refetch}
      />
    </PageContainer>
  )
}
