-- =====================================================
-- FIX PHONE LOOKUP LOGIC
-- =====================================================
-- Masalah: Normalisasi nomor HP di database vs Input tidak cocok.
-- Solusi: Bandingkan digit terakhir (Suffix Matching) yang lebih robust.
-- =====================================================

CREATE OR REPLACE FUNCTION get_email_by_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
    found_email TEXT;
    clean_input TEXT;
BEGIN
    -- 1. Bersihkan input (hanya angka)
    clean_input := regexp_replace(p_phone, '[^0-9]', '', 'g');
    
    -- 2. Ambil 10 digit terakhir dari input (mengabaikan prefix 08, 62, +62)
    -- Contoh: 08123456789 -> 123456789 (9 digit) -> ambil secukupnya
    -- Kita ambil minimal 8 digit dari kanan untuk aman
    IF LENGTH(clean_input) > 8 THEN
        clean_input := RIGHT(clean_input, 9); -- Ambil 9 digit terakhir
    END IF;

    -- 3. Cari di database dengan logika yang sama
    SELECT email INTO found_email
    FROM user_profiles
    WHERE 
        -- Bersihkan no_telp di DB, ambil 9 digit terakhir, bandingkan
        RIGHT(regexp_replace(no_telp, '[^0-9]', '', 'g'), 9) = clean_input
    LIMIT 1;
    
    RETURN found_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_email_by_phone(TEXT) TO anon, authenticated;
