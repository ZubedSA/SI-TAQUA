import { useSupabaseQuery } from '../useSupabaseQuery'
import { supabase } from '../../lib/supabase'

export const useKelasList = () => {
    return useSupabaseQuery(
        ['kelas_with_counts'],
        async () => {
            const [kelasRes, santriRes, guruRes] = await Promise.all([
                supabase
                    .from('kelas')
                    .select('*, wali_kelas:guru!wali_kelas_id(nama)')
                    .order('nama'),
                supabase
                    .from('santri')
                    .select('id, kelas_id')
                    .eq('status', 'Aktif')
                    .not('kelas_id', 'is', null),
                supabase
                    .from('guru')
                    .select('id, nama')
                    .order('nama')
            ])

            if (kelasRes.error) throw kelasRes.error

            const counts = {}
            if (santriRes.data) {
                santriRes.data.forEach(s => {
                    counts[s.kelas_id] = (counts[s.kelas_id] || 0) + 1
                })
            }

            const kelasList = (kelasRes.data || []).map(k => ({
                ...k,
                santriCount: counts[k.id] || 0
            }))

            return {
                kelasList,
                santriCounts: counts,
                guruList: guruRes.data || []
            }
        },
        {
            staleTime: 5 * 60 * 1000, // Cache for 5 minutes for instant page transition
        }
    )
}
