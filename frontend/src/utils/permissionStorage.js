/**
 * Permission Storage & Matrix Definitions
 * Role-Based Access Control (RBAC) System for SI-TAQUA
 */

export const ROLES = [
    { id: 'admin', name: 'Administrator', label: 'Admin', color: 'blue', desc: 'Akses penuh ke seluruh sistem dan konfigurasi' },
    { id: 'admin_akademik', name: 'Admin Akademik', label: 'Adm. Akademik', color: 'indigo', desc: 'Pengelolaan kurikulum, master data santri & raport' },
    { id: 'guru', name: 'Guru & Pengajar', label: 'Guru', color: 'emerald', desc: 'Input nilai madrosiyah & absensi santri di kelas' },
    { id: 'musyrif', name: 'Musyrif Tahfizh', label: 'Musyrif', color: 'green', desc: 'Input setoran hafalan & ujian syahri tahfizh' },
    { id: 'bendahara', name: 'Bendahara / Keuangan', label: 'Bendahara', color: 'amber', desc: 'Pengelolaan kas, SPP, tagihan, dan anggaran' },
    { id: 'pengasuh', name: 'Pengasuh Pondok', label: 'Pengasuh', color: 'violet', desc: 'Persetujuan anggaran, monitoring santri & pondok' },
    { id: 'pengurus', name: 'Pengurus Pondok', label: 'Pengurus', color: 'pink', desc: 'Pencatatan pelanggaran, perizinan santri & keamanan' },
    { id: 'ota', name: 'Orang Tua Asuh', label: 'OTA', color: 'cyan', desc: 'Monitoring donasi & penyaluran beasiswa santri' },
    { id: 'wali', name: 'Wali Santri', label: 'Wali', color: 'gray', desc: 'Portal monitoring hafalan, nilai & tagihan anak' }
];

export const MODULE_GROUPS = [
    {
        id: 'sistem',
        label: 'Sistem & Keamanan',
        modules: [
            { id: 'dashboard_admin', label: 'Dashboard Utama Admin', defaultRoles: ['admin'] },
            { id: 'users', label: 'Manajemen User', defaultRoles: ['admin'] },
            { id: 'roles', label: 'Roles & Access Control', defaultRoles: ['admin'], lockedForAdmin: true },
            { id: 'settings', label: 'Pengaturan Sistem', defaultRoles: ['admin'], lockedForAdmin: true },
            { id: 'audit_log', label: 'Log Aktivitas & Audit', defaultRoles: ['admin'] },
            { id: 'security', label: 'Deteksi Akun Mencurigakan', defaultRoles: ['admin'] },
        ]
    },
    {
        id: 'kesiswaan',
        label: 'Data Kesiswaan & Master',
        modules: [
            { id: 'santri', label: 'Data Santri', defaultRoles: ['admin', 'admin_akademik', 'guru', 'bendahara', 'pengurus'] },
            { id: 'guru', label: 'Data Guru & Asatidz', defaultRoles: ['admin', 'admin_akademik'] },
            { id: 'wali', label: 'Data Wali Santri', defaultRoles: ['admin', 'admin_akademik', 'bendahara'] },
            { id: 'kelas', label: 'Manajemen Kelas', defaultRoles: ['admin', 'admin_akademik'] },
            { id: 'mapel', label: 'Mata Pelajaran', defaultRoles: ['admin', 'admin_akademik'] },
            { id: 'halaqoh', label: 'Manajemen Halaqoh', defaultRoles: ['admin', 'admin_akademik'] },
            { id: 'semester', label: 'Tahun Ajaran & Semester', defaultRoles: ['admin', 'admin_akademik'] },
            { id: 'jadwal', label: 'Jadwal Pelajaran & Mengajar', defaultRoles: ['admin', 'admin_akademik', 'guru'] },
        ]
    },
    {
        id: 'akademik',
        label: 'Akademik & Tahfizh',
        modules: [
            { id: 'dashboard_akademik', label: 'Dashboard Akademik', defaultRoles: ['admin', 'admin_akademik', 'guru', 'musyrif'] },
            { id: 'hafalan_input', label: 'Input Setoran Hafalan', defaultRoles: ['admin', 'admin_akademik', 'musyrif', 'guru'] },
            { id: 'hafalan_rekap', label: 'Rekap & Laporan Hafalan', defaultRoles: ['admin', 'admin_akademik', 'musyrif', 'guru'] },
            { id: 'nilai_input', label: 'Input Nilai (UTS/UAS/Harian)', defaultRoles: ['admin', 'admin_akademik', 'guru'] },
            { id: 'nilai_rekap', label: 'Rekap Nilai & Syahri', defaultRoles: ['admin', 'admin_akademik', 'guru'] },
            { id: 'raport', label: 'Cetak & Kelola Raport', defaultRoles: ['admin', 'admin_akademik', 'guru'] },
            { id: 'presensi_akademik', label: 'Presensi KBM & Mengajar', defaultRoles: ['admin', 'admin_akademik', 'guru'] },
            { id: 'kalender_akademik', label: 'Kalender Pendidikan', defaultRoles: ['admin', 'admin_akademik', 'guru', 'musyrif'] },
        ]
    },
    {
        id: 'keuangan',
        label: 'Keuangan & SPP',
        modules: [
            { id: 'dashboard_keuangan', label: 'Dashboard Keuangan', defaultRoles: ['admin', 'bendahara', 'pengasuh'] },
            { id: 'kas_pemasukan', label: 'Kas Pemasukan', defaultRoles: ['admin', 'bendahara'] },
            { id: 'kas_pengeluaran', label: 'Kas Pengeluaran', defaultRoles: ['admin', 'bendahara'] },
            { id: 'tagihan_spp', label: 'Tagihan & SPP Santri', defaultRoles: ['admin', 'bendahara'] },
            { id: 'pembayaran_santri', label: 'Input Pembayaran & Kwitansi', defaultRoles: ['admin', 'bendahara'] },
            { id: 'anggaran', label: 'Rencana Anggaran Biaya (RAB)', defaultRoles: ['admin', 'bendahara'] },
            { id: 'persetujuan_dana', label: 'Persetujuan Pengeluaran Dana', defaultRoles: ['admin', 'pengasuh', 'bendahara'] },
            { id: 'laporan_keuangan', label: 'Laporan Keuangan & Arus Kas', defaultRoles: ['admin', 'bendahara', 'pengasuh'] },
        ]
    },
    {
        id: 'pengurus',
        label: 'Pengurus & Kedisiplinan',
        modules: [
            { id: 'dashboard_pengurus', label: 'Dashboard Pengurus', defaultRoles: ['admin', 'pengurus', 'pengasuh'] },
            { id: 'pelanggaran', label: 'Pencatatan Pelanggaran Santri', defaultRoles: ['admin', 'pengurus'] },
            { id: 'perizinan', label: 'Perizinan & Keluar Masuk', defaultRoles: ['admin', 'pengurus'] },
            { id: 'pengumuman', label: 'Kelola Pengumuman Santri', defaultRoles: ['admin', 'pengurus'] },
        ]
    },
    {
        id: 'ota',
        label: 'Orang Tua Asuh (OTA)',
        modules: [
            { id: 'dashboard_ota', label: 'Dashboard Donasi OTA', defaultRoles: ['admin', 'ota', 'bendahara'] },
            { id: 'ota_santri', label: 'Data Santri Penerima OTA', defaultRoles: ['admin', 'ota', 'bendahara'] },
            { id: 'ota_penyaluran', label: 'Penyaluran Dana Beasiswa', defaultRoles: ['admin', 'ota', 'bendahara'] },
            { id: 'ota_laporan', label: 'Laporan Donatur & Donasi', defaultRoles: ['admin', 'ota', 'bendahara'] },
        ]
    },
    {
        id: 'wali',
        label: 'Portal Wali Santri',
        modules: [
            { id: 'dashboard_wali', label: 'Dashboard Wali Santri', defaultRoles: ['wali', 'admin'] },
            { id: 'wali_hafalan', label: 'Monitoring Hafalan Santri', defaultRoles: ['wali', 'admin'] },
            { id: 'wali_nilai', label: 'Lihat Nilai & Raport', defaultRoles: ['wali', 'admin'] },
            { id: 'wali_tagihan', label: 'Cek Tagihan & Riwayat Bayar', defaultRoles: ['wali', 'admin'] },
        ]
    }
];

const STORAGE_KEY = 'sitaqua_role_permissions';

/**
 * Generate default permission matrix (Module ID -> Array of Role IDs)
 */
export const getDefaultPermissions = () => {
    const matrix = {};
    MODULE_GROUPS.forEach(group => {
        group.modules.forEach(mod => {
            matrix[mod.id] = [...mod.defaultRoles];
        });
    });
    return matrix;
};

/**
 * Load role permissions from localStorage or defaults
 */
export const getRolePermissions = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Ensure any newly added modules still have defaults
            const defaults = getDefaultPermissions();
            return { ...defaults, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to parse stored role permissions:', e);
    }
    return getDefaultPermissions();
};

/**
 * Save role permissions to storage and notify listeners
 */
export const saveRolePermissions = (permissions) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
        window.dispatchEvent(new CustomEvent('sitaqua_permissions_updated', { detail: permissions }));
        return true;
    } catch (e) {
        console.error('Failed to save role permissions:', e);
        return false;
    }
};

/**
 * Reset role permissions to factory defaults
 */
export const resetRolePermissions = () => {
    const defaults = getDefaultPermissions();
    saveRolePermissions(defaults);
    return defaults;
};
