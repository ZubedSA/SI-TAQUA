import { useSupabaseQuery } from '../useSupabaseQuery'
// Fixed import path (../useSupabaseQuery)
import { supabase } from '../../lib/supabase'

export const useSantriList = (status = 'Aktif') => {
    return useSupabaseQuery(
        ['santri', { status }], // Cache key includes filters
        async () => {
            // 2-second timeout promise limit
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Koneksi timeout, menampilkan data tersimpan.')), 2000)
            )

            const fetchQuery = (async () => {
                let query = supabase
                    .from('santri')
                    .select(`
                        id, nis, nama, status, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_wali, no_telp_wali, kelas_id, halaqoh_id, angkatan_id,
                        kelas:kelas!kelas_id(nama),
                        halaqoh:halaqoh!halaqoh_id(nama)
                    `)
                    .order('nama', { ascending: true })

                if (status && status !== 'semua') {
                    query = query.ilike('status', status)
                }

                const [santriRes, angkatanRes] = await Promise.all([
                    query,
                    supabase.from('angkatan').select('id, nama')
                ])

                if (santriRes.error) throw santriRes.error

                const angkatanMap = (angkatanRes.data || []).reduce((acc, current) => {
                    acc[current.id] = current.nama
                    return acc
                }, {})

                const enrichedData = (santriRes.data || []).map(s => ({
                    ...s,
                    angkatan: s.angkatan_id ? { nama: angkatanMap[s.angkatan_id] || '-' } : null
                }))

                return enrichedData.map(s => ({
                    ...s,
                    kelas: s.kelas?.nama || '-',
                    halaqoh: s.halaqoh?.nama || '-',
                    angkatan: s.angkatan?.nama || '-',
                    raw_angkatan_id: s.angkatan_id
                }))
            })()

            return await Promise.race([fetchQuery, timeoutPromise])
        },
        {
            staleTime: 2 * 60 * 1000, // 2 minutes SWR cache for instant load
        }
    )
}
