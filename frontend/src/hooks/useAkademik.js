import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

// Global cache for lookups to avoid redundant fetches across all hooks
let lookupCache = {
    data: null,
    promise: null,
    lastFetched: 0
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const getLookups = async () => {
    const now = Date.now()
    if (lookupCache.data && (now - lookupCache.lastFetched < CACHE_DURATION)) {
        return lookupCache.data
    }

    if (lookupCache.promise) return lookupCache.promise

    lookupCache.promise = (async () => {
        try {
            const [kelasRes, mapelRes, guruRes, halaqohRes, angkatanRes] = await Promise.all([
                supabase.from('kelas').select('id, nama'),
                supabase.from('mapel').select('id, nama, kode'),
                supabase.from('guru').select('id, nama'),
                supabase.from('halaqoh').select('id, nama'),
                supabase.from('angkatan').select('id, nama')
            ])

            const data = {
                kelas: (kelasRes.data || []).reduce((acc, k) => ({ ...acc, [k.id]: k }), {}),
                mapel: (mapelRes.data || []).reduce((acc, m) => ({ ...acc, [m.id]: m }), {}),
                guru: (guruRes.data || []).reduce((acc, g) => ({ ...acc, [g.id]: g }), {}),
                halaqoh: (halaqohRes.data || []).reduce((acc, h) => ({ ...acc, [h.id]: h }), {}),
                angkatan: (angkatanRes.data || []).reduce((acc, a) => ({ ...acc, [a.id]: a.nama }), {})
            }

            lookupCache.data = data
            lookupCache.lastFetched = Date.now()
            lookupCache.promise = null
            return data
        } catch (err) {
            lookupCache.promise = null
            throw err
        }
    })()

    return lookupCache.promise
}

// Helper to manually join relations to avoid 400 Bad Request join errors
const manualJoin = async (data, table) => {
    if (!data || data.length === 0) return []
    
    try {
        const maps = await getLookups()

        return data.map(item => ({
            ...item,
            kelas: maps.kelas[item.kelas_id] || null,
            mapel: maps.mapel[item.mapel_id] || null,
            guru: maps.guru[item.guru_id] || null,
            halaqoh: maps.halaqoh[item.halaqoh_id] || null
        }))
    } catch (err) {
        console.warn('Manual join failed:', err)
        return data
    }
}

export const useSantri = (filters = {}) => {
    return useQuery({
        queryKey: ['santri', filters],
        queryFn: async () => {
            let query = supabase.from('santri').select('*').order('nama')
            if (filters.status) query = query.eq('status', filters.status)
            if (filters.kelas_id) query = query.eq('kelas_id', filters.kelas_id)
            if (filters.halaqoh_id) query = query.eq('halaqoh_id', filters.halaqoh_id)

            const { data, error } = await query
            if (error) throw error

            const maps = await getLookups()

            return (data || []).map(s => ({
                ...s,
                kelas: maps.kelas[s.kelas_id] || null,
                halaqoh: maps.halaqoh[s.halaqoh_id] || null,
                angkatan: s.angkatan_id ? { nama: maps.angkatan[s.angkatan_id] || '-' } : null
            }))
        },
        staleTime: 60 * 1000
    })
}

export const useHalaqoh = () => {
    return useQuery({
        queryKey: ['halaqoh'],
        queryFn: async () => {
            const { data, error } = await supabase.from('halaqoh').select('*').order('nama')
            if (error) throw error
            
            const maps = await getLookups()
            
            return data.map(h => ({ ...h, pengajar: maps.guru[h.musyrif_id] || null }))
        },
        staleTime: 30 * 1000
    })
}

export const useKelas = () => {
    return useQuery({
        queryKey: ['kelas'],
        queryFn: async () => {
            const { data, error } = await supabase.from('kelas').select('*').order('nama')
            if (error) throw error
            return data
        },
        staleTime: 30 * 1000
    })
}

export const useMapel = () => {
    return useQuery({
        queryKey: ['mapel'],
        queryFn: async () => {
            const { data, error } = await supabase.from('mapel').select('*').order('nama')
            if (error) throw error
            return data
        },
        staleTime: 30 * 1000
    })
}

export const useJadwal = (filters = {}) => {
    return useQuery({
        queryKey: ['jadwal', filters],
        queryFn: async () => {
            let query = supabase
                .from('jadwal_pelajaran')
                .select('*')
                .order('jam_ke')

            if (filters.kelas_id) query = query.eq('kelas_id', filters.kelas_id)
            if (filters.halaqoh_id) query = query.eq('halaqoh_id', filters.halaqoh_id)
            if (filters.tahun_ajaran) query = query.eq('tahun_ajaran', filters.tahun_ajaran)
            if (filters.tipe) query = query.eq('tipe', filters.tipe)

            const { data, error } = await query
            if (error) throw error
            
            if (!data || data.length === 0) return []

            // Manual Join
            return manualJoin(data, 'jadwal_pelajaran')
        },
        staleTime: 60 * 1000
    })
}

export const usePresensiHarian = (filters = {}) => {
    return useQuery({
        queryKey: ['presensi_harian', filters],
        queryFn: async () => {
            if (!filters.tanggal) return []
            let query = supabase.from('presensi').select('*').eq('tanggal', filters.tanggal)
            
            const { data, error } = await query
            if (error) throw error
            
            const { data: sData } = await supabase.from('santri').select('id, nama, nis, kelas_id, status')
            const santriMap = (sData || []).reduce((acc, s) => ({ ...acc, [s.id]: s }), {})
            
            let result = data.map(p => ({ ...p, santri: santriMap[p.santri_id] || null }))
            if (filters.kelas_id) result = result.filter(r => r.santri?.kelas_id === filters.kelas_id)
            return result
        },
        enabled: !!filters.tanggal,
        staleTime: 0
    })
}

export const useJurnal = (filters = {}) => {
    return useQuery({
        queryKey: ['jurnal', filters],
        queryFn: async () => {
            if (!filters.tanggal) return []

            const [y, m, d] = filters.tanggal.split('-').map(Number)
            const dateObj = new Date(y, m - 1, d)
            let dayName = format(dateObj, 'eeee', { locale: localeId })
            if (dayName === 'Minggu') dayName = 'Ahad'

            let query = supabase.from('jadwal_pelajaran').select('*').eq('hari', dayName).order('jam_ke')
            if (filters.guru_id) query = query.eq('guru_id', filters.guru_id)
            if (filters.tahun_ajaran) query = query.eq('tahun_ajaran', filters.tahun_ajaran)

            const { data: jadwalData, error: jadwalError } = await query
            if (jadwalError) throw jadwalError
            if (!jadwalData || jadwalData.length === 0) return []

            const joinedData = await manualJoin(jadwalData, 'jadwal_pelajaran')

            const { data: jurnalData } = await supabase
                .from('presensi_mapel')
                .select('*')
                .eq('tanggal', filters.tanggal)
                .in('jadwal_id', jadwalData.map(j => j.id))

            return joinedData.map(j => ({
                ...j,
                jurnal: (jurnalData || []).find(x => x.jadwal_id === j.id) || null
            }))
        },
        enabled: !!filters.tanggal,
        staleTime: 0
    })
}

export const useKalenderAkademik = (filters = {}) => {
    return useQuery({
        queryKey: ['kalender', filters],
        queryFn: async () => {
            let query = supabase.from('kalender_akademik').select('*').order('tanggal_mulai')
            if (filters.tahun) {
                const startYear = `${filters.tahun}-01-01`
                const endYear = `${filters.tahun}-12-31`
                query = query.gte('tanggal_selesai', startYear).lte('tanggal_mulai', endYear)
            }
            const { data, error } = await query
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000
    })
}

export const useTahunAjaran = () => {
    return useQuery({
        queryKey: ['tahun_ajaran'],
        queryFn: async () => {
            const { data, error } = await supabase.from('semester').select('tahun_ajaran').order('tahun_ajaran', { ascending: false })
            if (error) throw error
            const years = [...new Set(data.map(s => s.tahun_ajaran))].filter(Boolean)
            return years.length > 0 ? years : ['2023/2024', '2024/2025', '2025/2026']
        },
        staleTime: 1 * 60 * 1000
    })
}
