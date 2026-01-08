-- =========================================================================
-- CREATE_CHAT_SYSTEM.sql
-- Sistem Chat Internal 1-to-1 dengan Izin Berbasis Role
-- =========================================================================

BEGIN;

-- =====================================================
-- 1. TABEL CONVERSATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pastikan user_1 < user_2 untuk konsistensi (avoid duplicate)
    CONSTRAINT unique_conversation UNIQUE (user_1_id, user_2_id),
    CONSTRAINT different_users CHECK (user_1_id != user_2_id)
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_conversations_user_1 ON conversations(user_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_2 ON conversations(user_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- =====================================================
-- 2. TABEL MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES - CONVERSATIONS
-- =====================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

-- SELECT: User hanya bisa lihat conversation miliknya
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = user_1_id OR auth.uid() = user_2_id
    );

-- INSERT: User hanya bisa buat conversation jika dia salah satu participant
CREATE POLICY "Users can insert conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = user_1_id OR auth.uid() = user_2_id
    );

-- UPDATE: User hanya bisa update conversation miliknya
CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = user_1_id OR auth.uid() = user_2_id
    );

-- =====================================================
-- 5. RLS POLICIES - MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

-- SELECT: User hanya bisa lihat pesan di conversation miliknya
CREATE POLICY "Users can view messages in own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.user_1_id = auth.uid() OR c.user_2_id = auth.uid())
        )
        AND is_deleted = FALSE
    );

-- INSERT: User hanya bisa kirim pesan ke conversation miliknya
CREATE POLICY "Users can insert messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = conversation_id
            AND (c.user_1_id = auth.uid() OR c.user_2_id = auth.uid())
        )
    );

-- UPDATE: User hanya bisa update pesan miliknya (untuk is_read / soft delete)
CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.user_1_id = auth.uid() OR c.user_2_id = auth.uid())
        )
    );

-- =====================================================
-- 6. FUNCTION: Get or Create Conversation
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_id UUID := auth.uid();
    v_conversation_id UUID;
    v_user_1 UUID;
    v_user_2 UUID;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF v_my_id < p_other_user_id THEN
        v_user_1 := v_my_id;
        v_user_2 := p_other_user_id;
    ELSE
        v_user_1 := p_other_user_id;
        v_user_2 := v_my_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE user_1_id = v_user_1 AND user_2_id = v_user_2;
    
    -- Create if not exists
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (user_1_id, user_2_id)
        VALUES (v_user_1, v_user_2)
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$;

-- =====================================================
-- 7. FUNCTION: Check Can Chat (Permission)
-- =====================================================
CREATE OR REPLACE FUNCTION can_chat(
    p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_id UUID := auth.uid();
    v_my_role TEXT;
    v_my_roles TEXT[];
    v_target_role TEXT;
    v_target_roles TEXT[];
    v_is_linked BOOLEAN := FALSE;
BEGIN
    -- Get my profile
    SELECT role, roles INTO v_my_role, v_my_roles
    FROM user_profiles WHERE user_id = v_my_id;
    
    -- Get target profile
    SELECT role, roles INTO v_target_role, v_target_roles
    FROM user_profiles WHERE user_id = p_target_user_id;
    
    -- Super Admin, Pengasuh, Admin can chat everyone
    IF v_my_role IN ('admin', 'pengasuh') OR 'admin' = ANY(v_my_roles) OR 'pengasuh' = ANY(v_my_roles) THEN
        RETURN TRUE;
    END IF;
    
    -- Bendahara can chat Wali Santri
    IF (v_my_role = 'bendahara' OR 'bendahara' = ANY(v_my_roles)) 
       AND (v_target_role = 'wali' OR 'wali' = ANY(v_target_roles)) THEN
        RETURN TRUE;
    END IF;
    
    -- Wali Santri can chat Bendahara
    IF (v_my_role = 'wali' OR 'wali' = ANY(v_my_roles)) 
       AND (v_target_role = 'bendahara' OR 'bendahara' = ANY(v_target_roles)) THEN
        RETURN TRUE;
    END IF;
    
    -- Musyrif <-> Wali Santri (check if linked via santri)
    IF (v_my_role = 'musyrif' OR 'musyrif' = ANY(v_my_roles)) 
       AND (v_target_role = 'wali' OR 'wali' = ANY(v_target_roles)) THEN
        -- Check if musyrif and wali are linked via same santri
        SELECT EXISTS (
            SELECT 1 
            FROM wali_santri ws
            JOIN santri s ON s.id = ws.santri_id
            JOIN halaqoh h ON h.id = s.halaqoh_id
            JOIN guru g ON g.id = h.musyrif_id
            WHERE ws.wali_id = p_target_user_id
            AND g.user_id = v_my_id
        ) INTO v_is_linked;
        
        IF v_is_linked THEN RETURN TRUE; END IF;
    END IF;
    
    -- Wali Santri can chat Musyrif (if linked)
    IF (v_my_role = 'wali' OR 'wali' = ANY(v_my_roles)) 
       AND (v_target_role = 'musyrif' OR 'musyrif' = ANY(v_target_roles)) THEN
        -- Check if linked
        SELECT EXISTS (
            SELECT 1 
            FROM wali_santri ws
            JOIN santri s ON s.id = ws.santri_id
            JOIN halaqoh h ON h.id = s.halaqoh_id
            JOIN guru g ON g.id = h.musyrif_id
            WHERE ws.wali_id = v_my_id
            AND g.user_id = p_target_user_id
        ) INTO v_is_linked;
        
        IF v_is_linked THEN RETURN TRUE; END IF;
    END IF;
    
    -- User Umum / OTA can chat Admin
    IF v_target_role = 'admin' OR 'admin' = ANY(v_target_roles) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- =====================================================
-- 8. FUNCTION: Get Chat Contacts
-- =====================================================
CREATE OR REPLACE FUNCTION get_chat_contacts()
RETURNS TABLE (
    user_id UUID,
    nama TEXT,
    email TEXT,
    role TEXT,
    roles TEXT[],
    can_chat BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.nama,
        up.email,
        up.role,
        up.roles,
        can_chat(up.user_id) as can_chat
    FROM user_profiles up
    WHERE up.user_id != v_my_id
    AND can_chat(up.user_id) = TRUE
    ORDER BY up.nama;
END;
$$;

-- =====================================================
-- 9. FUNCTION: Get Unread Count
-- =====================================================
CREATE OR REPLACE FUNCTION get_unread_message_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.user_1_id = auth.uid() OR c.user_2_id = auth.uid())
    AND m.sender_id != auth.uid()
    AND m.is_read = FALSE
    AND m.is_deleted = FALSE;
    
    RETURN COALESCE(v_count, 0);
END;
$$;

-- =====================================================
-- 10. FUNCTION: Mark Messages as Read
-- =====================================================
CREATE OR REPLACE FUNCTION mark_messages_read(
    p_conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE messages
    SET is_read = TRUE
    WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND is_read = FALSE;
END;
$$;

-- =====================================================
-- 11. FUNCTION: Send Message
-- =====================================================
CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_message_id UUID;
BEGIN
    -- Insert message
    INSERT INTO messages (conversation_id, sender_id, message)
    VALUES (p_conversation_id, auth.uid(), p_message)
    RETURNING id INTO v_message_id;
    
    -- Update conversation last message
    UPDATE conversations
    SET last_message = p_message,
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN v_message_id;
END;
$$;

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;

COMMIT;

-- =====================================================
-- DONE
-- =====================================================
SELECT '✅ Sistem Chat berhasil dibuat!' as status;
