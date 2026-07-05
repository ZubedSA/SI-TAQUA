import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useInformasiPondok = (activeOnly = true) => {
    return useQuery({
        queryKey: ['informasi_pondok', activeOnly],
        queryFn: async () => {
            let query = supabase
                .from('informasi_pondok')
                .select('*')
                .order('created_at', { ascending: false })

            if (activeOnly) {
                query = query.eq('is_active', true)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000 // 5 minutes (Content)
    })
}

export const useBuletin = (archived = false) => {
    return useQuery({
        queryKey: ['buletin_pondok', archived],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('buletin_pondok')
                .select('*')
                .eq('is_archived', archived)
                .order('tanggal_terbit', { ascending: false })
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000
    })
}
