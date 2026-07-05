import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useKategoriPembayaran = (type = 'pembayaran') => {
    return useQuery({
        queryKey: ['kategori_pembayaran', type],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('kategori_pembayaran')
                .select('*')
                .eq('tipe', type)
                .eq('is_active', true)
                .order('nama')
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000
    })
}

export const useTagihanSantri = ({ santriId, status } = {}) => {
    return useQuery({
        queryKey: ['tagihan_santri', { santriId, status }],
        queryFn: async () => {
            let query = supabase
                .from('tagihan_santri')
                .select(`
          *,
          santri:santri!santri_id(nama, nis, kelas:kelas!kelas_id(nama)),
          kategori:kategori_pembayaran!kategori_id(nama, nominal)
        `)
                .order('created_at', { ascending: false })

            if (santriId) query = query.eq('santri_id', santriId)
            if (status) query = query.eq('status', status)

            const { data, error } = await query
            if (error) throw error
            return data
        },
        staleTime: 30 * 1000 // 30s
    })
}

export const useKas = ({ type, month, year }) => {
    return useQuery({
        queryKey: [`kas_${type}`, { month, year }],
        queryFn: async () => {
            const table = type === 'pemasukan' ? 'kas_pemasukan' : 'kas_pengeluaran'
            let query = supabase
                .from(table)
                .select('*')
                .order('tanggal', { ascending: false })

            if (month && year) {
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`
                const endDate = new Date(year, month, 0).toISOString().split('T')[0]
                query = query.gte('tanggal', startDate).lte('tanggal', endDate)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        staleTime: 30 * 1000
    })
}
