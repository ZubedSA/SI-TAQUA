import express from 'express'
import { supabase, isDemoMode } from '../config/supabase.js'

const router = express.Router()

// Demo data
let demoSantri = [
    { id: 1, nis: 'S001', nama: 'Ahmad Fauzi', jenis_kelamin: 'Laki-laki', kelas_id: 1, halaqoh_id: 1, status: 'Aktif' },
    { id: 2, nis: 'S002', nama: 'Muhammad Rizki', jenis_kelamin: 'Laki-laki', kelas_id: 2, halaqoh_id: 2, status: 'Aktif' }
]

// Get all santri
router.get('/', async (req, res) => {
    try {
        if (isDemoMode) {
            return res.json(demoSantri)
        }

        const { data, error } = await supabase
            .from('santri')
            .select('*, kelas:kelas_id(nama), halaqoh:halaqoh_id(nama)')
            .order('nama')

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get santri by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (isDemoMode) {
            const santri = demoSantri.find(s => s.id === parseInt(id))
            if (!santri) return res.status(404).json({ error: 'Santri not found' })
            return res.json(santri)
        }

        const { data, error } = await supabase
            .from('santri')
            .select('*, kelas:kelas_id(nama), halaqoh:halaqoh_id(nama)')
            .eq('id', id)
            .single()

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Create santri
router.post('/', async (req, res) => {
    try {
        const santriData = req.body

        if (isDemoMode) {
            const newSantri = { id: Date.now(), ...santriData }
            demoSantri.push(newSantri)
            return res.status(201).json(newSantri)
        }

        const { data, error } = await supabase
            .from('santri')
            .insert([santriData])
            .select()
            .single()

        if (error) throw error
        res.status(201).json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Update santri
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const santriData = req.body

        if (isDemoMode) {
            const index = demoSantri.findIndex(s => s.id === parseInt(id))
            if (index === -1) return res.status(404).json({ error: 'Santri not found' })
            demoSantri[index] = { ...demoSantri[index], ...santriData }
            return res.json(demoSantri[index])
        }

        const { data, error } = await supabase
            .from('santri')
            .update(santriData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Delete santri
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (isDemoMode) {
            demoSantri = demoSantri.filter(s => s.id !== parseInt(id))
            return res.json({ message: 'Santri deleted' })
        }

        const { error } = await supabase
            .from('santri')
            .delete()
            .eq('id', id)

        if (error) throw error
        res.json({ message: 'Santri deleted' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router
