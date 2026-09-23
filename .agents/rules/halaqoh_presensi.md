# Aturan Presensi Halaqoh (Qur'aniyah) SI-TAQUA

1. **Wajib Scan Mandiri Tiap Jam (Jam 1, 2, dan 3):**
   - Dalam satu hari terdapat hingga 3 jam/sesi halaqoh (Jam ke-1, Jam ke-2, Jam ke-3).
   - Musyrif halaqoh **WAJIB** melakukan scan QR pada masing-masing jam halaqoh sesuai jadwal pelajaran dan guru pengajar.
   - Scan pada jam tertentu (misal Jam 1) **TIDAK BOLEH** secara otomatis membuka atau memvalidasi jam berikutnya (Jam 2 dan 3).
   - Setiap jam halaqoh memiliki siklus validasi dan presensi mandiri.

2. **Kunci Verifikasi Scan (`sessionStorage`):**
   - Kunci verifikasi scan harus spesifik per jadwal ID (`SITAQUA_SCAN_${jadwal_id}`), BUKAN kunci global berbasis kelas/halaqoh (`SITAQUA_SCAN_${halaqoh_id}`).
   - Pembukaan form jurnal (`openJurnalForm`) di `AgendaMengajar.jsx` hanya diizinkan jika jadwal spesifik tersebut telah terverifikasi via QR.

3. **Pencatatan Presensi Staf (`presensi_staf`):**
   - Setiap scan presensi staf halaqoh wajib mencatat kolom `jam_ke` (1, 2, atau 3) dan `jadwal_id`.
   - Logika pencocokan riwayat kehadiran (`attendanceHelper.js`) WAJIB mencocokkan `jam_ke` antara jadwal dan scan staf, tanpa fallback buta antar jam.

4. **Toleransi Waktu Pengisian:**
   - Karena musyrif membuktikan kehadiran fisik dengan scan QR di halaqoh, sistem memberikan kelonggaran pengisian jurnal (hingga 180 menit setelah jam halaqoh selesai) agar musyrif tidak terblokir setelah santri berdzikir atau berkonsultasi.
