const dns = require('dns')
try {
    dns.setDefaultResultOrder('ipv4first')
} catch (e) {}

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// 1. Baca env backend & frontend
const readEnv = (filePath) => {
    const res = {}
    if (fs.existsSync(filePath)) {
        fs.readFileSync(filePath, 'utf8').split('\n').forEach(line => {
            const parts = line.split('=')
            if (parts.length >= 2) {
                res[parts[0].trim()] = parts.slice(1).join('=').trim()
            }
        })
    }
    return res
}

const bEnv = readEnv(path.join(__dirname, '../.env'))
const fEnv = readEnv(path.join(__dirname, '../../frontend/.env'))

const url = bEnv.SUPABASE_URL || fEnv.VITE_SUPABASE_URL
const anonKey = fEnv.VITE_SUPABASE_ANON_KEY || bEnv.SUPABASE_ANON_KEY
const serviceKey = bEnv.SUPABASE_SERVICE_ROLE_KEY

console.log('--- TEST KONEKSI SUPABASE DENGAN IPV4-FIRST ---')
console.log('URL:', url)

async function testKey(name, key) {
    console.log(`\nTesting ${name}...`)
    if (!key) {
        console.log(`  ❌ Key tidak ditemukan!`)
        return
    }
    console.log(`  Key snippet: ${key.substring(0, 20)}...`)
    const client = createClient(url, key)
    
    // Test 1: Jadwal
    const { data: j, error: jErr } = await client.from('jadwal_pelajaran').select('id, hari, jam_ke').limit(3)
    if (jErr) {
        console.log(`  ❌ Error jadwal_pelajaran:`, jErr.message, `(Code: ${jErr.code || 'N/A'})`)
        if (jErr.cause) console.log(`     Cause:`, jErr.cause)
    } else {
        console.log(`  ✅ jadwal_pelajaran berhasil! Ditemukan: ${j.length} baris sample:`, j)
    }

    // Test 2: Guru
    const { data: g, error: gErr } = await client.from('guru').select('id, nama, status').limit(3)
    if (gErr) {
        console.log(`  ❌ Error guru:`, gErr.message, `(Code: ${gErr.code || 'N/A'})`)
        if (gErr.cause) console.log(`     Cause:`, gErr.cause)
    } else {
        console.log(`  ✅ guru berhasil! Ditemukan: ${g.length} baris sample:`, g)
    }

    // Test 3: Total jadwal count
    const { count, error: cErr } = await client.from('jadwal_pelajaran').select('*', { count: 'exact', head: true })
    if (cErr) console.log(`  ❌ Error count jadwal:`, cErr.message)
    else console.log(`  ✅ Total baris jadwal_pelajaran di database: ${count}`)
}

async function run() {
    await testKey('1. SERVICE_ROLE_KEY', serviceKey)
    await testKey('2. ANON_KEY', anonKey)
}

run().catch(console.error)
