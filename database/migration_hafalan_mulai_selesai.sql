-- Migrasi untuk menambahkan kolom baru ke tabel hafalan
-- Struktur baru: input Mulai (juz_mulai, surah_mulai, ayat_mulai) dan Selesai (juz_selesai, surah_selesai, ayat_selesai)

-- Tambah kolom baru (jika belum ada)
ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS juz_mulai INTEGER DEFAULT 30;
ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS surah_mulai TEXT;
ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS juz_selesai INTEGER DEFAULT 30;
ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS surah_selesai TEXT;

-- Migrasi data dari kolom lama ke kolom baru (jika ada data lama)
UPDATE hafalan 
SET juz_mulai = juz, surah_mulai = surah, juz_selesai = juz, surah_selesai = surah
WHERE juz_mulai IS NULL AND juz IS NOT NULL;

-- Catatan: Kolom lama (juz, surah) bisa dihapus nanti setelah migrasi selesai
-- DROP COLUMN bisa dilakukan manual jika diperlukan:
-- ALTER TABLE hafalan DROP COLUMN juz;
-- ALTER TABLE hafalan DROP COLUMN surah;
