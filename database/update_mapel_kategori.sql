-- Tambahkan kolom kategori ke tabel mapel
ALTER TABLE mapel ADD COLUMN IF NOT EXISTS kategori VARCHAR(20) DEFAULT 'Madrosiyah';

-- Update sample data dengan kategori
UPDATE mapel SET kategori = 'Tahfizhiyah' WHERE nama ILIKE '%hafalan%' OR nama ILIKE '%tahfizh%' OR nama ILIKE '%tajwid%' OR nama ILIKE '%quran%';
UPDATE mapel SET kategori = 'Madrosiyah' WHERE kategori IS NULL OR kategori = '';

-- Insert sample mapel dengan kategori jika belum ada
INSERT INTO mapel (nama, kkm, kategori) VALUES
('Tahfizh Al-Quran', 75, 'Tahfizhiyah'),
('Tajwid', 75, 'Tahfizhiyah'),
('Tahsin', 75, 'Tahfizhiyah'),
('Murojaah', 75, 'Tahfizhiyah')
ON CONFLICT DO NOTHING;
