/**
 * Wali Santri Service
 * ============================================================================
 * Service khusus untuk operasi relasi wali-santri.
 * PENTING: Tidak dipanggil saat login. Hanya dipanggil dari portal wali.
 * ============================================================================
 */

import { supabase } from './supabase'

/**
 * Fetch daftar santri yang terhubung ke wali user
 * @param {string} waliUserId - UUID user wali
 * @returns {Promise<Array>} Array of santri objects
 */
export async function fetchWaliSantri(waliUserId) {
    if (!waliUserId) {
        console.warn('fetchWaliSantri: waliUserId kosong')
        return []
    }

    try {
        const { data, error } = await supabase
            .from('santri')
            .select(`
                id,
                nis,
                nama,
                jenis_kelamin,
                kelas:kelas_id(id, nama),
                halaqoh:halaqoh_id(id, nama, guru:guru_id(nama))
            `)
            .eq('wali_id', waliUserId)
            .eq('is_active', true)
            .order('nama', { ascending: true })

        if (error) {
            console.error('Error fetching wali santri:', error.message)
            throw error
        }

        return data || []
    } catch (err) {
        console.error('fetchWaliSantri error:', err)
        return []
    }
}

/**
 * Link santri ke wali user (Operasi Admin)
 * @param {string} waliUserId - UUID user wali
 * @param {Array<string>} santriIds - Array of santri IDs to link
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function linkSantriToWali(waliUserId, santriIds) {
    if (!waliUserId) {
        return { success: false, message: 'waliUserId harus diisi' }
    }

    try {
        // 1. Reset existing links (hapus link lama)
        const { error: resetError } = await supabase
            .from('santri')
            .update({ wali_id: null })
            .eq('wali_id', waliUserId)

        if (resetError) {
            console.error('Error resetting wali links:', resetError.message)
            // Lanjut saja, mungkin tidak ada link sebelumnya
        }

        // 2. Set new links (jika ada)
        if (santriIds && santriIds.length > 0) {
            const { error: linkError } = await supabase
                .from('santri')
                .update({ wali_id: waliUserId })
                .in('id', santriIds)

            if (linkError) {
                throw linkError
            }
        }

        return {
            success: true,
            message: `Berhasil menghubungkan ${santriIds?.length || 0} santri ke wali`
        }
    } catch (err) {
        console.error('linkSantriToWali error:', err)
        return { success: false, message: err.message }
    }
}

/**
 * Unlink semua santri dari wali user
 * @param {string} waliUserId - UUID user wali
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function unlinkAllSantriFromWali(waliUserId) {
    if (!waliUserId) {
        return { success: false, message: 'waliUserId harus diisi' }
    }

    try {
        const { error } = await supabase
            .from('santri')
            .update({ wali_id: null })
            .eq('wali_id', waliUserId)

        if (error) throw error

        return { success: true, message: 'Semua santri berhasil di-unlink dari wali' }
    } catch (err) {
        console.error('unlinkAllSantriFromWali error:', err)
        return { success: false, message: err.message }
    }
}

/**
 * Cek apakah user adalah wali dari santri tertentu
 * @param {string} waliUserId - UUID user wali
 * @param {string} santriId - UUID santri
 * @returns {Promise<boolean>}
 */
export async function isWaliOfSantri(waliUserId, santriId) {
    if (!waliUserId || !santriId) return false

    try {
        const { data, error } = await supabase
            .from('santri')
            .select('id')
            .eq('id', santriId)
            .eq('wali_id', waliUserId)
            .single()

        if (error) return false
        return !!data
    } catch {
        return false
    }
}

export default {
    fetchWaliSantri,
    linkSantriToWali,
    unlinkAllSantriFromWali,
    isWaliOfSantri
}
