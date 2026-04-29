/**
 * useRekeningKoran
 *
 * Manages rekening koran (bank statement PDF) records per account + year.
 * Each row stores a Google Drive URL for a specific (account, bulan, tahun).
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DbRekeningKoran } from '../types/database'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

/**
 * Convert any Google Drive share / view URL to an embed (preview) URL.
 * Supported formats:
 *  - https://drive.google.com/file/d/FILE_ID/view?...
 *  - https://drive.google.com/open?id=FILE_ID
 *  - https://drive.google.com/uc?id=FILE_ID
 *  - Already an embed URL — returned as-is
 */
export function toDriveEmbedUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    // Already embed
    if (u.pathname.endsWith('/preview')) return url.trim()

    // /file/d/FILE_ID/...
    const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/)
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`

    // ?id=FILE_ID
    const id = u.searchParams.get('id')
    if (id) return `https://drive.google.com/file/d/${id}/preview`
  } catch {
    // fall-through — return original
  }
  return url.trim()
}

export function useRekeningKoran(accountId: string | null, tahun: number) {
  const [records,  setRecords]  = useState<DbRekeningKoran[]>([])
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!accountId) { setRecords([]); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('rekening_koran')
      .select('*')
      .eq('account_id', accountId)
      .eq('tahun', tahun)
      .order('bulan')
    if (err) { setError(err.message); setLoading(false); return }
    setRecords((data ?? []) as DbRekeningKoran[])
    setLoading(false)
  }, [accountId, tahun])

  useEffect(() => { load() }, [load])

  async function save(
    bulan:      number,
    driveUrl:   string,
    keterangan: string,
  ): Promise<string | null> {
    if (!accountId) return 'Pilih rekening terlebih dahulu'
    setSaving(true)
    setError(null)
    const embedUrl = toDriveEmbedUrl(driveUrl)
    const { error: err } = await supabase
      .from('rekening_koran')
      .upsert(
        {
          tenant_id:  TENANT_ID,
          account_id: accountId,
          bulan,
          tahun,
          drive_url:  embedUrl,
          keterangan: keterangan.trim() || null,
        },
        { onConflict: 'account_id,bulan,tahun' },
      )
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    await load()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('rekening_koran')
      .delete()
      .eq('id', id)
    setSaving(false)
    if (err) { setError(err.message); return err.message }
    setRecords(prev => prev.filter(r => r.id !== id))
    return null
  }

  return { records, loading, saving, error, save, remove, refetch: load }
}
