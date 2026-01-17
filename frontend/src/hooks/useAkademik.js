import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useSantri = (filters = {}) => {
    return useQuery({
        queryKey: ['santri', filters],
        queryFn: async () => {
            let query = supabase
                .from('santri')
                .select(`
          *,
          kelas:kelas!kelas_id(nama),
          halaqoh:halaqoh!halaqoh_id(nama)
        `)
                .order('nama')

            if (filters.status) query = query.eq('status', filters.status)
            if (filters.kelas_id) query = query.eq('kelas_id', filters.kelas_id)
            if (filters.halaqoh_id) query = query.eq('halaqoh_id', filters.halaqoh_id)

            const [santriRes, angkatanRes] = await Promise.all([
                query,
                supabase.from('angkatan').select('id, nama')
            ])

            if (santriRes.error) throw santriRes.error

            const angkatanMap = (angkatanRes.data || []).reduce((acc, curr) => {
                acc[curr.id] = curr.nama
                return acc
            }, {})

            return (santriRes.data || []).map(s => ({
                ...s,
                angkatan: s.angkatan_id ? { nama: angkatanMap[s.angkatan_id] || '-' } : null
            }))
        },
        staleTime: 60 * 1000 // 1 minute
    })
}

export const useHalaqoh = () => {
    return useQuery({
        queryKey: ['halaqoh'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('halaqoh')
                .select('*, pengajar:guru!musyrif_id(nama)')
                .order('nama')
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000 // 5 minutes (Reference data)
    })
}

export const useKelas = () => {
    return useQuery({
        queryKey: ['kelas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('kelas')
                .select('*')
                .order('nama')
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000
    })
}

export const useMapel = () => {
    return useQuery({
        queryKey: ['mapel'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('mapel')
                .select('*')
                .order('nama')
            if (error) throw error
            return data
        },
        staleTime: 5 * 60 * 1000
    })
}

export const useJadwal = (filters = {}) => {
    return useQuery({
        queryKey: ['jadwal', filters],
        queryFn: async () => {
            let query = supabase
                .from('jadwal_pelajaran')
                .select(`
                    *,
                    kelas:kelas!kelas_id(nama),
                    mapel:mapel!mapel_id(nama, kode),
                    guru:guru!guru_id(nama)
                `)
                .order('hari')
                .order('jam_ke')

            if (filters.kelas_id) query = query.eq('kelas_id', filters.kelas_id)
            if (filters.guru_id) query = query.eq('guru_id', filters.guru_id)
            if (filters.tahun_ajaran) query = query.eq('tahun_ajaran', filters.tahun_ajaran)
            if (filters.hari) query = query.eq('hari', filters.hari)

            const { data, error } = await query
            if (error) throw error
            return data
        },
        staleTime: 60 * 1000
    })
}

export const usePresensiHarian = (filters = {}) => {
    return useQuery({
        queryKey: ['presensi_harian', filters],
        queryFn: async () => {
            if (!filters.tanggal) return []

            let query = supabase
                .from('presensi')
                .select(`
                    *,
                    santri:santri!santri_id(id, nama, nis, kelas_id, status)
                `)
                .eq('tanggal', filters.tanggal)

            // Note: We filter by class client-side or we must join santri and filter. 
            // Supabase filtering on joined table: !inner join if we want to filter by santri.kelas_id
            if (filters.kelas_id) {
                // We fetch all for the date, or we try inner join filter:
                query = supabase
                    .from('presensi')
                    .select(`
                    *,
                    santri:santri!inner(id, nama, nis, kelas_id, status)
                `)
                    .eq('tanggal', filters.tanggal)
                    .eq('santri.kelas_id', filters.kelas_id)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        enabled: !!filters.tanggal, // Only fetch if date is set
        staleTime: 0 // Always fresh for attendance
    })
}

export const useJurnal = (filters = {}) => {
    return useQuery({
        queryKey: ['jurnal', filters],
        queryFn: async () => {
            // 1. Get Schedules for the day/guru
            const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(filters.tanggal))

            let query = supabase
                .from('jadwal_pelajaran')
                .select(`
                    *,
                    kelas:kelas!kelas_id(nama),
                    mapel:mapel!mapel_id(nama, kode),
                    guru:guru!guru_id(nama)
                `)
                .eq('hari', dayName)
                .order('jam_ke')

            if (filters.guru_id) query = query.eq('guru_id', filters.guru_id)
            if (filters.kelas_id) query = query.eq('kelas_id', filters.kelas_id)

            const { data: jadwalData, error: jadwalError } = await query
            if (jadwalError) throw jadwalError

            if (!jadwalData || jadwalData.length === 0) return []

            // 2. Fetch existing Jurnal Headers (presensi_mapel) for this date & jadwal_ids
            const { data: jurnalData, error: jurnalError } = await supabase
                .from('presensi_mapel')
                .select('*')
                .eq('tanggal', filters.tanggal)
                .in('jadwal_id', jadwalData.map(j => j.id))

            if (jurnalError) throw jurnalError

            // 3. Merge
            return jadwalData.map(j => {
                const existing = jurnalData.find(x => x.jadwal_id === j.id)
                return {
                    ...j,
                    jurnal: existing || null // null means not yet filled
                }
            })
        },
        enabled: !!filters.tanggal,
        staleTime: 0
    })
}

export const useKalenderAkademik = (filters = {}) => {
    return useQuery({
        queryKey: ['kalender', filters],
        queryFn: async () => {
            let query = supabase
                .from('kalender_akademik')
                .select('*')
                .order('tanggal_mulai')

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
