import { useSupabaseQuery } from '../useSupabaseQuery'
import { supabase } from '../../lib/supabase'

export const useKasPengeluaran = (filters = {}) => {
    const { bulan, tahun, dateFrom, dateTo } = filters

    return useSupabaseQuery(
        ['kas_pengeluaran', { bulan, tahun, dateFrom, dateTo }],
        async () => {
            let query = supabase
                .from('kas_pengeluaran')
                .select('*')
                .order('tanggal', { ascending: false })

            if (bulan && tahun) {
                const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
                // Handle end of month correctly
                const endDate = new Date(tahun, bulan, 0).toISOString().split('T')[0]
                query = query.gte('tanggal', startDate).lte('tanggal', endDate)
            }

            // Optional: Date range override if provided
            if (dateFrom) query = query.gte('tanggal', dateFrom)
            if (dateTo) query = query.lte('tanggal', dateTo)

            const { data, error } = await query
            if (error) throw error
            return data
        },
        {
            staleTime: 60 * 1000, // 1 minute for financial data
        }
    )
}
