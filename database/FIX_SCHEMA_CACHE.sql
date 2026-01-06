-- =========================================================================
-- FIX_SCHEMA_CACHE.sql  
-- Memperbaiki error "Database error querying schema"
-- =========================================================================

-- 1. Reload PostgREST config (membersihkan cache)
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- 2. Pastikan semua function punya permission yang benar
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. Pastikan schema public accessible  
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 4. Re-grant table access
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 5. Done
SELECT 'Schema cache di-reload. Tunggu 5 detik lalu refresh browser.' as status;
