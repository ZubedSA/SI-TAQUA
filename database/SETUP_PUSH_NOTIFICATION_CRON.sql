-- =====================================================
-- SETUP CRON JOB: Cek Guru yang Belum Absensi
-- Otomatis setiap 30 menit pada jam sekolah (07:30 - 15:00 WIB)
-- Hari Senin-Sabtu
-- =====================================================

-- Pastikan extension pg_cron dan pg_net aktif
-- (biasanya sudah aktif di Supabase, jika belum aktifkan di Dashboard > Database > Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hapus cron job lama jika ada
SELECT cron.unschedule('check-guru-absensi');

-- Buat cron job baru
-- Schedule: setiap 30 menit, jam 00:30-08:00 UTC (= 07:30-15:00 WIB), Senin-Sabtu
-- Catatan: Supabase Cron menggunakan UTC, WIB = UTC+7
SELECT cron.schedule(
    'check-guru-absensi',
    '*/30 0-8 * * 1-6',  -- Setiap 30 menit, jam 00:00-08:59 UTC (07:00-15:59 WIB), Sen-Sab
    $$
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/check-guru-absensi',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Verifikasi cron job terdaftar
SELECT * FROM cron.job WHERE jobname = 'check-guru-absensi';

-- =====================================================
-- CATATAN: 
-- Jika vault.decrypted_secrets tidak tersedia, gunakan URL langsung:
-- 
-- SELECT cron.schedule(
--     'check-guru-absensi',
--     '*/30 0-8 * * 1-6',
--     $$
--     SELECT net.http_post(
--         url := 'https://lzxxtdmkuziawsmzwgim.supabase.co/functions/v1/check-guru-absensi',
--         headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--         body := '{}'::jsonb
--     );
--     $$
-- );
-- =====================================================
