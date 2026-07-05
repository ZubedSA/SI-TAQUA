const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lzxxtdmkuziawsmzwgim.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6eHh0ZG1rdXppYXdzbXp3Z2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI4ODYsImV4cCI6MjA4MDI1ODg4Nn0.moAK0_2g211--5sWkN19UIipwzP_oFaLStpI-DkXe5I';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    try {
        console.log("Querying Supabase pelanggaran...");
        const { data, error } = await supabase
            .from('pelanggaran')
            .select(`
                id,
                poin,
                tanggal,
                status,
                santri:santri_id (
                    id,
                    nama,
                    nis,
                    nama_wali,
                    no_telp_wali,
                    kelas:kelas_id (nama)
                )
            `)
            .limit(5);

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        console.log("Result:");
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Execution error:", err);
    }
}

run();
