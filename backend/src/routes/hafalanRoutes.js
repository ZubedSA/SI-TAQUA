import express from 'express'
import { supabase, isDemoMode } from '../config/supabase.js'

const router = express.Router()

// Demo data
let demoHafalan = [
    { id: 1, santri_id: 1, juz: 2, surah: 'Al-Baqarah', ayat_mulai: 1, ayat_selesai: 50, status: 'Mutqin', tanggal: '2024-01-15' },
    { id: 2, santri_id: 2, juz: 30, surah: 'An-Naba', ayat_mulai: 1, ayat_selesai: 40, status: 'Proses', tanggal: '2024-01-20' }
]

// Get all hafalan
router.get('/', async (req, res) => {
    try {
        if (isDemoMode) {
            return res.json(demoHafalan)
        }

        const { data, error } = await supabase
            .from('hafalan')
            .select('*, santri:santri_id(nama)')
            .order('tanggal', { ascending: false })

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get hafalan by santri
router.get('/santri/:santriId', async (req, res) => {
    try {
        const { santriId } = req.params

        if (isDemoMode) {
            const hafalan = demoHafalan.filter(h => h.santri_id === parseInt(santriId))
            return res.json(hafalan)
        }

        const { data, error } = await supabase
            .from('hafalan')
            .select('*')
            .eq('santri_id', santriId)
            .order('tanggal', { ascending: false })

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get hafalan progress
router.get('/progress', async (req, res) => {
    try {
        if (isDemoMode) {
            return res.json([
                { juz: 2, mutqin: 1, total: 1 },
                { juz: 30, mutqin: 0, total: 1 }
            ])
        }

        // Get summary of mutqin per juz
        const { data, error } = await supabase
            .from('hafalan')
            .select('juz, status')

        if (error) throw error

        // Calculate progress
        const progressMap = {}
        data.forEach(h => {
            if (!progressMap[h.juz]) {
                progressMap[h.juz] = { juz: h.juz, mutqin: 0, total: 0 }
            }
            progressMap[h.juz].total++
            if (h.status === 'Mutqin') {
                progressMap[h.juz].mutqin++
            }
        })

        res.json(Object.values(progressMap))
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Create hafalan
router.post('/', async (req, res) => {
    try {
        const hafalanData = req.body

        if (isDemoMode) {
            const newHafalan = { id: Date.now(), ...hafalanData }
            demoHafalan.push(newHafalan)
            return res.status(201).json(newHafalan)
        }

        const { data, error } = await supabase
            .from('hafalan')
            .insert([hafalanData])
            .select()
            .single()

        if (error) throw error
        res.status(201).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Update hafalan
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const hafalanData = req.body

        if (isDemoMode) {
            const index = demoHafalan.findIndex(h => h.id === parseInt(id))
            if (index === -1) return res.status(404).json({ error: 'Hafalan not found' })
            demoHafalan[index] = { ...demoHafalan[index], ...hafalanData }
            return res.json(demoHafalan[index])
        }

        const { data, error } = await supabase
            .from('hafalan')
            .update(hafalanData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Delete hafalan
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (isDemoMode) {
            demoHafalan = demoHafalan.filter(h => h.id !== parseInt(id))
            return res.json({ message: 'Hafalan deleted' })
        }

        const { error } = await supabase
            .from('hafalan')
            .delete()
            .eq('id', id)

        if (error) throw error
        res.json({ message: 'Hafalan deleted' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router
