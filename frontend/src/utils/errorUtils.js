/**
 * Menerjemahkan pesan error dari Supabase atau API ke Bahasa Indonesia yang user-friendly.
 * @param {any} error - Objek error atau string
 * @returns {string} Pesan error dalam Bahasa Indonesia
 */
export const translateError = (error) => {
    const errorMsg = error?.message || error || 'Terjadi kesalahan'

    // Map error messages ke bahasa Indonesia
    if (errorMsg.includes('Invalid login credentials')) {
        return 'Email/No. Telepon atau password salah. Pastikan data yang Anda masukkan benar.'
    }
    if (errorMsg.includes('Email not confirmed')) {
        return 'Email belum dikonfirmasi. Silakan cek email Anda untuk verifikasi.'
    }
    if (errorMsg.includes('User not found') || errorMsg.includes('Akun tidak ditemukan')) {
        return 'Akun dengan email/no. telepon ini tidak ditemukan.'
    }
    if (errorMsg.includes('Too many requests')) {
        return 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    }
    if (errorMsg.includes('Network') || errorMsg.includes('fetch')) {
        return 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
    }
    if (errorMsg.includes('duplicate key')) {
        return 'Data sudah ada (duplikat). Mohon cek kembali input Anda.'
    }
    if (errorMsg.includes('violates row-level security')) {
        return 'Anda tidak memiliki akses untuk melakukan tindakan ini.'
    }

    // Default return original message if no translation found
    return errorMsg
}
