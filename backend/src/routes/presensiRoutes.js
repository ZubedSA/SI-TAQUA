import express from 'express'
import { supabase, isDemoMode } from '../config/supabase.js'

const router = express.Router()

// Demo data
let demoPresensi = []

// Get presensi by date
router.get('/', async (req, res) => {
    try {
        const { tanggal } = req.query

        if (isDemoMode) {
            const filtered = tanggal
                ? demoPresensi.filter(p => p.tanggal === tanggal)
                : demoPresensi
            return res.json(filtered)
        }

        let query = supabase
            .from('presensi')
            .select('*, santri:santri_id(nama)')
            .order('tanggal', { ascending: false })

        if (tanggal) {
            query = query.eq('tanggal', tanggal)
        }

        const { data, error } = await query
        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get rekap presensi by month
router.get('/rekap', async (req, res) => {
    try {
        const { bulan, tahun } = req.query

        if (isDemoMode) {
            return res.json({
                hadir: 20,
                izin: 2,
                sakit: 3,
                alpha: 1
            })
        }

        const startDate = `${tahun}-${bulan.padStart(2, '0')}-01`
        const endDate = `${tahun}-${bulan.padStart(2, '0')}-31`

        const { data, error } = await supabase
            .from('presensi')
            .select('status')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)

        if (error) throw error

        const rekap = {
            hadir: data.filter(p => p.status === 'hadir').length,
            izin: data.filter(p => p.status === 'izin').length,
            sakit: data.filter(p => p.status === 'sakit').length,
            alpha: data.filter(p => p.status === 'alpha').length
        }

        res.json(rekap)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Create/Update presensi (batch)
router.post('/', async (req, res) => {
    try {
        const { tanggal, presensi } = req.body

        if (isDemoMode) {
            // Remove existing presensi for the date
            demoPresensi = demoPresensi.filter(p => p.tanggal !== tanggal)
            // Add new presensi
            const newPresensi = presensi.map((p, i) => ({
                id: Date.now() + i,
                tanggal,
                ...p
            }))
            demoPresensi.push(...newPresensi)
            return res.status(201).json(newPresensi)
        }

        // Delete existing presensi for the date
        await supabase.from('presensi').delete().eq('tanggal', tanggal)

        // Insert new presensi
        const presensiData = presensi.map(p => ({
            tanggal,
            santri_id: p.santri_id,
            status: p.status,
            keterangan: p.keterangan || null
        }))

        const { data, error } = await supabase
            .from('presensi')
            .insert(presensiData)
            .select()

        if (error) throw error
        res.status(201).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router
