-- FIX TRASH TABLE SCHEMA
-- Masalah: Trigger delete mencoba memasukkan data ke kolom 'reason', tapi kolom tersebut tidak ada.
-- Solusi: Tambahkan kolom 'reason' ke tabel trash.

ALTER TABLE trash 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Opsional: Update function agar support reason (jika belum)
CREATE OR REPLACE FUNCTION move_to_trash()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO trash (table_name, original_id, data, deleted_by, deleted_at, auto_delete_at, reason)
    VALUES (
        TG_TABLE_NAME,
        OLD.id,
        to_jsonb(OLD),
        auth.uid(),
        NOW(),
        NOW() + INTERVAL '30 days',
        NULL -- Default reason NULL
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
