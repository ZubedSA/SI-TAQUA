-- ============================================================================
-- MIGRATION: TWO-WAY SYNC MUSYRIF HALAQOH, USER, DAN ABSENSI
-- ============================================================================
-- Versi: 1.0
-- Deskripsi: Menambahkan trigger untuk menyinkronkan data perubahan Musyrif
--            di tabel halaqoh, musyrif_halaqoh, jadwal_pelajaran, dan presensi.
-- ============================================================================

-- 1. FUNGSI TRIGGER UNTUK PERUBAHAN DARI TABEL HALAQOH
CREATE OR REPLACE FUNCTION sync_from_halaqoh()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Mencegah infinite loop (jika trigger ini dipanggil oleh trigger lain)
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Pastikan ada perubahan pada musyrif_id
    IF (OLD.musyrif_id IS DISTINCT FROM NEW.musyrif_id) THEN
        
        -- A. Update jadwal_pelajaran (ubah guru untuk jadwal halaqoh ini)
        UPDATE jadwal_pelajaran
        SET guru_id = NEW.musyrif_id
        WHERE halaqoh_id = NEW.id AND tipe = 'HALAQOH';

        -- B. Update presensi_mapel (ubah guru_id di data absensi/jurnal)
        UPDATE presensi_mapel
        SET guru_id = NEW.musyrif_id
        WHERE halaqoh_id = NEW.id;

        -- C. Sinkronisasi dengan musyrif_halaqoh (Relasi User Auth)
        -- Hapus assignment lama untuk halaqoh ini
        DELETE FROM musyrif_halaqoh WHERE halaqoh_id = NEW.id;

        -- Jika musyrif_id yang baru tidak null, tambahkan assignment baru
        IF NEW.musyrif_id IS NOT NULL THEN
            -- Cari auth.user_id yang terkait dengan guru_id (musyrif) ini
            SELECT user_id INTO v_user_id 
            FROM user_profiles 
            WHERE guru_id = NEW.musyrif_id 
            LIMIT 1;
            
            -- Jika user ditemukan, masukkan ke musyrif_halaqoh
            IF v_user_id IS NOT NULL THEN
                INSERT INTO musyrif_halaqoh (user_id, halaqoh_id) 
                VALUES (v_user_id, NEW.id)
                ON CONFLICT (user_id, halaqoh_id) DO NOTHING;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang Trigger di tabel halaqoh
DROP TRIGGER IF EXISTS trigger_sync_from_halaqoh ON halaqoh;
CREATE TRIGGER trigger_sync_from_halaqoh
AFTER UPDATE OF musyrif_id ON halaqoh
FOR EACH ROW
EXECUTE FUNCTION sync_from_halaqoh();

-- 2. FUNGSI TRIGGER UNTUK PERUBAHAN DARI TABEL MUSYRIF_HALAQOH (USER MGMT)
CREATE OR REPLACE FUNCTION sync_from_musyrif_halaqoh()
RETURNS TRIGGER AS $$
DECLARE
    v_guru_id UUID;
    v_halaqoh_id UUID;
    v_user_id UUID;
BEGIN
    -- Mencegah infinite loop
    IF pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_halaqoh_id := NEW.halaqoh_id;
        v_user_id := NEW.user_id;

        -- Cari guru_id yang terikat dengan user_id ini
        SELECT guru_id INTO v_guru_id 
        FROM user_profiles 
        WHERE user_id = v_user_id 
        LIMIT 1;
        
        IF v_guru_id IS NOT NULL THEN
            -- Update halaqoh.musyrif_id
            UPDATE halaqoh 
            SET musyrif_id = v_guru_id 
            WHERE id = v_halaqoh_id AND (musyrif_id IS NULL OR musyrif_id != v_guru_id);

            -- Update jadwal_pelajaran
            UPDATE jadwal_pelajaran
            SET guru_id = v_guru_id
            WHERE halaqoh_id = v_halaqoh_id AND tipe = 'HALAQOH' AND (guru_id IS NULL OR guru_id != v_guru_id);

            -- Update presensi_mapel
            UPDATE presensi_mapel
            SET guru_id = v_guru_id
            WHERE halaqoh_id = v_halaqoh_id AND (guru_id IS NULL OR guru_id != v_guru_id);
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_halaqoh_id := OLD.halaqoh_id;
        v_user_id := OLD.user_id;
        
        -- Cari guru_id lama
        SELECT guru_id INTO v_guru_id 
        FROM user_profiles 
        WHERE user_id = v_user_id 
        LIMIT 1;

        IF v_guru_id IS NOT NULL THEN
            -- Hapus musyrif_id di halaqoh jika guru yang dihapus adalah musyrif saat ini
            UPDATE halaqoh 
            SET musyrif_id = NULL 
            WHERE id = v_halaqoh_id AND musyrif_id = v_guru_id;
        END IF;

        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Pasang Trigger di tabel musyrif_halaqoh
DROP TRIGGER IF EXISTS trigger_sync_from_musyrif_halaqoh ON musyrif_halaqoh;
CREATE TRIGGER trigger_sync_from_musyrif_halaqoh
AFTER INSERT OR UPDATE OR DELETE ON musyrif_halaqoh
FOR EACH ROW
EXECUTE FUNCTION sync_from_musyrif_halaqoh();

SELECT '✅ Trigger sinkronisasi dua arah untuk Musyrif, User, dan Absensi berhasil dibuat!' as status;
