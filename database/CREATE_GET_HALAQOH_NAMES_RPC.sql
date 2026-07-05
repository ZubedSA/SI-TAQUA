-- ============================================
-- UPDATE RPC: GET HALAQOH WITH MUSYRIF
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Drop function lama
DROP FUNCTION IF EXISTS get_halaqoh_names(UUID[]);
DROP FUNCTION IF EXISTS get_halaqoh_with_musyrif(UUID[]);

-- 2. Buat function BARU yang include musyrif
CREATE OR REPLACE FUNCTION get_halaqoh_names(halaqoh_ids UUID[])
RETURNS TABLE (
    id UUID,
    nama TEXT,
    musyrif_id UUID,
    musyrif_nama TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id, 
        h.nama::TEXT,
        g.id as musyrif_id,
        g.nama::TEXT as musyrif_nama
    FROM halaqoh h
    LEFT JOIN guru g ON h.musyrif_id = g.id
    WHERE h.id = ANY(halaqoh_ids);
END;
$$;

-- 3. Grant execute
GRANT EXECUTE ON FUNCTION get_halaqoh_names(UUID[]) TO authenticated;

SELECT '✅ RPC Function get_halaqoh_names (with musyrif) sudah dibuat!' as status;

-- 4. Test
SELECT * FROM get_halaqoh_names(
    ARRAY['6021024f-b032-4792-bc92-9a8d3488315f']::UUID[]
);
