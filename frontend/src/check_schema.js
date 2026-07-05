
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkSchema() {
  console.log('--- Checking Foreign Keys for jadwal_pelajaran ---')
  // We can't query information_schema directly easily via PostgREST,
  // but we can try different join syntaxes to see which one works.
  
  const tests = [
    'kelas(nama)',
    'kelas:kelas_id(nama)',
    'mapel:mapel_id(nama)',
    'guru:guru_id(nama)',
    'kelas!kelas_id(nama)',
    'mapel!mapel_id(nama)',
    'guru!guru_id(nama)'
  ]

  for (const t of tests) {
    const { error } = await supabase.from('jadwal_pelajaran').select(t).limit(1)
    if (error) {
      console.log(`❌ ${t}: ${error.message}`)
    } else {
      console.log(`✅ ${t}: Success!`)
    }
  }
}

checkSchema()
