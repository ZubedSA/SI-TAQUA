-- =========================================================================
-- CREATE_UPLOADS_BUCKET.sql
-- Membuat bucket storage untuk upload bukti transfer
-- =========================================================================

-- Buat bucket 'uploads' jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    true,
    10485760, -- 10MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/jfif',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/jfif',
        'application/pdf'
    ];

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to view files
DROP POLICY IF EXISTS "Authenticated users can view uploads" ON storage.objects;
CREATE POLICY "Authenticated users can view uploads" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'uploads');

-- Allow public to view (for public URLs)
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;
CREATE POLICY "Public can view uploads" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'uploads');

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

SELECT '✅ Bucket uploads berhasil dibuat!' as status;
