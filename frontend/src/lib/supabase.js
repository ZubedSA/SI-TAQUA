import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Check connection status
export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('santri').select('count', { count: 'exact', head: true })
        if (error) {
            console.error('❌ Supabase connection failed:', error.message)
            return { connected: false, error: error.message }
        }
        console.log('✅ Supabase connected successfully!')
        return { connected: true, error: null }
    } catch (err) {
        console.error('❌ Supabase connection error:', err.message)
        return { connected: false, error: err.message }
    }
}

// Log connection info
console.log('🔌 Supabase URL:', supabaseUrl)
console.log('🔑 Supabase Key:', supabaseAnonKey ? '***configured***' : 'NOT SET')
