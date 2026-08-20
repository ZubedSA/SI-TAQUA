import { useSupabaseQuery } from '../useSupabaseQuery'
import { supabase } from '../../lib/supabase'

export const useHalaqohList = () => {
    return useSupabaseQuery(
        ['halaqoh_with_musyrifs'],
        async () => {
            // 1. Fetch halaqoh with main guru
            const { data: halaqohs, error: halaqohError } = await supabase
                .from('halaqoh')
                .select(`
                    id,
                    nama,
                    musyrif_id,
                    guru:guru!musyrif_id (nama)
                `)
                .order('nama')

            if (halaqohError) throw halaqohError

            // 2. Fetch musyrif_halaqoh assignments, user profiles, and guru list in parallel
            const [assignRes, profileRes, guruRes] = await Promise.all([
                supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id'),
                supabase.from('user_profiles').select('user_id, nama, email, roles, role'),
                supabase.from('guru').select('id, nama, email').order('nama')
            ])

            if (assignRes.error) throw assignRes.error
            if (profileRes.error) throw profileRes.error

            const assignments = assignRes.data || []
            const profiles = profileRes.data || []

            // Filter profiles with role 'musyrif' or 'guru'
            const allMusyrifs = profiles.filter(u => {
                const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
                return roles.includes('musyrif') || roles.includes('guru');
            })

            // Map assignments to halaqohs
            const halaqohList = (halaqohs || []).map(h => {
                const halaqohAssigns = assignments.filter(a => String(a.halaqoh_id) === String(h.id))
                const assignedMusyrifs = halaqohAssigns.map(a => {
                    if (!a.user_id) return null
                    const targetId = String(a.user_id).trim().toLowerCase()
                    const prof = profiles.find(p => 
                        (p.user_id && String(p.user_id).trim().toLowerCase() === targetId) ||
                        (p.id && String(p.id).trim().toLowerCase() === targetId)
                    )
                    if (prof) return { user_id: prof.user_id || prof.id, nama: prof.nama, email: prof.email }

                    const g = (guruRes.data || []).find(g => 
                        (g.id && String(g.id).trim().toLowerCase() === targetId) ||
                        (g.user_id && String(g.user_id).trim().toLowerCase() === targetId)
                    )
                    if (g) return { user_id: g.user_id || g.id, nama: g.nama, email: g.email }

                    return null
                }).filter(Boolean)

                return {
                    ...h,
                    musyrifs: assignedMusyrifs
                }
            })

            return {
                halaqohList,
                musyrifList: allMusyrifs,
                guruList: guruRes.data || []
            }
        },
        {
            staleTime: 0, // Cache for 0 minutes to prevent stale data
        }
    )
}
