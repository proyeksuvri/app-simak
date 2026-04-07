import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { queryCache } from '../lib/queryCache'

interface ApprovalActions {
  submitting: boolean
  approving:  boolean
  rejecting:  boolean
  submit:       (txId: string) => Promise<string | null>
  submitBulk:   (txIds: string[]) => Promise<{ submitted: number; skipped: number; error: string | null }>
  approve:      (txId: string) => Promise<string | null>
  approveBulk:  (txIds: string[]) => Promise<{ approved: number; skipped: number; error: string | null }>
  reject:       (txId: string, note: string) => Promise<string | null>
  rejectBulk:   (txIds: string[], note: string) => Promise<{ rejected: number; skipped: number; error: string | null }>
}

export function useApproval(): ApprovalActions {
  const [submitting, setSubmitting] = useState(false)
  const [approving,  setApproving]  = useState(false)
  const [rejecting,  setRejecting]  = useState(false)

  const submit = async (txId: string): Promise<string | null> => {
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('submit_transaction', { tx_id: txId })
      if (!error) queryCache.invalidate('bku:')
      return error ? error.message : null
    } finally {
      setSubmitting(false)
    }
  }

  const submitBulk = async (txIds: string[]): Promise<{ submitted: number; skipped: number; error: string | null }> => {
    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('submit_transactions_bulk', { tx_ids: txIds })
      if (error) return { submitted: 0, skipped: txIds.length, error: error.message }
      queryCache.invalidate('bku:')
      return { submitted: data.submitted, skipped: data.skipped, error: null }
    } finally {
      setSubmitting(false)
    }
  }

  const approve = async (txId: string): Promise<string | null> => {
    setApproving(true)
    try {
      const { error } = await supabase.rpc('approve_transaction', { tx_id: txId })
      if (!error) queryCache.invalidate('bku:')
      return error ? error.message : null
    } finally {
      setApproving(false)
    }
  }

  const approveBulk = async (txIds: string[]): Promise<{ approved: number; skipped: number; error: string | null }> => {
    setApproving(true)
    try {
      const { data, error } = await supabase.rpc('approve_transactions_bulk', { tx_ids: txIds })
      if (error) return { approved: 0, skipped: txIds.length, error: error.message }
      queryCache.invalidate('bku:')
      return { approved: data.approved, skipped: data.skipped, error: null }
    } finally {
      setApproving(false)
    }
  }

  const reject = async (txId: string, note: string): Promise<string | null> => {
    setRejecting(true)
    try {
      const { error } = await supabase.rpc('reject_transaction', { tx_id: txId, note })
      if (!error) queryCache.invalidate('bku:')
      return error ? error.message : null
    } finally {
      setRejecting(false)
    }
  }

  const rejectBulk = async (txIds: string[], note: string): Promise<{ rejected: number; skipped: number; error: string | null }> => {
    setRejecting(true)
    try {
      const { data, error } = await supabase.rpc('reject_transactions_bulk', { tx_ids: txIds, note })
      if (error) return { rejected: 0, skipped: txIds.length, error: error.message }
      queryCache.invalidate('bku:')
      return { rejected: data.rejected, skipped: data.skipped, error: null }
    } finally {
      setRejecting(false)
    }
  }

  return { submitting, approving, rejecting, submit, submitBulk, approve, approveBulk, reject, rejectBulk }
}
