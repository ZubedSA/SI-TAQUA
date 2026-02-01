
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lzxxtdmkuziawsmzwgim.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6eHh0ZG1rdXppYXdzbXp3Z2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI4ODYsImV4cCI6MjA4MDI1ODg4Nn0.moAK0_2g211--5sWkN19UIipwzP_oFaLStpI-DkXe5I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllNilai() {
    console.log('Checking Semester & Jenis Ujian stats...')

    // Get all semesters
    const { data: sems } = await supabase.from('semester').select('id, nama, is_active')
    const semMap = {}
    sems.forEach(s => semMap[s.id] = `${s.nama} (${s.is_active ? 'Active' : 'Inactive'})`)

    const { data, error } = await supabase
        .from('nilai')
        .select('semester_id, jenis_ujian, kategori')

    if (error) {
        console.error('Error:', error)
    } else {
        const stats = {}
        data.forEach(n => {
            const semName = semMap[n.semester_id] || n.semester_id
            const key = `${semName} | ${n.jenis_ujian} | ${n.kategori}`
            stats[key] = (stats[key] || 0) + 1
        })
        console.table(stats)
    }
}

checkAllNilai()
