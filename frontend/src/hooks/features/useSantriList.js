import { useSupabaseQuery } from '../useSupabaseQuery'
// Fixed import path (../useSupabaseQuery)
import { supabase } from '../../lib/supabase'

export const useSantriList = (status = 'Aktif') => {
    return useSupabaseQuery(
        ['santri', { status }], // Cache key includes filters
        async () => {
            let query = supabase
                .from('santri')
                .select(`
                    *,
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

            // Manual join for angkatan to bypass schema cache issues
            const angkatanMap = (angkatanRes.data || []).reduce((acc, current) => {
                acc[current.id] = current.nama
                return acc
            }, {})

            const enrichedData = (santriRes.data || []).map(s => ({
                ...s,
                angkatan: s.angkatan_id ? { nama: angkatanMap[s.angkatan_id] || '-' } : null
            }))

            // Transform data for consistency if needed
            return enrichedData.map(s => ({
                ...s,
                kelas: s.kelas?.nama || '-',
                halaqoh: s.halaqoh?.nama || '-',
                angkatan: s.angkatan?.nama || '-', // Access the 'nama' property from the manually joined object
                raw_angkatan_id: s.angkatan_id // Keep original for reference
            }))
        },
        {
            staleTime: 0, // Disable cache to ensure fresh data after updates
        }
    )
}
