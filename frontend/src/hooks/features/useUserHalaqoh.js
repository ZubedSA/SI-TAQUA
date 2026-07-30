import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

/**
 * Hook untuk AUTO-FILTER data berdasarkan halaqoh akun Musyrif
 * PRINSIP: Halaqoh disaring ketat berdasarkan penugasan musyrif_id di database
 */
export const useUserHalaqoh = () => {
    const { user, userProfile, isAdmin, isAdminAkademik } = useAuth()
    const [halaqohIds, setHalaqohIds] = useState([])
    const [halaqohList, setHalaqohList] = useState([]) // Array of {id, nama}
    const [selectedHalaqohId, setSelectedHalaqohId] = useState('')
    const [musyrifInfo, setMusyrifInfo] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchUserHalaqoh()
    }, [userProfile?.user_id, userProfile?.activeRole, user?.id, isAdmin, isAdminAkademik])

    const fetchUserHalaqoh = async () => {
        setIsLoading(true)
        try {
            const adminRole = (isAdmin && isAdmin()) || 
                (isAdminAkademik && isAdminAkademik()) ||
                ['admin', 'admin_akademik'].includes(userProfile?.activeRole) || 
                ['admin', 'admin_akademik'].includes(userProfile?.role) ||
                userProfile?.roles?.includes('admin') ||
                userProfile?.roles?.includes('admin_akademik')

            // A. Jika ADMIN: Fetch SEMUA halaqoh
            if (adminRole) {
                const { data: allHalaqoh, error: adminError } = await supabase
                    .from('halaqoh')
                    .select('id, nama, musyrif_id, guru:musyrif_id(nama)')
                    .order('nama')

                if (adminError) throw adminError

                const formattedList = (allHalaqoh || []).map(h => ({
                    id: h.id,
                    nama: h.nama,
                    musyrif_id: h.musyrif_id,
                    musyrif_nama: h.guru?.nama
                }))

                setHalaqohList(formattedList)
                setHalaqohIds(formattedList.map(h => h.id))

                if (formattedList.length > 0 && !selectedHalaqohId) {
                    setSelectedHalaqohId(formattedList[0].id)
                }

                setIsLoading(false)
                return
            }

            // B. Jika MUSYRIF / GURU (Non-Admin): Fetch ONLY Linked/Assigned Halaqoh
            const email = userProfile?.email || user?.email
            const userId = userProfile?.user_id || user?.id

            let guruId = null
            let guruNama = ''

            if (email) {
                const { data: gEmail } = await supabase
                    .from('guru')
                    .select('id, nama')
                    .eq('email', email)
                    .maybeSingle()
                if (gEmail) {
                    guruId = gEmail.id
                    guruNama = gEmail.nama
                }
            }

            if (!guruId && userId) {
                const { data: gUser } = await supabase
                    .from('guru')
                    .select('id, nama')
                    .eq('user_id', userId)
                    .maybeSingle()
                if (gUser) {
                    guruId = gUser.id
                    guruNama = gUser.nama
                }
            }

            let foundHalaqohIds = []

            // 1. Direct check on halaqoh table (musyrif_id)
            if (guruId) {
                const { data: directHalaqoh } = await supabase
                    .from('halaqoh')
                    .select('id, nama')
                    .eq('musyrif_id', guruId)

                if (directHalaqoh) {
                    directHalaqoh.forEach(h => foundHalaqohIds.push(h.id))
                }
            }

            // 2. Relation check on musyrif_halaqoh table
            if (userId || guruId) {
                let linkQuery = supabase.from('musyrif_halaqoh').select('halaqoh_id')
                if (userId) linkQuery = linkQuery.eq('user_id', userId)

                const { data: linkedHalaqoh } = await linkQuery
                if (linkedHalaqoh) {
                    linkedHalaqoh.forEach(h => foundHalaqohIds.push(h.halaqoh_id))
                }
            }

            foundHalaqohIds = [...new Set(foundHalaqohIds)]

            if (foundHalaqohIds.length > 0) {
                const { data: halaqohData } = await supabase
                    .from('halaqoh')
                    .select('id, nama, musyrif_id, guru:musyrif_id(nama)')
                    .in('id', foundHalaqohIds)
                    .order('nama')

                const formattedList = (halaqohData || []).map(h => ({
                    id: h.id,
                    nama: h.nama,
                    musyrif_id: h.musyrif_id,
                    musyrif_nama: h.guru?.nama || guruNama
                }))

                setHalaqohList(formattedList)
                setHalaqohIds(foundHalaqohIds)

                if (!selectedHalaqohId || !foundHalaqohIds.includes(selectedHalaqohId)) {
                    setSelectedHalaqohId(formattedList[0].id)
                }
            } else {
                setHalaqohIds([])
                setHalaqohList([])
                setSelectedHalaqohId('')
                setMusyrifInfo(null)
            }
        } catch (error) {
            console.error('Error fetching user halaqoh:', error)
            setHalaqohIds([])
            setHalaqohList([])
            setSelectedHalaqohId('')
        } finally {
            setIsLoading(false)
        }
    }

    // Derived Musyrif Info based on SELECTION
    useEffect(() => {
        if (selectedHalaqohId && halaqohList.length > 0) {
            const selected = halaqohList.find(h => h.id === selectedHalaqohId)
            if (selected) {
                setMusyrifInfo({
                    id: selected.musyrif_id,
                    nama: selected.musyrif_nama
                })
            }
        } else {
            setMusyrifInfo(null)
        }
    }, [selectedHalaqohId, halaqohList])

    const halaqohNames = useMemo(() => {
        if (selectedHalaqohId) {
            const selected = halaqohList.find(h => h.id === selectedHalaqohId)
            return selected ? selected.nama : ''
        }
        if (halaqohList.length > 0) {
            return halaqohList.map(h => h.nama).join(', ')
        }
        return ''
    }, [halaqohList, selectedHalaqohId])

    return {
        halaqohIds,
        halaqohList,
        halaqohNames,
        musyrifInfo,
        isLoading,
        hasHalaqoh: halaqohList.length > 0,
        isAdmin: isAdmin() || isAdminAkademik(),
        refreshHalaqoh: fetchUserHalaqoh,
        selectedHalaqohId,
        setSelectedHalaqohId
    }
}

export default useUserHalaqoh
