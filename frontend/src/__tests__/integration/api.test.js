/**
 * Integration Test: API Operations
 * Menguji CRUD operations dengan mocked Supabase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Mock Data
// ============================================

const mockSantriList = [
    { id: '1', nis: '001', nama: 'Ahmad Fauzi', kelas_id: 'kelas-1', status: 'Aktif' },
    { id: '2', nis: '002', nama: 'Budi Santoso', kelas_id: 'kelas-1', status: 'Aktif' },
    { id: '3', nis: '003', nama: 'Candra Wijaya', kelas_id: 'kelas-2', status: 'Aktif' }
]

const mockGuruList = [
    { id: '1', nip: 'G001', nama: 'Ustadz Ahmad', jabatan: 'Pengajar', status: 'Aktif' },
    { id: '2', nip: 'G002', nama: 'Ustadzah Fatimah', jabatan: 'Wali Kelas', status: 'Aktif' }
]

// ============================================
// Mock Supabase for CRUD
// ============================================

const createMockSupabaseDB = () => {
    let santriData = [...mockSantriList]
    let guruData = [...mockGuruList]

    return {
        from: vi.fn((table) => {
            const data = table === 'santri' ? santriData : guruData

            return {
                // SELECT
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data, error: null }),
                    eq: vi.fn().mockImplementation((field, value) => ({
                        single: vi.fn().mockResolvedValue({
                            data: data.find(item => item[field] === value) || null,
                            error: data.find(item => item[field] === value) ? null : { message: 'Not found' }
                        }),
                        order: vi.fn().mockResolvedValue({
                            data: data.filter(item => item[field] === value),
                            error: null
                        })
                    })),
                    single: vi.fn().mockResolvedValue({ data: data[0], error: null })
                }),

                // INSERT
                insert: vi.fn().mockImplementation((newData) => {
                    const dataArray = Array.isArray(newData) ? newData : [newData]
                    const insertedItems = dataArray.map((item, idx) => ({
                        ...item,
                        id: `new-${Date.now()}-${idx}`
                    }))

                    if (table === 'santri') {
                        santriData = [...santriData, ...insertedItems]
                    } else {
                        guruData = [...guruData, ...insertedItems]
                    }

                    return {
                        select: vi.fn().mockResolvedValue({ data: insertedItems, error: null }),
                        single: vi.fn().mockResolvedValue({ data: insertedItems[0], error: null })
                    }
                }),

                // UPDATE
                update: vi.fn().mockImplementation((updateData) => ({
                    eq: vi.fn().mockImplementation((field, value) => {
                        const index = data.findIndex(item => item[field] === value)
                        if (index !== -1) {
                            const updatedItem = { ...data[index], ...updateData }
                            if (table === 'santri') {
                                santriData[index] = updatedItem
                            } else {
                                guruData[index] = updatedItem
                            }
                            return Promise.resolve({ data: updatedItem, error: null })
                        }
                        return Promise.resolve({ data: null, error: { message: 'Not found' } })
                    })
                })),

                // DELETE
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockImplementation((field, value) => {
                        const index = data.findIndex(item => item[field] === value)
                        if (index !== -1) {
                            if (table === 'santri') {
                                santriData = santriData.filter(item => item[field] !== value)
                            } else {
                                guruData = guruData.filter(item => item[field] !== value)
                            }
                            return Promise.resolve({ error: null })
                        }
                        return Promise.resolve({ error: { message: 'Not found' } })
                    })
                })
            }
        }),

        // Helper untuk testing
        _getSantriData: () => santriData,
        _getGuruData: () => guruData,
        _reset: () => {
            santriData = [...mockSantriList]
            guruData = [...mockGuruList]
        }
    }
}

// ============================================
// Integration Tests
// ============================================

describe('Santri CRUD Operations', () => {
    let mockSupabase

    beforeEach(() => {
        mockSupabase = createMockSupabaseDB()
    })

    describe('READ - Get Santri', () => {
        it('should fetch all santri', async () => {
            const { data, error } = await mockSupabase
                .from('santri')
                .select('*')
                .order('nama')

            expect(error).toBeNull()
            expect(data).toHaveLength(3)
            expect(data[0].nama).toBe('Ahmad Fauzi')
        })

        it('should fetch santri by ID', async () => {
            const { data, error } = await mockSupabase
                .from('santri')
                .select('*')
                .eq('id', '1')
                .single()

            expect(error).toBeNull()
            expect(data.nama).toBe('Ahmad Fauzi')
        })

        it('should return error for non-existent santri', async () => {
            const { data, error } = await mockSupabase
                .from('santri')
                .select('*')
                .eq('id', 'non-existent')
                .single()

            expect(error).toBeDefined()
            expect(data).toBeNull()
        })
    })

    describe('CREATE - Add Santri', () => {
        it('should create new santri', async () => {
            const newSantri = {
                nis: '004',
                nama: 'Dedi Pratama',
                kelas_id: 'kelas-1',
                status: 'Aktif'
            }

            const result = await mockSupabase
                .from('santri')
                .insert([newSantri])
                .select()

            const { data, error } = await result

            expect(error).toBeNull()
            expect(data).toBeDefined()
            expect(data[0].nama).toBe('Dedi Pratama')
            expect(data[0].id).toBeDefined()
        })
    })

    describe('UPDATE - Edit Santri', () => {
        it('should update existing santri', async () => {
            const { data, error } = await mockSupabase
                .from('santri')
                .update({ nama: 'Ahmad Fauzi Updated' })
                .eq('id', '1')

            expect(error).toBeNull()
            expect(data.nama).toBe('Ahmad Fauzi Updated')
        })

        it('should return error for non-existent santri update', async () => {
            const { error } = await mockSupabase
                .from('santri')
                .update({ nama: 'Test' })
                .eq('id', 'non-existent')

            expect(error).toBeDefined()
        })
    })

    describe('DELETE - Remove Santri', () => {
        it('should delete existing santri', async () => {
            const initialCount = mockSupabase._getSantriData().length

            const { error } = await mockSupabase
                .from('santri')
                .delete()
                .eq('id', '1')

            expect(error).toBeNull()
            expect(mockSupabase._getSantriData().length).toBe(initialCount - 1)
        })
    })
})

describe('Guru CRUD Operations', () => {
    let mockSupabase

    beforeEach(() => {
        mockSupabase = createMockSupabaseDB()
    })

    it('should fetch all guru', async () => {
        const { data, error } = await mockSupabase
            .from('guru')
            .select('*')
            .order('nama')

        expect(error).toBeNull()
        expect(data).toHaveLength(2)
    })

    it('should create new guru', async () => {
        const newGuru = {
            nip: 'G003',
            nama: 'Ustadz Budi',
            jabatan: 'Pengajar',
            status: 'Aktif'
        }

        const result = await mockSupabase.from('guru').insert([newGuru]).select()
        const { data, error } = await result

        expect(error).toBeNull()
        expect(data[0].nama).toBe('Ustadz Budi')
    })
})

describe('Error Handling', () => {
    it('should handle database connection error', async () => {
        const mockErrorSupabase = {
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    order: vi.fn().mockRejectedValue(new Error('Database connection failed'))
                })
            })
        }

        try {
            await mockErrorSupabase.from('santri').select('*').order('nama')
        } catch (error) {
            expect(error.message).toBe('Database connection failed')
        }
    })

    it('should handle validation error on insert', async () => {
        const mockValidationError = {
            from: vi.fn().mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Duplicate NIS', code: '23505' }
                    })
                })
            })
        }

        const { data, error } = await mockValidationError
            .from('santri')
            .insert([{ nis: '001' }])
            .select()

        expect(error).toBeDefined()
        expect(error.message).toContain('Duplicate')
    })
})
