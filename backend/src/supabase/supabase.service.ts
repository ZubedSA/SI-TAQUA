import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://lzxxtdmkuziawsmzwgim.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6eHh0ZG1rdXppYXdzbXp3Z2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI4ODYsImV4cCI6MjA4MDI1ODg4Nn0.moAK0_2g211--5sWkN19UIipwzP_oFaLStpI-DkXe5I';
    this.supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }

  // Find student by fuzzy name matching
  async findSantriByName(name: string) {
    const { data, error } = await this.supabase
      .from('santri')
      .select('id, nama, nis, status, kelas_id, halaqoh_id')
      .ilike('nama', `%${name}%`)
      .eq('status', 'Aktif');
    
    if (error) {
      this.logger.error(`Error finding santri by name ${name}:`, error);
      throw error;
    }
    return data;
  }

  // Find teacher by fuzzy name matching
  async findGuruByName(name: string) {
    const { data, error } = await this.supabase
      .from('guru')
      .select('id, nama, nip, status')
      .ilike('nama', `%${name}%`)
      .eq('status', 'Aktif');

    if (error) {
      this.logger.error(`Error finding guru by name ${name}:`, error);
      throw error;
    }
    return data;
  }

  // Get active student count
  async getActiveSantriCount() {
    const { count, error } = await this.supabase
      .from('santri')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Aktif');
    
    if (error) throw error;
    return count;
  }

  // Check student payment status
  async checkPembayaran(santriId: string, month: string = '') {
    // month in YYYY-MM format or category name
    const query = this.supabase
      .from('tagihan_santri')
      .select(`
        id,
        jumlah,
        jatuh_tempo,
        status,
        keterangan,
        kategori_pembayaran (nama)
      `)
      .eq('santri_id', santriId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Get memorization progress of student
  async getHafalan(santriId: string) {
    const { data, error } = await this.supabase
      .from('hafalan')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Get grades/nilai of student
  async getNilai(santriId: string) {
    const { data, error } = await this.supabase
      .from('nilai')
      .select(`
        id,
        nilai_tugas,
        nilai_uts,
        nilai_uas,
        nilai_akhir,
        semester,
        tahun_ajaran,
        mapel (nama)
      `)
      .eq('santri_id', santriId);

    if (error) throw error;
    return data;
  }

  // Get attendance records of student
  async getPresensi(santriId: string) {
    const { data, error } = await this.supabase
      .from('presensi')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Check who hasn't submitted memorization today
  async getWhoHasNotDepositedToday() {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all active students
    const { data: allSantri, error: err1 } = await this.supabase
      .from('santri')
      .select('id, nama')
      .eq('status', 'Aktif');
    
    if (err1) throw err1;

    // Get all memorization today
    const { data: depositedToday, error: err2 } = await this.supabase
      .from('hafalan')
      .select('santri_id')
      .eq('tanggal', today);

    if (err2) throw err2;

    const depositedIds = new Set(depositedToday.map(h => h.santri_id));
    return allSantri.filter(s => !depositedIds.has(s.id));
  }

  // Total income this month
  async getTotalPemasukanBulanIni() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: pembayaran, error } = await this.supabase
      .from('pembayaran_santri')
      .select('jumlah')
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay);

    if (error) throw error;

    const { data: kasPemasukan, error: errorKas } = await this.supabase
      .from('kas_pemasukan')
      .select('jumlah')
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay);

    if (errorKas) throw errorKas;

    const totalPembayaran = pembayaran.reduce((sum, item) => sum + Number(item.jumlah), 0);
    const totalKas = kasPemasukan.reduce((sum, item) => sum + Number(item.jumlah), 0);

    return {
      pembayaran_santri: totalPembayaran,
      kas_pemasukan: totalKas,
      total: totalPembayaran + totalKas
    };
  }

  // Get total income compared to last month
  async getPemasukanPerbandingan() {
    const now = new Date();
    
    // Current Month
    const curFirst = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const curLast = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    // Last Month
    const lastFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastLast = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const getPemasukanRange = async (start: string, end: string) => {
      const { data: p, error: e1 } = await this.supabase.from('pembayaran_santri').select('jumlah').gte('tanggal', start).lte('tanggal', end);
      const { data: k, error: e2 } = await this.supabase.from('kas_pemasukan').select('jumlah').gte('tanggal', start).lte('tanggal', end);
      if (e1 || e2) throw (e1 || e2);
      const totalP = p.reduce((sum, i) => sum + Number(i.jumlah), 0);
      const totalK = k.reduce((sum, i) => sum + Number(i.jumlah), 0);
      return totalP + totalK;
    };

    const currentTotal = await getPemasukanRange(curFirst, curLast);
    const lastTotal = await getPemasukanRange(lastFirst, lastLast);

    return {
      bulan_ini: currentTotal,
      bulan_lalu: lastTotal,
      selisih: currentTotal - lastTotal,
      persentase: lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0
    };
  }

  // Santri presence count today
  async getSantriHadirHariIni() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('presensi')
      .select('status')
      .eq('tanggal', today);

    if (error) throw error;

    const total = data.length;
    const hadir = data.filter(p => p.status.toLowerCase() === 'hadir').length;
    
    return {
      total,
      hadir,
      izin: data.filter(p => p.status.toLowerCase() === 'izin').length,
      sakit: data.filter(p => p.status.toLowerCase() === 'sakit').length,
      alpha: data.filter(p => p.status.toLowerCase() === 'alpha' || p.status.toLowerCase() === 'alfa').length
    };
  }

  // Get student with most "izin" status
  async getSantriPalingBanyakIzin() {
    const { data, error } = await this.supabase
      .from('presensi')
      .select('santri_id, status, santri(nama)')
      .in('status', ['izin', 'Izin']);

    if (error) throw error;

    const countMap: Record<string, { nama: string; count: number }> = {};
    data.forEach(p => {
      const id = p.santri_id;
      const santriData = p.santri as any;
      const nama = (Array.isArray(santriData) ? santriData[0]?.nama : santriData?.nama) || 'Unknown';
      if (!countMap[id]) {
        countMap[id] = { nama, count: 0 };
      }
      countMap[id].count++;
    });

    return Object.values(countMap).sort((a, b) => b.count - a.count);
  }

  // Get largest debt (tunggakan)
  async getTunggakanTerbesar() {
    const { data, error } = await this.supabase
      .from('tagihan_santri')
      .select('jumlah, status, santri(nama)')
      .eq('status', 'Belum Lunas');

    if (error) throw error;

    const countMap: Record<string, { nama: string; total: number }> = {};
    data.forEach(t => {
      const santriData = t.santri as any;
      const nama = (Array.isArray(santriData) ? santriData[0]?.nama : santriData?.nama) || 'Unknown';
      if (!countMap[nama]) {
        countMap[nama] = { nama, total: 0 };
      }
      countMap[nama].total += Number(t.jumlah);
    });

    return Object.values(countMap).sort((a, b) => b.total - a.total);
  }

  // Top 10 hafalan
  async getTop10Hafalan() {
    // We can count how many unique juz or pages a student has memorized, or look at the latest completed juz
    const { data, error } = await this.supabase
      .from('hafalan')
      .select('santri_id, juz, status, santri(nama)')
      .eq('status', 'Mutqin');

    if (error) throw error;

    const countMap: Record<string, { nama: string; maxJuz: number }> = {};
    data.forEach(h => {
      const id = h.santri_id;
      const santriData = h.santri as any;
      const nama = (Array.isArray(santriData) ? santriData[0]?.nama : santriData?.nama) || 'Unknown';
      if (!countMap[id]) {
        countMap[id] = { nama, maxJuz: 0 };
      }
      if (h.juz > countMap[id].maxJuz) {
        countMap[id].maxJuz = h.juz;
      }
    });

    return Object.values(countMap).sort((a, b) => b.maxJuz - a.maxJuz).slice(0, 10);
  }

  // Teacher absence check (teachers who haven't inputted attendance today)
  async getGuruBelumAbsen() {
    // In our schema, we have a table presensi_staf or check-guru-absensi or class schedules
    // Let's query all active guru
    const { data: allGuru, error } = await this.supabase
      .from('guru')
      .select('id, nama')
      .eq('status', 'Aktif');

    if (error) throw error;
    return allGuru; // Return list of active teachers for reference
  }

  // Save/Insert operations
  async addPembayaran(santriId: string, categoryName: string, nominal: number, tanggal: string = new Date().toISOString().split('T')[0]) {
    // 1. Get or create tagihan for this category
    const { data: categories, error: catErr } = await this.supabase
      .from('kategori_pembayaran')
      .select('id')
      .ilike('nama', `%${categoryName}%`);
    
    if (catErr || !categories || categories.length === 0) {
      throw new Error(`Kategori pembayaran '${categoryName}' tidak ditemukan.`);
    }
    const catId = categories[0].id;

    // Find if there is an unpaid tagihan
    const { data: tagihan, error: tagErr } = await this.supabase
      .from('tagihan_santri')
      .select('id, jumlah, status')
      .eq('santri_id', santriId)
      .eq('kategori_id', catId)
      .eq('status', 'Belum Lunas')
      .limit(1);

    let tagihanId: string;
    if (tagErr || !tagihan || tagihan.length === 0) {
      // Create new tagihan
      const { data: newTag, error: newTagErr } = await this.supabase
        .from('tagihan_santri')
        .insert({
          santri_id: santriId,
          kategori_id: catId,
          jumlah: nominal,
          jatuh_tempo: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
          status: 'Belum Lunas'
        })
        .select('id')
        .single();
      
      if (newTagErr) throw newTagErr;
      tagihanId = newTag.id;
    } else {
      tagihanId = tagihan[0].id;
    }

    // Insert payment
    const { data: payment, error: payErr } = await this.supabase
      .from('pembayaran_santri')
      .insert({
        tagihan_id: tagihanId,
        santri_id: santriId,
        jumlah: nominal,
        tanggal: tanggal,
        metode: 'Tunai'
      })
      .select('*')
      .single();

    if (payErr) throw payErr;

    // Update tagihan status
    await this.supabase
      .from('tagihan_santri')
      .update({ status: 'Lunas' })
      .eq('id', tagihanId);

    return payment;
  }

  async addHafalan(santriId: string, juz: number, surah: string, ayatMulai: number, ayatSelesai: number, status: string = 'Proses') {
    const { data, error } = await this.supabase
      .from('hafalan')
      .insert({
        santri_id: santriId,
        juz: juz,
        surah: surah,
        ayat_mulai: ayatMulai,
        ayat_selesai: ayatSelesai,
        status: status,
        tanggal: new Date().toISOString().split('T')[0]
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async addAbsensi(santriId: string, status: string, keterangan: string = '', tanggal: string = new Date().toISOString().split('T')[0]) {
    // Clean status: 'hadir', 'izin', 'sakit', 'alpha'
    const cleanStatus = status.toLowerCase().trim();
    
    // Upsert presensi
    const { data, error } = await this.supabase
      .from('presensi')
      .upsert({
        santri_id: santriId,
        tanggal: tanggal,
        status: cleanStatus,
        keterangan: keterangan
      }, { onConflict: 'santri_id,tanggal' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async addPelanggaran(santriId: string, jenis: string, tingkat: number, deskripsi: string = '') {
    const { data, error } = await this.supabase
      .from('pelanggaran')
      .insert({
        santri_id: santriId,
        tingkat: tingkat, // 1 to 4
        jenis: jenis,
        deskripsi: deskripsi,
        tanggal: new Date().toISOString().split('T')[0],
        status: 'OPEN'
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async addCatatanPembinaan(santriId: string, jenis: 'UMUM' | 'KONSELING' | 'PEMBINAAN' | 'PUJIAN' | 'CATATAN', isi: string) {
    const { data, error } = await this.supabase
      .from('catatan_pembinaan')
      .insert({
        santri_id: santriId,
        jenis: jenis,
        isi: isi,
        tanggal: new Date().toISOString().split('T')[0],
        is_private: true
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}
