import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface ApprovalActions {
  submitting: boolean
  approving:  boolean
  rejecting:  boolean
  submit:  (txId: string) => Promise<string | null>
  approve: (txId: string) => Promise<string | null>
  reject:  (txId: string, note: string) => Promise<string | null>
}

export function useApproval(): ApprovalActions {
  const [submitting, setSubmitting] = useState(false)
  const [approving,  setApproving]  = useState(false)
  const [rejecting,  setRejecting]  = useState(false)

  const submit = async (txId: string): Promise<string | null> => {
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('submit_transaction', { tx_id: txId })
      return error ? error.message : null
    } finally {
      setSubmitting(false)
    }
  }

  const approve = async (txId: string): Promise<string | null> => {
    setApproving(true)
    try {
      const { error } = await supabase.rpc('approve_transaction', { tx_id: txId })
      return error ? error.message : null
    } finally {
      setApproving(false)
    }
  }

  const reject = async (txId: string, note: string): Promise<string | null> => {
    setRejecting(true)
    try {
      const { error } = await supabase.rpc('reject_transaction', { tx_id: txId, note })
      return error ? error.message : null
    } finally {
      setRejecting(false)
    }
  }

  return { submitting, approving, rejecting, submit, approve, reject }
}
