import express from 'express'
import { supabase, isDemoMode } from '../config/supabase.js'

const router = express.Router()

// Demo data
let demoKelas = [
    { id: 1, nama: 'VII A', tingkat: 7, tahun_ajaran: '2024/2025' },
    { id: 2, nama: 'VII B', tingkat: 7, tahun_ajaran: '2024/2025' },
    { id: 3, nama: 'VIII A', tingkat: 8, tahun_ajaran: '2024/2025' },
    { id: 4, nama: 'VIII B', tingkat: 8, tahun_ajaran: '2024/2025' }
]

// Get all kelas
router.get('/', async (req, res) => {
    try {
        if (isDemoMode) {
            return res.json(demoKelas)
        }

        const { data, error } = await supabase
            .from('kelas')
            .select('*, wali_kelas:wali_kelas_id(nama)')
            .order('tingkat')
            .order('nama')

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Create kelas
router.post('/', async (req, res) => {
    try {
        const kelasData = req.body

        if (isDemoMode) {
            const newKelas = { id: Date.now(), ...kelasData }
            demoKelas.push(newKelas)
            return res.status(201).json(newKelas)
        }

        const { data, error } = await supabase
            .from('kelas')
            .insert([kelasData])
            .select()
            .single()

        if (error) throw error
        res.status(201).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Update kelas
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const kelasData = req.body

        if (isDemoMode) {
            const index = demoKelas.findIndex(k => k.id === parseInt(id))
            if (index === -1) return res.status(404).json({ error: 'Kelas not found' })
            demoKelas[index] = { ...demoKelas[index], ...kelasData }
            return res.json(demoKelas[index])
        }

        const { data, error } = await supabase
            .from('kelas')
            .update(kelasData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Delete kelas
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (isDemoMode) {
            demoKelas = demoKelas.filter(k => k.id !== parseInt(id))
            return res.json({ message: 'Kelas deleted' })
        }

        const { error } = await supabase
            .from('kelas')
            .delete()
            .eq('id', id)

        if (error) throw error
        res.json({ message: 'Kelas deleted' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router
