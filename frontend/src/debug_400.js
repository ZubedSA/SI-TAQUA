
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debug() {
  console.log('--- Testing useJadwal query ---')
  const { data, error } = await supabase
    .from('jadwal_pelajaran')
    .select(`
        *,
        kelas:kelas!kelas_id(nama),
        mapel:mapel!mapel_id(nama, kode),
        guru:guru!guru_id(nama)
    `)
    .limit(1)
  
  if (error) {
    console.error('❌ useJadwal Error:', error.message)
    console.error('Details:', error.details)
    console.error('Hint:', error.hint)
  } else {
    console.log('✅ useJadwal Success!')
  }

  console.log('\n--- Testing useJurnal query ---')
  const { data: data2, error: error2 } = await supabase
    .from('jadwal_pelajaran')
    .select(`
        *,
        kelas:kelas!kelas_id(nama),
        halaqoh:halaqoh!halaqoh_id(nama),
        mapel:mapel!mapel_id(nama, kode),
        guru:guru!guru_id(nama)
    `)
    .limit(1)

  if (error2) {
    console.error('❌ useJurnal Error:', error2.message)
    console.error('Details:', error2.details)
    console.error('Hint:', error2.hint)
  } else {
    console.log('✅ useJurnal Success!')
  }
}

debug()
