-- Tambahkan kolom password ke user_profiles untuk menyimpan referensi password
-- CATATAN: Ini bukan praktik keamanan terbaik, tapi memudahkan pengelolaan

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_ref VARCHAR(255);

-- Update password_ref untuk user yang ada (set default)
UPDATE user_profiles SET password_ref = 'default123' WHERE password_ref IS NULL;
