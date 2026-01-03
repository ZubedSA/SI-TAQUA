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
    const [halaqohList, setHalaqohList] = useState([])
    const [musyrifInfo, setMusyrifInfo] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchUserHalaqoh()
    }, [userProfile?.user_id])

    const fetchUserHalaqoh = async () => {
        if (!userProfile?.user_id) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        try {
            const adminCheck = isAdmin()

            if (adminCheck) {
                setHalaqohIds([])
                setHalaqohList([])
                setMusyrifInfo(null)
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

                // Step 2: Fetch halaqoh names + musyrif via RPC
                const { data: halaqohData, error: rpcError } = await supabase
                    .rpc('get_halaqoh_names', { halaqoh_ids: ids })

                if (!rpcError && halaqohData && halaqohData.length > 0) {
                    setHalaqohList(halaqohData)

                    // Set musyrif info dari halaqoh pertama
                    const firstHalaqoh = halaqohData[0]
                    if (firstHalaqoh.musyrif_id) {
                        setMusyrifInfo({
                            id: firstHalaqoh.musyrif_id,
                            nama: firstHalaqoh.musyrif_nama
                        })
                    }
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
            console.error('Error:', error)
            setHalaqohIds([])
            setHalaqohList([])
            setMusyrifInfo(null)
        } finally {
            setIsLoading(false)
        }
    }

    const halaqohNames = useMemo(() => {
        if (halaqohList.length > 0) {
            return halaqohList.map(h => h.nama).join(', ')
        }
        if (halaqohIds.length > 0) {
            return `${halaqohIds.length} Halaqoh Terhubung`
        }
        return ''
    }, [halaqohList, halaqohIds])

    return {
        halaqohIds,
        halaqohList,
        halaqohNames,
        musyrifInfo,
        isLoading,
        hasHalaqoh: halaqohIds.length > 0 || isAdmin(),
        isRestricted: !isAdmin() && halaqohIds.length > 0,
        isAdmin: isAdmin(),
        refreshHalaqoh: fetchUserHalaqoh
    }
}

export default useUserHalaqoh
