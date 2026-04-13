// Edge Function: keepalive
// Endpoint publik yang bisa dipanggil dari cron-job.org atau layanan eksternal
// sebagai backup agar Supabase tidak paused.
//
// URL: https://<project-ref>.supabase.co/functions/v1/keepalive
// Tidak memerlukan auth token (anon-safe, hanya melakukan SELECT sederhana)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Tulis log keepalive
    const { error } = await supabase
      .from('keepalive_log')
      .insert({ note: 'edge function keepalive' })

    if (error) throw error

    return new Response(
      JSON.stringify({ status: 'ok', pinged_at: new Date().toISOString() }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ status: 'error', message: String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
