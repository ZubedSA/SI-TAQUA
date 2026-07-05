
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debug() {
  const { data, error } = await supabase.from('jadwal_pelajaran').select('*').limit(5)
  console.log('Sample Data:', data)
  console.log('Error:', error)
  
  const { data: count } = await supabase.from('jadwal_pelajaran').select('id', { count: 'exact' })
  console.log('Total Count:', count?.length)
}

debug()
