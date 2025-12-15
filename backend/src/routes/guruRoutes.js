import express from 'express'
import { supabase, isDemoMode } from '../config/supabase.js'

const router = express.Router()

// Demo data
let demoGuru = [
    { id: 1, nip: 'G001', nama: 'Ustadz Ahmad Hidayat', jenis_kelamin: 'Laki-laki', jabatan: 'Pengajar', status: 'Aktif' },
    { id: 2, nip: 'G002', nama: 'Ustadz Muhammad Faisal', jenis_kelamin: 'Laki-laki', jabatan: 'Wali Kelas', status: 'Aktif' }
]

// Get all guru
router.get('/', async (req, res) => {
    try {
        if (isDemoMode) {
            return res.json(demoGuru)
        }

        const { data, error } = await supabase
            .from('guru')
            .select('*')
            .order('nama')

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get guru by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (isDemoMode) {
            const guru = demoGuru.find(g => g.id === parseInt(id))
            if (!guru) return res.status(404).json({ error: 'Guru not found' })
            return res.json(guru)
        }

        const { data, error } = await supabase
            .from('guru')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Create guru
router.post('/', async (req, res) => {
    try {
        const guruData = req.body

        if (isDemoMode) {
            const newGuru = { id: Date.now(), ...guruData }
            demoGuru.push(newGuru)
            return res.status(201).json(newGuru)
        }

        const { data, error } = await supabase
            .from('guru')
            .insert([guruData])
            .select()
            .single()

        if (error) throw error
        res.status(201).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Update guru
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const guruData = req.body

        if (isDemoMode) {
            const index = demoGuru.findIndex(g => g.id === parseInt(id))
            if (index === -1) return res.status(404).json({ error: 'Guru not found' })
            demoGuru[index] = { ...demoGuru[index], ...guruData }
            return res.json(demoGuru[index])
        }

        const { data, error } = await supabase
            .from('guru')
            .update(guruData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Delete guru
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (isDemoMode) {
            demoGuru = demoGuru.filter(g => g.id !== parseInt(id))
            return res.json({ message: 'Guru deleted' })
        }

        const { error } = await supabase
            .from('guru')
            .delete()
            .eq('id', id)

        if (error) throw error
        res.json({ message: 'Guru deleted' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router
