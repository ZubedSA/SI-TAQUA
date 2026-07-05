-- =====================================================
-- MIGRATION: PUSH NOTIFICATION SYSTEM
-- Sistem Push Notification untuk SI-TAQUA PWA
-- =====================================================

-- =====================================================
-- 1. TABEL PUSH_SUBSCRIPTIONS
-- Menyimpan push subscription per user/device
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Index untuk lookup cepat berdasarkan user
CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);

-- =====================================================
-- 2. ENABLE RLS
-- =====================================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- User bisa melihat subscription miliknya sendiri
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
ON push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- User bisa insert subscription baru
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
ON push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User bisa update subscription miliknya
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
ON push_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- User bisa hapus subscription miliknya
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
ON push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 3. RPC: SAVE PUSH SUBSCRIPTION (Upsert)
-- =====================================================
CREATE OR REPLACE FUNCTION save_push_subscription(
    p_endpoint TEXT,
    p_p256dh TEXT,
    p_auth TEXT
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth)
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_push_subscription(TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- 4. RPC: GET PUSH SUBSCRIPTIONS FOR WALI SANTRI
-- Dipanggil oleh Edge Function (service_role)
-- =====================================================
CREATE OR REPLACE FUNCTION get_wali_push_subscriptions(p_santri_ids UUID[])
RETURNS TABLE (
    user_id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT,
    santri_nama TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.user_id,
        ps.endpoint,
        ps.p256dh,
        ps.auth,
        s.nama AS santri_nama
    FROM push_subscriptions ps
    JOIN santri s ON s.wali_id = ps.user_id
    WHERE s.id = ANY(p_santri_ids)
    AND s.wali_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_wali_push_subscriptions(UUID[]) TO authenticated;

-- =====================================================
-- 5. RPC: GET ADMIN PUSH SUBSCRIPTIONS
-- Dipanggil untuk notifikasi ke admin
-- =====================================================
CREATE OR REPLACE FUNCTION get_admin_push_subscriptions()
RETURNS TABLE (
    user_id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.user_id,
        ps.endpoint,
        ps.p256dh,
        ps.auth
    FROM push_subscriptions ps
    JOIN user_profiles up ON up.user_id = ps.user_id
    WHERE up.role IN ('admin', 'admin_absensi')
       OR up.roles && ARRAY['admin', 'admin_absensi'];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_admin_push_subscriptions() TO authenticated;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'push_subscriptions';
