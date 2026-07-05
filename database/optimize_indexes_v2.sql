-- Supabase Optimization Script v2
-- Created by: Senior Supabase Performance Engineer
-- Date: 2026-01-03

-- 1. KAS (Keuangan)
-- Optimizes: Range filtering by date and sorting desc
CREATE INDEX IF NOT EXISTS idx_kas_pemasukan_tanggal ON kas_pemasukan (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_pengeluaran_tanggal ON kas_pengeluaran (tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_pemasukan_kategori ON kas_pemasukan (kategori);
CREATE INDEX IF NOT EXISTS idx_kas_pengeluaran_kategori ON kas_pengeluaran (kategori);

-- 2. SANTRI (Core Data)
-- Optimizes: Filtering active santri and sorting by name
CREATE INDEX IF NOT EXISTS idx_santri_status_nama ON santri (status, nama ASC);
-- Optimizes: FK lookups for Kelas and Halaqoh
CREATE INDEX IF NOT EXISTS idx_santri_kelas_id ON santri (kelas_id);
CREATE INDEX IF NOT EXISTS idx_santri_halaqoh_id ON santri (halaqoh_id);
CREATE INDEX IF NOT EXISTS idx_santri_angkatan_id ON santri (angkatan_id);

-- 3. TAGIHAN (Transactions)
-- Optimizes: Filtering unpaid bills
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_status ON tagihan_santri (status);
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_santri_id ON tagihan_santri (santri_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_santri_created ON tagihan_santri (created_at DESC);

-- 4. ORANG TUA ASUH (OTA)
-- Optimizes: List active OTAs ordered by name
CREATE INDEX IF NOT EXISTS idx_ota_status_nama ON orang_tua_asuh (status, nama ASC);

-- 5. HALAQOH
-- Optimizes: Sorting and FK lookup
CREATE INDEX IF NOT EXISTS idx_halaqoh_nama ON halaqoh (nama ASC);
CREATE INDEX IF NOT EXISTS idx_halaqoh_musyrif ON halaqoh (musyrif_id);

-- 6. AUDIT LOGS (Heavy Table)
-- Optimizes: Admin dashboard log viewing
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

-- 7. NOTIFICATIONS
-- Optimizes: Fetching unread notifications for a user
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read);

-- 8. SECURITY (RLS Helper)
-- Ensure user_profiles is fast to query for role checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
