import { createClient } from '../frontend/node_modules/@supabase/supabase-js/dist/main/index.js';
import fs from 'fs';
import path from 'path';

/**
 * ============================================================================
 * SCRIPT CLONE DATA: SUPABASE PRODUCTION -> SUPABASE DEV
 * ============================================================================
 * 
 * Script ini HANYA MEMBACA (SELECT) dari database aktif / produksi,
 * jadi 100% AMAN dan TIDAK AKAN MENGUBAH / MERUSAK database aktif Anda.
 * 
 * Cara Penggunaan:
 * 1. Buka dashboard Supabase Produksi -> Project Settings -> API.
 *    Ambil Project URL dan service_role secret.
 * 2. Buka dashboard Supabase Dev -> Project Settings -> API.
 *    Ambil Project URL dan service_role secret.
 * 3. Isi konfigurasi di bawah ini atau di file .env.clone
 * 4. Jalankan: node scripts/clone-data.mjs
 * ============================================================================
 */

// BACA KONFIGURASI DARI FILE .env.clone JIKA ADA, ATAU GUNAKAN NILAI DI BAWAH
let config = {
  SOURCE_SUPABASE_URL: '',      // URL Supabase Aktif / Production
  SOURCE_SERVICE_ROLE_KEY: '',  // Service Role Key Supabase Aktif
  TARGET_SUPABASE_URL: '',      // URL Supabase Dev (Project Baru)
  TARGET_SERVICE_ROLE_KEY: '',  // Service Role Key Supabase Dev
};

const envClonePath = path.resolve('.env.clone');
if (fs.existsSync(envClonePath)) {
  const lines = fs.readFileSync(envClonePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (key && config.hasOwnProperty(key.trim())) {
        config[key.trim()] = val;
      }
    }
  }
}

// URUTAN TABEL YANG DISALIN (DISUSUN BERDASARKAN FOREIGN KEY DEPENDENCY)
const TABLES_TO_CLONE = [
  // 1. Master & Pengaturan
  'system_settings',
  'angkatan',
  'semester',
  'guru',
  'kelas',
  'mapel',
  'halaqoh',
  'kategori_pembayaran',
  'ota_kategori',
  
  // 2. Data Pokok & User
  'santri',
  'user_profiles',
  'wali_santri_link',
  'musyrif_halaqoh',
  'orang_tua_asuh',
  'ota_santri',
  'santri_penerima_ota',
  'santri_bermasalah',

  // 3. Akademik, Presensi, Hafalan & Catatan
  'jadwal_pelajaran',
  'kalender_akademik',
  'hafalan',
  'presensi',
  'presensi_mapel',
  'presensi_mapel_detil',
  'nilai',
  'pelanggaran',
  'tindak_lanjut_pelanggaran',
  'perilaku_semester',
  'catatan_pembinaan',
  'izin_guru',
  'pergantian_jadwal',

  // 4. Keuangan & OTA
  'anggaran',
  'realisasi_dana',
  'kas_pemasukan',
  'kas_pengeluaran',
  'tagihan_santri',
  'pembayaran_santri',
  'bukti_transfer',
  'ota_pool_dana',
  'ota_pemasukan',
  'ota_pengeluaran',
  'ota_penyaluran',
  'ota_penyaluran_detail',

  // 5. Komunikasi & Pengumuman
  'pengumuman',
  'pengumuman_internal',
  'informasi_pondok',
  'taujihad',
  'buletin_pondok',
  'pesan_wali',
  'notifications',
  'arsip_dokumen'
];

async function main() {
  console.log('\n======================================================');
  console.log('🚀 MEMULAI PROSES CLONE DATA DARI PRODUCTION KE DEV');
  console.log('======================================================\n');

  if (!config.SOURCE_SUPABASE_URL || !config.SOURCE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: SOURCE_SUPABASE_URL atau SOURCE_SERVICE_ROLE_KEY belum diisi!');
    console.log('👉 Silakan isi file .env.clone terlebih dahulu.');
    process.exit(1);
  }

  if (!config.TARGET_SUPABASE_URL || !config.TARGET_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: TARGET_SUPABASE_URL atau TARGET_SERVICE_ROLE_KEY belum diisi!');
    console.log('👉 Silakan isi file .env.clone terlebih dahulu.');
    process.exit(1);
  }

  if (config.SOURCE_SUPABASE_URL === config.TARGET_SUPABASE_URL) {
    console.error('❌ ERROR: URL Source dan Target sama! Operasi dibatalkan demi keamanan.');
    process.exit(1);
  }

  const sourceClient = createClient(config.SOURCE_SUPABASE_URL, config.SOURCE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const targetClient = createClient(config.TARGET_SUPABASE_URL, config.TARGET_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`📡 Sumber (Aktif) : ${config.SOURCE_SUPABASE_URL}`);
  console.log(`🎯 Tujuan (Dev)    : ${config.TARGET_SUPABASE_URL}`);
  console.log('------------------------------------------------------\n');

  // STEP 1: Salin Auth Users jika memungkinkan
  console.log('🔐 [1/2] Menyalin Akun Pengguna (auth.users)...');
  try {
    const { data: userData, error: userError } = await sourceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (userError) {
      console.warn(`   ⚠️ Gagal membaca auth.users: ${userError.message}`);
    } else if (userData && userData.users) {
      console.log(`   Ditemukan ${userData.users.length} akun di database aktif.`);
      let userSuccess = 0;
      for (const u of userData.users) {
        try {
          // Coba buat akun di target dengan ID yang sama
          const { error: createErr } = await targetClient.auth.admin.createUser({
            id: u.id,
            email: u.email,
            email_confirm: true,
            user_metadata: u.user_metadata,
            password: 'Password123!' // Password default sementara untuk dev
          });
          if (!createErr || createErr.message.includes('already exists') || createErr.message.includes('unique')) {
            userSuccess++;
          }
        } catch (e) {
          // Lewatkan jika akun sudah ada
        }
      }
      console.log(`   ✅ Selesai menyalin ${userSuccess} akun pengguna (Password dev default: Password123!).\n`);
    }
  } catch (err) {
    console.warn(`   ⚠️ auth.users dilewati: ${err.message}\n`);
  }

  // STEP 2: Salin Tabel-tabel Publik
  console.log('📦 [2/2] Menyalin Data Tabel Publik...');
  const CHUNK_SIZE = 500;

  for (const tableName of TABLES_TO_CLONE) {
    process.stdout.write(`   ⏳ Menyalin [${tableName}]... `);

    try {
      // Ambil total data dari source
      let allRows = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await sourceClient
          .from(tableName)
          .select('*')
          .range(from, from + CHUNK_SIZE - 1);

        if (error) {
          if (error.code === '42P01') {
            // Tabel tidak ada di source
            console.log(`(Tabel belum ada di database, dilewati)`);
          } else {
            console.log(`⚠️ Gagal fetch: ${error.message}`);
          }
          hasMore = false;
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        allRows = allRows.concat(data);
        if (data.length < CHUNK_SIZE) {
          hasMore = false;
        } else {
          from += CHUNK_SIZE;
        }
      }

      if (allRows.length === 0) {
        console.log(`0 baris (kosong).`);
        continue;
      }

      // Bersihkan data parsial lama agar batch insert tidak terhalang duplicate key
      if (['mapel', 'presensi', 'presensi_mapel_detil'].includes(tableName)) {
        await targetClient.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // Masukkan ke target dalam batch
      let insertedCount = 0;
      for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
        const chunk = allRows.slice(i, i + CHUNK_SIZE);
        const { error: insertError } = await targetClient
          .from(tableName)
          .upsert(chunk);

        if (insertError) {
          console.log(`\n      ⚠️ Error insert pada ${tableName}: ${insertError.message}`);
          break;
        } else {
          insertedCount += chunk.length;
        }
      }

      console.log(`✅ Berhasil (${insertedCount} baris)`);

    } catch (tableErr) {
      console.log(`⚠️ Error: ${tableErr.message}`);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 PROSES SELESAI!');
  console.log('Database dev Anda sekarang sudah memiliki salinan data aktif.');
  console.log('Anda bisa langsung menghubungkan frontend lokal ke database dev!');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
