const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const getEnv = (k) => {
    const lines = env.split('\n');
    for (const line of lines) {
        const parts = line.split('=');
        if (parts[0].trim() === k) return parts.slice(1).join('=').trim();
    }
    return '';
};

const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

async function run() {
    const { data: g } = await supabase.from('guru').select('*').ilike('nama', '%Zubaidi%');
    console.log('GURU ZUBAIDI:', JSON.stringify(g, null, 2));

    const { data: allGuru } = await supabase.from('guru').select('id, nama, status');
    console.log('ALL GURU:', JSON.stringify(allGuru, null, 2));

    const { data: h } = await supabase.from('halaqoh').select('*');
    console.log('ALL HALAQOH:', JSON.stringify(h, null, 2));

    const { data: mh } = await supabase.from('musyrif_halaqoh').select('*');
    console.log('ALL MUSYRIF_HALAQOH:', JSON.stringify(mh, null, 2));

    const { data: j } = await supabase.from('jadwal_pelajaran').select('*').eq('hari', 'Sabtu');
    console.log('ALL SABTU JADWAL:', JSON.stringify(j, null, 2));

    const { data: allJ } = await supabase.from('jadwal_pelajaran').select('*');
    console.log('TOTAL JADWAL COUNT:', allJ ? allJ.length : 0);
}

run();

