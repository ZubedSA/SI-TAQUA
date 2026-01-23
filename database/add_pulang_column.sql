-- Add pulang column to perilaku_semester table
ALTER TABLE perilaku_semester 
ADD COLUMN IF NOT EXISTS pulang INT DEFAULT 0;

COMMENT ON COLUMN perilaku_semester.pulang IS 'Manual count of times santri went home (Pulang)';
