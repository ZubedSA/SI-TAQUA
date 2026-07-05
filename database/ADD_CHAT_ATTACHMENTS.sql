-- =========================================================================
-- ADD_CHAT_ATTACHMENTS.sql
-- Menambahkan support untuk file attachment di chat
-- =========================================================================

-- =====================================================
-- 1. ALTER MESSAGES TABLE - Add file columns
-- =====================================================
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Update type check to include 'file' and 'image'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check 
    CHECK (type IN ('text', 'system', 'file', 'image'));

-- =====================================================
-- 2. CREATE STORAGE BUCKET for chat files
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-files',
    'chat-files',
    true,
    10485760, -- 10MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 3. STORAGE POLICIES for chat-files bucket
-- =====================================================
-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'chat-files');

-- Allow authenticated users to view files
DROP POLICY IF EXISTS "Authenticated users can view chat files" ON storage.objects;
CREATE POLICY "Authenticated users can view chat files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'chat-files');

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete own chat files" ON storage.objects;
CREATE POLICY "Users can delete own chat files" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- 4. UPDATE send_message function to support files
-- =====================================================
CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_message TEXT,
    p_type TEXT DEFAULT 'text',
    p_file_url TEXT DEFAULT NULL,
    p_file_name TEXT DEFAULT NULL,
    p_file_type TEXT DEFAULT NULL,
    p_file_size INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_message_id UUID;
    v_preview TEXT;
BEGIN
    -- Create preview text for last_message
    IF p_type = 'image' THEN
        v_preview := '📷 Foto';
    ELSIF p_type = 'file' THEN
        v_preview := '📎 ' || COALESCE(p_file_name, 'File');
    ELSE
        v_preview := p_message;
    END IF;

    -- Insert message
    INSERT INTO messages (
        conversation_id, 
        sender_id, 
        message, 
        type,
        file_url,
        file_name,
        file_type,
        file_size
    )
    VALUES (
        p_conversation_id, 
        auth.uid(), 
        p_message,
        p_type,
        p_file_url,
        p_file_name,
        p_file_type,
        p_file_size
    )
    RETURNING id INTO v_message_id;
    
    -- Update conversation last message
    UPDATE conversations
    SET last_message = v_preview,
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN v_message_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;

-- =====================================================
-- DONE
-- =====================================================
SELECT '✅ Chat attachments berhasil ditambahkan!' as status;
