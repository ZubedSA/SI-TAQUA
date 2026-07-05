import { useSupabaseQuery } from '../useSupabaseQuery'
import { supabase } from '../../lib/supabase'

export const useTagihanSantri = (filters = {}) => {
    const { status } = filters

    return useSupabaseQuery(
        ['tagihan_santri', { status }],
        async () => {
            let query = supabase
                .from('tagihan_santri')
                .select('*')
                .order('created_at', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        {
            staleTime: 5 * 60 * 1000, // 5 minutes cache
        }
    )
}
