// Supabase Edge Function: Check Guru Absensi
// Cron job: Cek guru yang belum melakukan absensi/jurnal
// Dipanggil otomatis setiap 30 menit pada jam sekolah (8:00 - 15:00)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get current date and day name in Indonesian
        const now = new Date()
        // Convert to WIB (UTC+7)
        const wibOffset = 7 * 60 * 60 * 1000
        const wibNow = new Date(now.getTime() + wibOffset)
        
        const today = wibNow.toISOString().split('T')[0]
        const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        const currentDay = dayNames[wibNow.getUTCDay()]
        const currentHour = wibNow.getUTCHours()
        const currentMinute = wibNow.getUTCMinutes()
        const currentTimeMinutes = currentHour * 60 + currentMinute

        console.log(`[Cron] Checking guru absensi for ${today} (${currentDay}), time: ${currentHour}:${currentMinute}`)

        // 1. Get all jadwal for today
        const { data: jadwalHariIni, error: jadwalError } = await supabase
            .from('jadwal_pelajaran')
            .select('*, guru:guru!guru_id(id, nama, email), kelas:kelas!kelas_id(nama), mapel:mapel!mapel_id(nama)')
            .eq('hari', currentDay)

        if (jadwalError) {
            console.error('Error fetching jadwal:', jadwalError)
            return new Response(JSON.stringify({ error: jadwalError.message }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (!jadwalHariIni || jadwalHariIni.length === 0) {
            return new Response(JSON.stringify({ message: 'No jadwal today', date: today, day: currentDay }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Get all jurnal (presensi_mapel) for today
        const { data: jurnalHariIni } = await supabase
            .from('presensi_mapel')
            .select('jadwal_id, guru_id')
            .eq('tanggal', today)

        const filledJadwalIds = new Set((jurnalHariIni || []).map(j => j.jadwal_id))

        // 3. Find jadwal that should have been filled by now (jam_selesai + 30 min < now)
        const missingJurnalGuru = []

        for (const jadwal of jadwalHariIni) {
            // Skip if already filled
            if (filledJadwalIds.has(jadwal.id)) continue

            // Check if the class time has passed (selesai + 30 min buffer)
            if (jadwal.jam_selesai) {
                const [h, m] = jadwal.jam_selesai.split(':').map(Number)
                const jadwalEndMinutes = h * 60 + m + 30 // 30 min buffer

                if (currentTimeMinutes >= jadwalEndMinutes) {
                    missingJurnalGuru.push({
                        guru_nama: jadwal.guru?.nama || 'Unknown',
                        guru_id: jadwal.guru_id,
                        mapel: jadwal.mapel?.nama || '-',
                        kelas: jadwal.kelas?.nama || '-',
                        jam_ke: jadwal.jam_ke,
                        jam_mulai: jadwal.jam_mulai,
                        jam_selesai: jadwal.jam_selesai
                    })
                }
            }
        }

        if (missingJurnalGuru.length === 0) {
            return new Response(JSON.stringify({
                message: 'All teachers have completed their journals',
                date: today,
                checked: jadwalHariIni.length
            }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 4. Get admin push subscriptions
        const { data: adminSubs } = await supabase.rpc('get_admin_push_subscriptions')

        if (!adminSubs || adminSubs.length === 0) {
            console.log('No admin push subscriptions found')
            return new Response(JSON.stringify({
                message: 'Missing journals found but no admin subscriptions',
                missing: missingJurnalGuru.length
            }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 5. Send push notification to admins
        const guruNames = [...new Set(missingJurnalGuru.map(g => g.guru_nama))].slice(0, 3)
        const remaining = missingJurnalGuru.length - guruNames.length

        const notifTitle = '⚠️ Guru Belum Mengisi Jurnal'
        const notifBody = `${guruNames.join(', ')}${remaining > 0 ? ` dan ${remaining} lainnya` : ''} belum mengisi jurnal hari ini.`

        // Call send-push-notification function
        const adminUserIds = [...new Set(adminSubs.map(s => s.user_id))]

        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
                type: 'guru_reminder',
                target_user_ids: adminUserIds,
                title: notifTitle,
                body: notifBody,
                url: '/admin/absensi?tab=jurnal',
                tag: `guru-reminder-${today}`
            }
        })

        if (pushError) {
            console.error('Push notification error:', pushError)
        }

        return new Response(JSON.stringify({
            message: 'Guru absensi check completed',
            date: today,
            day: currentDay,
            totalJadwal: jadwalHariIni.length,
            filled: filledJadwalIds.size,
            missing: missingJurnalGuru.length,
            notifiedAdmins: adminUserIds.length,
            missingDetails: missingJurnalGuru
        }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err) {
        console.error('Edge function error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
