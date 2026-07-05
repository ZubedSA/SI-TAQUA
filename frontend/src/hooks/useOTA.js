import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useOrangTuaAsuh = (status = true) => {
    return useQuery({
        queryKey: ['orang_tua_asuh', status],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orang_tua_asuh')
                .select('*')
                .eq('status', status)
                .order('nama')
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000 // 5 min
    })
}

export const useOTAPemasukan = () => {
    return useQuery({
        queryKey: ['ota_pemasukan'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ota_pemasukan')
                .select('*, ota:orang_tua_asuh!ota_id(id, nama, no_hp)')
                .order('tanggal', { ascending: false })
            if (error) throw error
            return data
        },
        staleTime: 30 * 1000 // 30s
    })
}

export const useOTAPenyaluran = () => {
    return useQuery({
        queryKey: ['ota_penyaluran'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ota_penyaluran')
                .select('*, santri:santri!santri_id(id, nama, nis)')
                .order('tanggal', { ascending: false })
            if (error) throw error
            return data
        },
        staleTime: 30 * 1000
    })
}
