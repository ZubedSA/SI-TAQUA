-- =============================================
-- AUDIT LOG TABLE - JALANKAN DI SUPABASE SQL EDITOR
-- =============================================

-- 1. Drop table jika sudah ada (untuk fresh start)
DROP TABLE IF EXISTS audit_log;

-- 2. Buat tabel audit_log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255),
    action VARCHAR(20) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    record_name VARCHAR(255),
    description TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Buat policy untuk INSERT (semua user bisa insert)
CREATE POLICY "Allow insert for all" ON audit_log
    FOR INSERT WITH CHECK (true);

-- 5. Buat policy untuk SELECT (semua user bisa baca)
CREATE POLICY "Allow select for all" ON audit_log
    FOR SELECT USING (true);

-- 6. Buat index untuk performa
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- 7. Insert sample data untuk test
INSERT INTO audit_log (user_email, action, table_name, record_name, description)
VALUES ('admin@test.com', 'CREATE', 'test', 'Test', 'Initial test log entry');

-- 8. Verifikasi
SELECT * FROM audit_log;
