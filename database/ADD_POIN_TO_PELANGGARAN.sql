-- Add poin column to pelanggaran table
ALTER TABLE pelanggaran ADD COLUMN IF NOT EXISTS poin INTEGER DEFAULT 0;

-- Optional: Update existing records to have 0 points if null
UPDATE pelanggaran SET poin = 0 WHERE poin IS NULL;
