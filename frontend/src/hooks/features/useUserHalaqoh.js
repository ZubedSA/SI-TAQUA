import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

/**
 * Hook untuk AUTO-FILTER data berdasarkan halaqoh akun
 * PRINSIP: Halaqoh adalah ATRIBUT AKUN, bukan input user
 */
export const useUserHalaqoh = () => {
    const { userProfile, isAdmin } = useAuth()
    const [halaqohIds, setHalaqohIds] = useState([])
    const [halaqohList, setHalaqohList] = useState([]) // Array of {id, nama}
    const [selectedHalaqohId, setSelectedHalaqohId] = useState('')
    const [musyrifInfo, setMusyrifInfo] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchUserHalaqoh()
    }, [userProfile?.user_id, userProfile?.activeRole, isAdmin])

    const fetchUserHalaqoh = async () => {
        setIsLoading(true)
        try {
            // Jika ADMIN: Fetch SEMUA halaqoh
            if (isAdmin()) {
                const { data: allHalaqoh, error: adminError } = await supabase
                    .from('halaqoh')
                    .select('id, nama, musyrif_id, guru:musyrif_id(nama)')
                    .order('nama')

                if (adminError) throw adminError

                const formattedList = allHalaqoh.map(h => ({
                    id: h.id,
                    nama: h.nama,
                    musyrif_id: h.musyrif_id,
                    musyrif_nama: h.guru?.nama
                }))

                setHalaqohList(formattedList)
                setHalaqohIds(formattedList.map(h => h.id))

                // Default: Pilih halaqoh pertama jika belum ada yang dipilih
                // Atau biarkan kosong jika ingin opsi "Semua" (tapi requirement user bilang default harus ada value)
                if (formattedList.length > 0 && !selectedHalaqohId) {
                    // For Admin, we might want separate logic, but let's default to first for consistent initial state
                    // Or enable "All" option management in UI. 
                    // Let's set first one to be safe, user can change.
                    setSelectedHalaqohId(formattedList[0].id)
                }

                setIsLoading(false)
                return
            }

            // Jika MUSYRIF: Fetch ONLY Linked Halaqoh
            if (!userProfile?.user_id) {
                setIsLoading(false)
                return
            }

            // Step 1: Fetch halaqoh_id dari musyrif_halaqoh
            const { data: linkedHalaqoh, error: linkError } = await supabase
                .from('musyrif_halaqoh')
                .select('halaqoh_id')
                .eq('user_id', userProfile.user_id)

            if (linkError) throw linkError

            if (linkedHalaqoh && linkedHalaqoh.length > 0) {
                const ids = linkedHalaqoh.map(h => h.halaqoh_id)
                setHalaqohIds(ids)

                // Step 2: Fetch halaqoh names + musyrif via RPC or direct query
                // Using RPC as before for consistency
                const { data: halaqohData, error: rpcError } = await supabase
                    .rpc('get_halaqoh_names', { halaqoh_ids: ids })

                if (!rpcError && halaqohData && halaqohData.length > 0) {
                    setHalaqohList(halaqohData)

                    // Default selection Logic
                    if (!selectedHalaqohId) {
                        setSelectedHalaqohId(halaqohData[0].id)
                    }

                    // Set musyrif info (only relevant if single, or derived from selected)
                    // We'll update musyrifInfo based on selection below
                } else {
                    setHalaqohList([])
                    setMusyrifInfo(null)
                }
            } else {
                setHalaqohIds([])
                setHalaqohList([])
                setMusyrifInfo(null)
            }
        } catch (error) {
            console.error('Error fetching halaqoh:', error)
            setHalaqohIds([])
            setHalaqohList([])
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
        isAdmin: isAdmin(),
        refreshHalaqoh: fetchUserHalaqoh,
        selectedHalaqohId,
        setSelectedHalaqohId
    }
}

export default useUserHalaqoh
