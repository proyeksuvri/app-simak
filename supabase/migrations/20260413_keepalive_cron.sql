-- =============================================================
-- Keepalive Cron Job
-- Mencegah Supabase free tier paused karena inaktif 7 hari
-- =============================================================

-- 1. Aktifkan ekstensi pg_cron (harus dijalankan sebagai superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Buat tabel log keepalive (opsional, untuk monitoring)
CREATE TABLE IF NOT EXISTS public.keepalive_log (
    id          BIGSERIAL PRIMARY KEY,
    pinged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note        TEXT DEFAULT 'auto keepalive'
);

-- Aktifkan RLS tapi izinkan service_role saja yang akses
ALTER TABLE public.keepalive_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role only" ON public.keepalive_log
    USING (auth.role() = 'service_role');

-- 3. Buat fungsi keepalive
CREATE OR REPLACE FUNCTION public.fn_keepalive()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.keepalive_log (note) VALUES ('pg_cron keepalive');
    -- Hapus log lama (simpan 30 hari terakhir saja)
    DELETE FROM public.keepalive_log
    WHERE pinged_at < NOW() - INTERVAL '30 days';
END;
$$;

-- 4. Jadwalkan cron job setiap hari pukul 07:00 UTC (14:00 WIB)
--    Cron syntax: menit jam hari bulan hari_minggu
SELECT cron.schedule(
    'simak-keepalive-daily',   -- nama job (unik)
    '0 7 * * *',               -- setiap hari jam 07:00 UTC
    'SELECT public.fn_keepalive()'
);
