import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const normalizeName = (str) => {
    if (!str) return ''
    return str
        .toLowerCase()
        .replace(/^(ustadz|ustadzah|ust|ustd|kiai|kyai|drs|dr|h|hj)\.?\s+/gi, '')
        .replace(/,?\s*(s\.pd|m\.pd|s\.ag|m\.ag|lc|m\.a|s\.h|h)\.?$/gi, '')
        .replace(/[^a-z0-9]/g, '')
}

const matchNames = (name1, name2) => {
    if (!name1 || !name2) return false
    const n1 = normalizeName(name1)
    const n2 = normalizeName(name2)
    if (!n1 || !n2) return false
    return n1 === n2 || (n1.length > 3 && n2.length > 3 && (n1.includes(n2) || n2.includes(n1)))
}

/**
 * Hook untuk AUTO-FILTER data berdasarkan halaqoh akun Musyrif
 * PRINSIP: Musyrif TIDAK DIBATASI pada halaqoh binaan sendiri / terhubung.
 * Musyrif DIBATASI (Read-Only) pada halaqoh lain yang tidak terhubung.
 */
export const useUserHalaqoh = () => {
    const { user, userProfile, isAdmin, isAdminAkademik } = useAuth()
    const [halaqohIds, setHalaqohIds] = useState([])
    const [halaqohList, setHalaqohList] = useState([]) // Array of {id, nama, isMine, musyrif_nama}
    const [selectedHalaqohId, setSelectedHalaqohId] = useState('')
    const [musyrifInfo, setMusyrifInfo] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchUserHalaqoh()
    }, [
        userProfile?.user_id,
        userProfile?.id,
        userProfile?.nama,
        userProfile?.activeRole,
        userProfile?.email,
        user?.id,
        user?.email,
        isAdmin,
        isAdminAkademik
    ])

    const fetchUserHalaqoh = async () => {
        setIsLoading(true)
        try {
            const adminRole = (isAdmin && isAdmin()) || 
                (isAdminAkademik && isAdminAkademik()) ||
                ['admin', 'admin_akademik'].includes(userProfile?.activeRole) || 
                ['admin', 'admin_akademik'].includes(userProfile?.role) ||
                userProfile?.roles?.includes('admin') ||
                userProfile?.roles?.includes('admin_akademik')

            const [hRes, mhRes, gRes, pRes] = await Promise.all([
                supabase.from('halaqoh').select('id, nama, musyrif_id, guru:musyrif_id(nama)').order('nama'),
                supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id'),
                supabase.from('guru').select('id, nama, user_id, email'),
                supabase.from('user_profiles').select('id, user_id, nama, email, guru_id')
            ])

            const allHalaqoh = hRes.data || []
            const mhLinks = mhRes.data || []
            const guruList = gRes.data || []
            const profileList = pRes.data || []

            console.log('🔍 [useUserHalaqoh DEBUG]', {
                userAuthId: user?.id,
                userProfileId: userProfile?.id,
                userProfileUserId: userProfile?.user_id,
                userProfileNama: userProfile?.nama,
                userProfileEmail: userProfile?.email,
                activeRole: userProfile?.activeRole,
                role: userProfile?.role,
                roles: userProfile?.roles,
                adminRole,
                allHalaqohCount: allHalaqoh.length,
                mhLinks,
                guruListCount: guruList.length,
                profileListCount: profileList.length
            })

            // A. Jika ADMIN: Semua halaqoh isMine = true
            if (adminRole) {
                const formattedList = allHalaqoh.map(h => ({
                    id: h.id,
                    nama: h.nama,
                    musyrif_id: h.musyrif_id,
                    musyrif_nama: h.guru?.nama || null,
                    isMine: true
                }))

                setHalaqohList(formattedList)
                setHalaqohIds(formattedList.map(h => h.id))

                if (formattedList.length > 0 && !selectedHalaqohId) {
                    setSelectedHalaqohId(formattedList[0].id)
                }

                setIsLoading(false)
                return
            }

            // B. Jika MUSYRIF / GURU (Non-Admin): Evaluate isMine per halaqoh
            const userEmail = (userProfile?.email || user?.email || '').trim().toLowerCase()
            const authUserId = (user?.id || userProfile?.user_id || '').trim().toLowerCase()

            const currentProfile = profileList.find(p => {
                if (authUserId) {
                    if (p.user_id && String(p.user_id).trim().toLowerCase() === authUserId) return true
                    if (p.id && String(p.id).trim().toLowerCase() === authUserId) return true
                }
                if (userEmail && p.email?.trim().toLowerCase() === userEmail) return true
                return false
            }) || userProfile

            const userNames = [
                currentProfile?.nama,
                userProfile?.nama,
                userProfile?.full_name,
                user?.email?.split('@')[0]
            ].filter(Boolean)

            const guruData = guruList.find(g => {
                if (currentProfile?.guru_id && String(g.id).trim().toLowerCase() === String(currentProfile.guru_id).trim().toLowerCase()) return true
                if (authUserId && g.user_id && String(g.user_id).trim().toLowerCase() === authUserId) return true
                if (userEmail && g.email && g.email.trim().toLowerCase() === userEmail) return true
                if (g.nama && userNames.some(name => matchNames(g.nama, name))) return true
                return false
            })

            const rawUserIds = [
                user?.id,
                userProfile?.id,
                userProfile?.user_id,
                currentProfile?.id,
                currentProfile?.user_id,
                currentProfile?.guru_id,
                guruData?.id,
                guruData?.user_id
            ]

            const matchingProfiles = profileList.filter(p => 
                p.nama && userNames.some(name => matchNames(p.nama, name))
            )
            matchingProfiles.forEach(p => {
                if (p.id) rawUserIds.push(p.id)
                if (p.user_id) rawUserIds.push(p.user_id)
                if (p.guru_id) rawUserIds.push(p.guru_id)
            })

            const finalUserIds = [...new Set(rawUserIds.filter(Boolean).map(id => String(id).trim().toLowerCase()))]

            console.log('🔍 [useUserHalaqoh RESOLVED IDENTITY]', {
                userNames,
                guruDataFound: guruData,
                finalUserIds
            })

            const formattedList = allHalaqoh.map(h => {
                const musyrifIdStr = h.musyrif_id ? String(h.musyrif_id).trim().toLowerCase() : ''
                const isDirectMatch = musyrifIdStr && finalUserIds.includes(musyrifIdStr)
                const isNameMatch = h.guru?.nama && userNames.some(name => matchNames(h.guru.nama, name))
                
                const isJunctionMatch = mhLinks.some(mh => {
                    if (String(mh.halaqoh_id) !== String(h.id)) return false
                    
                    const mhUserIdStr = mh.user_id ? String(mh.user_id).trim().toLowerCase() : ''
                    const mhMusyrifIdStr = mh.musyrif_id ? String(mh.musyrif_id).trim().toLowerCase() : ''

                    if (mhUserIdStr && finalUserIds.includes(mhUserIdStr)) return true
                    if (mhMusyrifIdStr && finalUserIds.includes(mhMusyrifIdStr)) return true

                    const linkedProfile = profileList.find(p => 
                        (p.id && mhUserIdStr && String(p.id).trim().toLowerCase() === mhUserIdStr) || 
                        (p.user_id && mhUserIdStr && String(p.user_id).trim().toLowerCase() === mhUserIdStr)
                    )
                    if (linkedProfile?.nama && userNames.some(name => matchNames(linkedProfile.nama, name))) return true

                    const linkedGuru = guruList.find(g => 
                        (g.id && (mhMusyrifIdStr || mhUserIdStr) && (String(g.id).trim().toLowerCase() === mhMusyrifIdStr || String(g.id).trim().toLowerCase() === mhUserIdStr)) ||
                        (g.user_id && mhUserIdStr && String(g.user_id).trim().toLowerCase() === mhUserIdStr)
                    )
                    if (linkedGuru?.nama && userNames.some(name => matchNames(linkedGuru.nama, name))) return true

                    return false
                })

                const isMine = Boolean(isDirectMatch || isNameMatch || isJunctionMatch)

                return {
                    id: h.id,
                    nama: h.nama,
                    musyrif_id: h.musyrif_id,
                    musyrif_nama: h.guru?.nama || guruData?.nama || currentProfile?.nama || userProfile?.nama || '',
                    isMine
                }
            })

            console.log('🔍 [useUserHalaqoh EVALUATED HALAQOHS]', formattedList)

            const myHalaqohs = formattedList.filter(h => h.isMine)
            setHalaqohList(myHalaqohs)
            setHalaqohIds(myHalaqohs.map(h => h.id))

            if (myHalaqohs.length > 0) {
                if (!selectedHalaqohId || !myHalaqohs.some(h => h.id === selectedHalaqohId)) {
                    setSelectedHalaqohId(myHalaqohs[0].id)
                }
            } else {
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
                    nama: selected.musyrif_nama,
                    isMine: selected.isMine
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

    const selectedHalaqohObj = useMemo(() => {
        return halaqohList.find(h => h.id === selectedHalaqohId) || null
    }, [halaqohList, selectedHalaqohId])

    const isCurrentHalaqohMine = useMemo(() => {
        const adminRole = (isAdmin && isAdmin()) || (isAdminAkademik && isAdminAkademik())
        if (adminRole) return true
        return Boolean(selectedHalaqohObj?.isMine)
    }, [selectedHalaqohObj, isAdmin, isAdminAkademik])

    const myHalaqohCount = useMemo(() => {
        return halaqohList.filter(h => h.isMine).length
    }, [halaqohList])

    return {
        halaqohIds,
        halaqohList,
        myHalaqohCount,
        halaqohNames,
        musyrifInfo,
        isLoading,
        hasHalaqoh: halaqohList.length > 0,
        hasAssignedHalaqoh: myHalaqohCount > 0,
        isCurrentHalaqohMine,
        isAdmin: (isAdmin && isAdmin()) || (isAdminAkademik && isAdminAkademik()),
        refreshHalaqoh: fetchUserHalaqoh,
        selectedHalaqohId,
        setSelectedHalaqohId
    }
}

export default useUserHalaqoh
