"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SupabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let SupabaseService = SupabaseService_1 = class SupabaseService {
    constructor() {
        this.logger = new common_1.Logger(SupabaseService_1.name);
        const url = process.env.SUPABASE_URL || 'https://cbevhwhmhptdadwvoozt.supabase.co';
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZXZod2htaHB0ZGFkd3Zvb3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDMxMTM5NSwiZXhwIjoyMTA5ODg3Mzk1fQ.WNR5ZqpCZk3WAFI9YJJlbrXfHIxYxsMwtCDczpuaoBM';
        this.supabase = (0, supabase_js_1.createClient)(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });
    }
    getClient() {
        return this.supabase;
    }
    async findSantriByName(name) {
        let queryBuilder = this.supabase
            .from('santri')
            .select('id, nama, nis, status, kelas_id, halaqoh_id, kelas(nama)')
            .eq('status', 'Aktif');
        const words = name.trim().split(/\s+/);
        words.forEach(word => {
            if (word) {
                queryBuilder = queryBuilder.ilike('nama', `%${word}%`);
            }
        });
        const { data, error } = await queryBuilder;
        if (error) {
            this.logger.error(`Error finding santri by name ${name}:`, error.message || error);
            throw error;
        }
        return data;
    }
    async findGuruByName(name) {
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
    async getActiveSantriCount() {
        const { count, error } = await this.supabase
            .from('santri')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Aktif');
        if (error)
            throw error;
        return count;
    }
    async getSantriStatistics(filter) {
        try {
            const statusFilter = filter?.status || 'Aktif';
            const [kelasListRes, halaqohListRes, santriListRes] = await Promise.all([
                this.supabase.from('kelas').select('id, nama'),
                this.supabase.from('halaqoh').select('id, nama'),
                this.supabase.from('santri').select('id, nama, nis, status, kelas_id, halaqoh_id').eq('status', statusFilter)
            ]);
            const kelasList = kelasListRes.data || [];
            const halaqohList = halaqohListRes.data || [];
            const santriList = santriListRes.data || [];
            const matchKelas = (kNama, search) => {
                if (!kNama || !search)
                    return false;
                const kClean = kNama.toLowerCase().trim();
                const sClean = search.toLowerCase().trim();
                if (kClean === sClean)
                    return true;
                if (kClean.includes(sClean) || sClean.includes(kClean))
                    return true;
                const numSearch = sClean.replace(/[^0-9]/g, '');
                const numKelas = kClean.replace(/[^0-9]/g, '');
                if (numSearch && numKelas && numSearch === numKelas)
                    return true;
                const romanMap = {
                    '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v', '6': 'vi', '7': 'vii', '8': 'viii', '9': 'ix'
                };
                if (numSearch && romanMap[numSearch]) {
                    const roman = romanMap[numSearch];
                    const regex = new RegExp(`\\b${roman}\\b`, 'i');
                    if (regex.test(kClean))
                        return true;
                }
                return false;
            };
            if (filter?.kelas) {
                const rawSearch = filter.kelas.trim();
                const matchedKelas = kelasList.filter(k => matchKelas(k.nama, rawSearch));
                const matchedIds = matchedKelas.map(k => k.id);
                const filteredSantri = santriList.filter(s => matchedIds.includes(s.kelas_id));
                return {
                    type: 'KELAS',
                    query: rawSearch,
                    matchedKelas: matchedKelas.map(k => k.nama),
                    total: filteredSantri.length,
                    santriNames: filteredSantri.map(s => s.nama),
                    allKelasAvailable: kelasList.map(k => k.nama)
                };
            }
            if (filter?.halaqoh) {
                const rawSearch = filter.halaqoh.trim().toLowerCase();
                const matchedHalaqoh = halaqohList.filter(h => h.nama.toLowerCase().includes(rawSearch) || rawSearch.includes(h.nama.toLowerCase()));
                const matchedIds = matchedHalaqoh.map(h => h.id);
                const filteredSantri = santriList.filter(s => matchedIds.includes(s.halaqoh_id));
                return {
                    type: 'HALAQOH',
                    query: filter.halaqoh,
                    matchedHalaqoh: matchedHalaqoh.map(h => h.nama),
                    total: filteredSantri.length,
                    santriNames: filteredSantri.map(s => s.nama),
                    allHalaqohAvailable: halaqohList.map(h => h.nama)
                };
            }
            const breakdown = kelasList.map(k => {
                const count = santriList.filter(s => s.kelas_id === k.id).length;
                return { kelas: k.nama, count };
            });
            return {
                type: 'GLOBAL',
                total: santriList.length,
                breakdown,
                allKelasAvailable: kelasList.map(k => k.nama)
            };
        }
        catch (err) {
            this.logger.error(`Error getSantriStatistics: ${err.message || err}`);
            try {
                const count = await this.getActiveSantriCount();
                return { type: 'GLOBAL', total: count, breakdown: [] };
            }
            catch {
                return { type: 'GLOBAL', total: 0, breakdown: [] };
            }
        }
    }
    async checkPembayaran(santriId, month = '') {
        await this.ensureSampleData();
        let query = this.supabase
            .from('tagihan_santri')
            .select('id, jumlah, jatuh_tempo, status, keterangan, santri(nama), kategori_pembayaran(nama)')
            .order('jatuh_tempo', { ascending: false });
        if (santriId) {
            query = query.eq('santri_id', santriId);
        }
        let { data, error } = await query;
        if (error)
            throw error;
        if ((!data || data.length === 0)) {
            try {
                const { data: categories } = await this.supabase
                    .from('kategori_pembayaran')
                    .select('id, nama, nominal_default');
                if (categories && categories.length > 0) {
                    const currentYear = new Date().getFullYear();
                    let targetStudents = [];
                    if (santriId) {
                        targetStudents = [{ id: santriId }];
                    }
                    else {
                        const { data: allStudents } = await this.supabase
                            .from('santri')
                            .select('id')
                            .eq('status', 'Aktif');
                        targetStudents = allStudents || [];
                    }
                    if (targetStudents.length > 0) {
                        this.logger.log(`Demo Mode: Membuat data tagihan dummy untuk ${targetStudents.length} santri`);
                        const dummyBills = [];
                        targetStudents.forEach(st => {
                            categories.slice(0, 3).map((cat, idx) => {
                                dummyBills.push({
                                    santri_id: st.id,
                                    kategori_id: cat.id,
                                    jumlah: cat.nominal_default || 200000,
                                    jatuh_tempo: `${currentYear}-07-10`,
                                    status: idx === 0 ? 'Lunas' : 'Belum Lunas',
                                    keterangan: `Tagihan Bulanan ${cat.nama}`
                                });
                            });
                        });
                        const { error: insertErr } = await this.supabase
                            .from('tagihan_santri')
                            .insert(dummyBills);
                        if (!insertErr) {
                            let requery = this.supabase
                                .from('tagihan_santri')
                                .select('id,jumlah,jatuh_tempo,status,keterangan,santri(nama),kategori_pembayaran(nama)');
                            if (santriId) {
                                requery = requery.eq('santri_id', santriId);
                            }
                            const reqResult = await requery;
                            if (!reqResult.error) {
                                data = reqResult.data;
                            }
                        }
                    }
                }
            }
            catch (err) {
                this.logger.error('Gagal membuat tagihan dummy:', err);
            }
        }
        return data;
    }
    async getHafalan(santriId) {
        const { data, error } = await this.supabase
            .from('hafalan')
            .select('*')
            .eq('santri_id', santriId)
            .order('tanggal', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getNilai(santriId) {
        const { data, error } = await this.supabase
            .from('nilai')
            .select(`
        id,
        nilai_tugas,
        nilai_uts,
        nilai_uas,
        nilai_akhir,
        tahun_ajaran,
        jenis_ujian,
        kategori,
        mapel (nama),
        semester:semester_id (nama)
      `)
            .eq('santri_id', santriId);
        if (error)
            throw error;
        return data;
    }
    async getPresensi(santriId) {
        const { data, error } = await this.supabase
            .from('presensi')
            .select('*')
            .eq('santri_id', santriId)
            .order('tanggal', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getWhoHasNotDepositedToday() {
        const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
        const { data: allSantri, error: err1 } = await this.supabase
            .from('santri')
            .select('id, nama, nis, kelas(nama)')
            .eq('status', 'Aktif');
        if (err1)
            throw err1;
        const { data: depositedToday, error: err2 } = await this.supabase
            .from('hafalan')
            .select('santri_id')
            .eq('tanggal', today);
        if (err2)
            throw err2;
        const depositedIds = new Set((depositedToday || []).map(h => h.santri_id));
        return (allSantri || []).filter(s => !depositedIds.has(s.id));
    }
    async getSantriByStatusPresensiToday(statusFilter) {
        const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
        const { data, error } = await this.supabase
            .from('presensi')
            .select('id, tanggal, status, keterangan, santri(id, nama, nis, kelas(nama))')
            .eq('tanggal', today)
            .ilike('status', `%${statusFilter}%`);
        if (error) {
            this.logger.error(`Error getSantriByStatusPresensiToday(${statusFilter}):`, error);
            throw error;
        }
        return data || [];
    }
    async getTotalPemasukanBulanIni() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const { data: pembayaran, error } = await this.supabase
            .from('pembayaran_santri')
            .select('jumlah')
            .gte('tanggal', firstDay)
            .lte('tanggal', lastDay);
        if (error)
            throw error;
        const { data: kasPemasukan, error: errorKas } = await this.supabase
            .from('kas_pemasukan')
            .select('jumlah')
            .gte('tanggal', firstDay)
            .lte('tanggal', lastDay);
        if (errorKas)
            throw errorKas;
        const totalPembayaran = pembayaran.reduce((sum, item) => sum + Number(item.jumlah), 0);
        const totalKas = kasPemasukan.reduce((sum, item) => sum + Number(item.jumlah), 0);
        return {
            pembayaran_santri: totalPembayaran,
            kas_pemasukan: totalKas,
            total: totalPembayaran + totalKas
        };
    }
    async getPemasukanPerbandingan() {
        const now = new Date();
        const curFirst = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const curLast = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const lastFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const lastLast = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        const getPemasukanRange = async (start, end) => {
            const { data: p, error: e1 } = await this.supabase.from('pembayaran_santri').select('jumlah').gte('tanggal', start).lte('tanggal', end);
            const { data: k, error: e2 } = await this.supabase.from('kas_pemasukan').select('jumlah').gte('tanggal', start).lte('tanggal', end);
            if (e1 || e2)
                throw (e1 || e2);
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
    async getSantriHadirHariIni() {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await this.supabase
            .from('presensi')
            .select('status')
            .eq('tanggal', today);
        if (error)
            throw error;
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
    async getSantriPalingBanyakIzin() {
        const { data, error } = await this.supabase
            .from('presensi')
            .select('santri_id, status, santri(nama)')
            .in('status', ['izin', 'Izin']);
        if (error)
            throw error;
        const countMap = {};
        data.forEach(p => {
            const id = p.santri_id;
            const santriData = p.santri;
            const nama = (Array.isArray(santriData) ? santriData[0]?.nama : santriData?.nama) || 'Unknown';
            if (!countMap[id]) {
                countMap[id] = { nama, count: 0 };
            }
            countMap[id].count++;
        });
        return Object.values(countMap).sort((a, b) => b.count - a.count);
    }
    async getTunggakanTerbesar() {
        const { data, error } = await this.supabase
            .from('tagihan_santri')
            .select('jumlah, status, santri(nama)')
            .eq('status', 'Belum Lunas');
        if (error)
            throw error;
        const countMap = {};
        data.forEach(t => {
            const santriData = t.santri;
            const nama = (Array.isArray(santriData) ? santriData[0]?.nama : santriData?.nama) || 'Unknown';
            if (!countMap[nama]) {
                countMap[nama] = { nama, total: 0 };
            }
            countMap[nama].total += Number(t.jumlah);
        });
        return Object.values(countMap).sort((a, b) => b.total - a.total);
    }
    async getTop10Hafalan() {
        const { data, error } = await this.supabase
            .from('hafalan')
            .select('santri_id, juz, surah, status, santri(nama, kelas(nama))')
            .order('juz', { ascending: false });
        if (error)
            throw error;
        const countMap = {};
        (data || []).forEach(h => {
            const id = h.santri_id;
            const santriData = h.santri;
            const nama = (Array.isArray(santriData) ? santriData[0]?.nama : santriData?.nama) || 'Santri';
            const kelasData = Array.isArray(santriData) ? santriData[0]?.kelas : santriData?.kelas;
            const kelas = (Array.isArray(kelasData) ? kelasData[0]?.nama : kelasData?.nama) || '-';
            if (!countMap[id]) {
                countMap[id] = { nama, kelas, maxJuz: 0, totalSetoran: 0 };
            }
            countMap[id].totalSetoran++;
            if (h.juz > countMap[id].maxJuz) {
                countMap[id].maxJuz = h.juz;
            }
        });
        return Object.values(countMap)
            .sort((a, b) => b.maxJuz - a.maxJuz || b.totalSetoran - a.totalSetoran)
            .slice(0, 10);
    }
    async getGuruBelumAbsen() {
        const today = new Date().toISOString().split('T')[0];
        const { data: allGuru, error: err1 } = await this.supabase
            .from('guru')
            .select('id, nama, nip')
            .eq('status', 'Aktif');
        if (err1)
            throw err1;
        if (!allGuru || allGuru.length === 0)
            return [];
        let sudahAbsenIds = new Set();
        try {
            const { data: absenGuru } = await this.supabase
                .from('presensi_guru')
                .select('guru_id')
                .eq('tanggal', today);
            if (absenGuru) {
                absenGuru.forEach(a => sudahAbsenIds.add(a.guru_id));
            }
        }
        catch {
            try {
                const { data: absenStaf } = await this.supabase
                    .from('presensi_staf')
                    .select('guru_id')
                    .eq('tanggal', today);
                if (absenStaf) {
                    absenStaf.forEach(a => sudahAbsenIds.add(a.guru_id));
                }
            }
            catch {
                this.logger.warn('Tabel presensi_guru/presensi_staf tidak ditemukan. Menampilkan semua guru aktif.');
                return allGuru;
            }
        }
        return allGuru.filter(g => !sudahAbsenIds.has(g.id));
    }
    async addNilai(santriId, mapelNama, nilaiAkhir, semester = '1', tahunAjaran = '') {
        if (!tahunAjaran) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            tahunAjaran = month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
        }
        const { data: mapelList, error: mapelErr } = await this.supabase
            .from('mapel')
            .select('id')
            .ilike('nama', `%${mapelNama}%`)
            .limit(1);
        if (mapelErr)
            throw mapelErr;
        const mapelId = mapelList && mapelList.length > 0 ? mapelList[0].id : null;
        let semesterId = null;
        const { data: semList } = await this.supabase
            .from('semester')
            .select('id')
            .ilike('nama', `%${semester}%`)
            .limit(1);
        if (semList && semList.length > 0) {
            semesterId = semList[0].id;
        }
        const payload = {
            santri_id: santriId,
            nilai_akhir: nilaiAkhir,
            tahun_ajaran: tahunAjaran,
        };
        if (semesterId)
            payload.semester_id = semesterId;
        if (mapelId)
            payload.mapel_id = mapelId;
        const { data, error } = await this.supabase
            .from('nilai')
            .insert(payload)
            .select('*')
            .single();
        if (error)
            throw error;
        return data;
    }
    async addPembayaran(santriId, categoryName, nominal, tanggal = new Date().toISOString().split('T')[0]) {
        const { data: categories, error: catErr } = await this.supabase
            .from('kategori_pembayaran')
            .select('id')
            .ilike('nama', `%${categoryName}%`);
        if (catErr || !categories || categories.length === 0) {
            throw new Error(`Kategori pembayaran '${categoryName}' tidak ditemukan.`);
        }
        const catId = categories[0].id;
        const { data: tagihan, error: tagErr } = await this.supabase
            .from('tagihan_santri')
            .select('id, jumlah, status')
            .eq('santri_id', santriId)
            .eq('kategori_id', catId)
            .eq('status', 'Belum Lunas')
            .limit(1);
        let tagihanId;
        if (tagErr || !tagihan || tagihan.length === 0) {
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
            if (newTagErr)
                throw newTagErr;
            tagihanId = newTag.id;
        }
        else {
            tagihanId = tagihan[0].id;
        }
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
        if (payErr)
            throw payErr;
        await this.supabase
            .from('tagihan_santri')
            .update({ status: 'Lunas' })
            .eq('id', tagihanId);
        return payment;
    }
    async addHafalan(santriId, juz, surah, ayatMulai, ayatSelesai, status = 'Proses') {
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
        if (error)
            throw error;
        return data;
    }
    async addAbsensi(santriId, status, keterangan = '', tanggal = new Date().toISOString().split('T')[0]) {
        const cleanStatus = status.toLowerCase().trim();
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
        if (error)
            throw error;
        return data;
    }
    async addPelanggaran(santriId, jenis, tingkat, deskripsi = '') {
        const { data, error } = await this.supabase
            .from('pelanggaran')
            .insert({
            santri_id: santriId,
            tingkat: tingkat,
            jenis: jenis,
            deskripsi: deskripsi,
            tanggal: new Date().toISOString().split('T')[0],
            status: 'OPEN'
        })
            .select('*')
            .single();
        if (error)
            throw error;
        return data;
    }
    async addCatatanPembinaan(santriId, jenis, isi) {
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
        if (error)
            throw error;
        return data;
    }
    async isMessageProcessed(messageId) {
        if (!messageId)
            return false;
        try {
            const { data, error } = await this.supabase
                .from('audit_log')
                .select('id')
                .eq('table_name', 'fonnte_webhook')
                .eq('action', 'whatsapp_message')
                .contains('new_data', { messageId })
                .limit(1);
            if (error) {
                this.logger.error(`Error checking message idempotency: ${error.message}`);
                return false;
            }
            return data && data.length > 0;
        }
        catch (e) {
            this.logger.error(`Exception checking message idempotency:`, e);
            return false;
        }
    }
    async markMessageProcessed(messageId) {
        if (!messageId)
            return;
        try {
            const { error } = await this.supabase
                .from('audit_log')
                .insert({
                action: 'whatsapp_message',
                table_name: 'fonnte_webhook',
                new_data: { messageId }
            });
            if (error) {
                this.logger.error(`Error marking message processed: ${error.message}`);
            }
        }
        catch (e) {
            this.logger.error(`Exception marking message processed:`, e);
        }
    }
    async logWebhookPayload(body, query) {
        try {
            await this.supabase
                .from('audit_log')
                .insert({
                action: 'webhook_received',
                table_name: 'fonnte_webhook',
                new_data: { body, query }
            });
        }
        catch (e) {
            this.logger.error('Gagal mencatat webhook payload ke audit_log:', e);
        }
    }
    async getRecentWebhookLogs() {
        return await this.supabase
            .from('audit_log')
            .select('*')
            .eq('table_name', 'fonnte_webhook')
            .eq('action', 'webhook_received')
            .order('created_at', { ascending: false })
            .limit(10);
    }
    async findSantriByWaliPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8)
            return [];
        const suffix = cleanPhone.slice(-9);
        const [santriRes, profilesRes] = await Promise.all([
            this.supabase
                .from('santri')
                .select('id, nama, nis, status, no_telp_wali, wali_id')
                .eq('status', 'Aktif'),
            this.supabase
                .from('user_profiles')
                .select('user_id, no_hp, nama, role')
        ]);
        const santriData = santriRes.data || [];
        const profilesData = profilesRes.data || [];
        const matchedProfileUserIds = profilesData
            .filter(p => {
            if (!p.no_hp)
                return false;
            const cleanNoHp = p.no_hp.replace(/\D/g, '');
            return cleanNoHp.endsWith(suffix) || cleanNoHp === cleanPhone;
        })
            .map(p => p.user_id);
        const matchedSantriMap = new Map();
        santriData.forEach(s => {
            let isMatch = false;
            if (s.no_telp_wali) {
                const cleanWaliPhone = s.no_telp_wali.replace(/\D/g, '');
                if (cleanWaliPhone.endsWith(suffix) || cleanWaliPhone === cleanPhone) {
                    isMatch = true;
                }
            }
            if (!isMatch && s.wali_id && matchedProfileUserIds.includes(s.wali_id)) {
                isMatch = true;
            }
            if (isMatch) {
                matchedSantriMap.set(s.id, s);
            }
        });
        return Array.from(matchedSantriMap.values());
    }
    async getDebugDbData() {
        try {
            const [santri, kategori, tagihan] = await Promise.all([
                this.supabase.from('santri').select('id, nama, nis, status, no_telp_wali'),
                this.supabase.from('kategori_pembayaran').select('id, nama, nominal_default, is_active'),
                this.supabase.from('tagihan_santri').select('id, santri_id, kategori_id, jumlah, jatuh_tempo, status, keterangan')
            ]);
            return {
                santri: santri.data || [],
                kategori: kategori.data || [],
                tagihan: tagihan.data || []
            };
        }
        catch (e) {
            this.logger.error('Gagal mengambil data debug DB:', e);
            return { error: e.message };
        }
    }
    async ensureSampleData() {
        try {
            const { count, error: countErr } = await this.supabase
                .from('santri')
                .select('*', { count: 'exact', head: true });
            if (countErr) {
                this.logger.error('Gagal mengecek jumlah santri:', countErr.message);
                return;
            }
            const currentCount = count || 0;
            if (currentCount === 0) {
                this.logger.log('Database kosong. Menginisialisasi data sample untuk demo...');
                const { data: existingCats } = await this.supabase
                    .from('kategori_pembayaran')
                    .select('id, nama, nominal_default');
                let categories = existingCats;
                if (!categories || categories.length === 0) {
                    const { data: newCats } = await this.supabase
                        .from('kategori_pembayaran')
                        .insert([
                        { nama: 'SPP Bulanan', nominal_default: 500000 },
                        { nama: 'Uang Makan', nominal_default: 300000 },
                        { nama: 'Uang Asrama', nominal_default: 200000 }
                    ])
                        .select();
                    categories = newCats;
                }
                const { data: newSantri, error: santriErr } = await this.supabase
                    .from('santri')
                    .insert([
                    { nis: 'S2026001', nama: 'Ahmad Dliaul Asykia', jenis_kelamin: 'Laki-laki', status: 'Aktif' },
                    { nis: 'S2026002', nama: 'Muhammad Rizki Pratama', jenis_kelamin: 'Laki-laki', status: 'Aktif' },
                    { nis: 'S2026003', nama: 'Abdullah Rahman', jenis_kelamin: 'Laki-laki', status: 'Aktif' }
                ])
                    .select();
                if (santriErr || !newSantri || newSantri.length === 0) {
                    this.logger.error('Gagal memasukkan sample santri:', santriErr?.message);
                    return;
                }
                if (categories && categories.length > 0) {
                    const currentYear = new Date().getFullYear();
                    const bills = [];
                    newSantri.forEach((s, sIdx) => {
                        categories.forEach((cat, cIdx) => {
                            bills.push({
                                santri_id: s.id,
                                kategori_id: cat.id,
                                jumlah: cat.nominal_default || 200000,
                                jatuh_tempo: `${currentYear}-07-10`,
                                status: sIdx === 0 && cIdx === 0 ? 'Lunas' : 'Belum Lunas',
                                keterangan: `Tagihan Bulanan ${cat.nama}`
                            });
                        });
                    });
                    const { error: billErr } = await this.supabase
                        .from('tagihan_santri')
                        .insert(bills);
                    if (billErr) {
                        this.logger.error('Gagal memasukkan sample tagihan:', billErr.message);
                    }
                    else {
                        this.logger.log('Inisialisasi data sample berhasil dilakukan.');
                    }
                }
            }
        }
        catch (err) {
            this.logger.error('Error saat memastikan data sample:', err);
        }
    }
    async getGuruByPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone)
            return null;
        const suffix = cleanPhone.slice(-9);
        const { data, error } = await this.supabase
            .from('guru')
            .select('id, nama, nip, no_telp, status')
            .eq('status', 'Aktif');
        if (error || !data)
            return null;
        const found = data.find(g => {
            if (!g.no_telp)
                return false;
            const cleanGuruPhone = g.no_telp.replace(/\D/g, '');
            return cleanGuruPhone.endsWith(suffix);
        });
        return found || null;
    }
    async isGuru(phone) {
        const guru = await this.getGuruByPhone(phone);
        return !!guru;
    }
    async hasAccessToSantri(phone, santriId) {
        const isGuru = await this.isGuru(phone);
        if (isGuru)
            return true;
        const myChildren = await this.findSantriByWaliPhone(phone);
        if (myChildren && myChildren.length > 0) {
            return myChildren.some(c => c.id === santriId);
        }
        return false;
    }
    async logAiInteraction(userPrompt, intent, functionName, parameters, query, queryResult, finalReply, responseTimeMs, errorMsg = '') {
        try {
            await this.supabase
                .from('audit_log')
                .insert({
                action: 'whatsapp_ai_log',
                table_name: 'fonnte_webhook',
                new_data: {
                    user_prompt: userPrompt,
                    intent: intent,
                    function_name: functionName,
                    parameters: parameters,
                    query: query,
                    query_result: queryResult,
                    final_reply: finalReply,
                    response_time_ms: responseTimeMs,
                    error: errorMsg
                }
            });
        }
        catch (e) {
            this.logger.error('Gagal mencatat log interaksi AI ke audit_log:', e);
        }
    }
    async getPelanggaran(santriId) {
        const { data, error } = await this.supabase
            .from('pelanggaran')
            .select('*')
            .eq('santri_id', santriId)
            .order('tanggal', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getPrestasi(santriId) {
        const { data, error } = await this.supabase
            .from('catatan_pembinaan')
            .select('*')
            .eq('santri_id', santriId)
            .eq('jenis', 'PUJIAN')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getJadwalGuru(guruId, dayName) {
        try {
            const { data: guruData } = await this.supabase
                .from('guru')
                .select('id, nama, user_id')
                .eq('id', guruId)
                .maybeSingle();
            const guruUserId = guruData?.user_id;
            let jadwalQuery = this.supabase.from('jadwal_pelajaran').select('*');
            if (dayName) {
                jadwalQuery = jadwalQuery.eq('hari', dayName);
            }
            const [jadwalRes, kelasRes, mapelRes, halaqohRes, mhRes] = await Promise.all([
                jadwalQuery,
                this.supabase.from('kelas').select('id, nama'),
                this.supabase.from('mapel').select('id, nama'),
                this.supabase.from('halaqoh').select('id, nama, musyrif_id'),
                this.supabase.from('musyrif_halaqoh').select('halaqoh_id, user_id')
            ]);
            const rawJadwal = jadwalRes.data || [];
            const kelasMap = (kelasRes.data || []).reduce((acc, k) => ({ ...acc, [k.id]: k.nama }), {});
            const mapelMap = (mapelRes.data || []).reduce((acc, m) => ({ ...acc, [m.id]: m.nama }), {});
            const halaqohList = halaqohRes.data || [];
            const halaqohMap = halaqohList.reduce((acc, h) => ({ ...acc, [h.id]: h.nama }), {});
            const myHalaqohIds = new Set();
            halaqohList.forEach(h => {
                if (h.musyrif_id === guruId)
                    myHalaqohIds.add(h.id);
            });
            if (guruUserId) {
                (mhRes.data || []).forEach(mh => {
                    if (mh.user_id === guruUserId)
                        myHalaqohIds.add(mh.halaqoh_id);
                });
            }
            const matchingSchedules = [];
            rawJadwal.forEach(j => {
                const isMyDirect = j.guru_id === guruId;
                const isMyHalaqoh = (j.tipe === 'HALAQOH' || j.halaqoh_id) && ((j.halaqoh_id && myHalaqohIds.has(j.halaqoh_id)) || isMyDirect);
                if (isMyDirect || isMyHalaqoh) {
                    const targetNama = isMyHalaqoh
                        ? (halaqohMap[j.halaqoh_id] || 'Kelompok Halaqoh')
                        : (kelasMap[j.kelas_id] || 'Kelas');
                    const mapelNama = isMyHalaqoh
                        ? 'Halaqoh Tahfidz'
                        : (mapelMap[j.mapel_id] || 'Pelajaran');
                    matchingSchedules.push({
                        id: j.id,
                        hari: j.hari,
                        tipe: isMyHalaqoh ? 'HALAQOH' : 'MADROSAH',
                        jam_ke: j.jam_ke || 1,
                        jam_mulai: j.jam_mulai,
                        jam_selesai: j.jam_selesai,
                        targetNama,
                        mapelNama
                    });
                }
            });
            const dayOrder = {
                'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, "Jum'at": 5, 'Sabtu': 6, 'Ahad': 7, 'Minggu': 7
            };
            matchingSchedules.sort((a, b) => {
                const orderA = dayOrder[a.hari] || 99;
                const orderB = dayOrder[b.hari] || 99;
                if (orderA !== orderB)
                    return orderA - orderB;
                if (a.jam_mulai && b.jam_mulai)
                    return a.jam_mulai.localeCompare(b.jam_mulai);
                return Number(a.jam_ke || 0) - Number(b.jam_ke || 0);
            });
            return {
                guruNama: guruData?.nama || 'Ustadz',
                dayName: dayName || 'Semua Hari (Mingguan)',
                schedules: matchingSchedules
            };
        }
        catch (err) {
            this.logger.error(`Error getJadwalGuru (${guruId}):`, err);
            return {
                guruNama: 'Ustadz',
                dayName: dayName || 'Semua Hari',
                schedules: []
            };
        }
    }
    async getJadwalSantri(santriId, dayName) {
        try {
            const { data: santri, error: sErr } = await this.supabase
                .from('santri')
                .select('id, nama, kelas_id, halaqoh_id')
                .eq('id', santriId)
                .maybeSingle();
            if (sErr || !santri)
                return { santriNama: 'Santri', schedules: [] };
            let jadwalQuery = this.supabase.from('jadwal_pelajaran').select('*');
            if (dayName) {
                jadwalQuery = jadwalQuery.eq('hari', dayName);
            }
            const [jadwalRes, mapelRes, guruRes, kelasRes, halaqohRes] = await Promise.all([
                jadwalQuery,
                this.supabase.from('mapel').select('id, nama'),
                this.supabase.from('guru').select('id, nama'),
                this.supabase.from('kelas').select('id, nama'),
                this.supabase.from('halaqoh').select('id, nama')
            ]);
            const rawJadwal = jadwalRes.data || [];
            const mapelMap = (mapelRes.data || []).reduce((acc, m) => ({ ...acc, [m.id]: m.nama }), {});
            const guruMap = (guruRes.data || []).reduce((acc, g) => ({ ...acc, [g.id]: g.nama }), {});
            const kelasMap = (kelasRes.data || []).reduce((acc, k) => ({ ...acc, [k.id]: k.nama }), {});
            const halaqohMap = (halaqohRes.data || []).reduce((acc, h) => ({ ...acc, [h.id]: h.nama }), {});
            const matching = rawJadwal.filter(j => {
                const isKelas = santri.kelas_id && j.kelas_id === santri.kelas_id;
                const isHalaqoh = santri.halaqoh_id && j.halaqoh_id === santri.halaqoh_id;
                return isKelas || isHalaqoh;
            });
            const formatted = matching.map(j => ({
                id: j.id,
                hari: j.hari,
                tipe: j.tipe || (j.halaqoh_id ? 'HALAQOH' : 'MADROSAH'),
                jam_ke: j.jam_ke || 1,
                jam_mulai: j.jam_mulai,
                jam_selesai: j.jam_selesai,
                mapelNama: mapelMap[j.mapel_id] || (j.tipe === 'HALAQOH' ? 'Halaqoh Tahfidz' : 'Pelajaran'),
                guruNama: guruMap[j.guru_id] || 'Ustadz Pengampu'
            }));
            formatted.sort((a, b) => {
                if (a.hari !== b.hari)
                    return 0;
                if (a.jam_mulai && b.jam_mulai)
                    return a.jam_mulai.localeCompare(b.jam_mulai);
                return Number(a.jam_ke || 0) - Number(b.jam_ke || 0);
            });
            return {
                santriNama: santri.nama,
                kelasNama: kelasMap[santri.kelas_id],
                halaqohNama: halaqohMap[santri.halaqoh_id],
                dayName: dayName || 'Semua Hari',
                schedules: formatted
            };
        }
        catch (err) {
            this.logger.error(`Error getJadwalSantri (${santriId}):`, err);
            return {
                santriNama: 'Santri',
                dayName: dayName || 'Semua Hari',
                schedules: []
            };
        }
    }
    async getKalenderAkademik(filterUpcoming = true) {
        try {
            const today = new Date().toISOString().split('T')[0];
            let query = this.supabase
                .from('kalender_akademik')
                .select('*')
                .order('tanggal_mulai', { ascending: true });
            if (filterUpcoming) {
                const firstDayOfMonth = today.slice(0, 7) + '-01';
                query = query.gte('tanggal_selesai', firstDayOfMonth);
            }
            const { data, error } = await query.limit(10);
            if (error)
                throw error;
            return data || [];
        }
        catch (err) {
            this.logger.warn('Gagal mengambil kalender akademik:', err);
            return [];
        }
    }
    async getPerizinanSantri(santriId) {
        try {
            const { data, error } = await this.supabase
                .from('presensi')
                .select('id, tanggal, status, keterangan, created_at')
                .eq('santri_id', santriId)
                .in('status', ['izin', 'Izin', 'sakit', 'Sakit'])
                .order('tanggal', { ascending: false })
                .limit(10);
            if (error)
                throw error;
            return data || [];
        }
        catch (err) {
            this.logger.error(`Error getPerizinanSantri (${santriId}):`, err);
            return [];
        }
    }
    async getPerizinanGuru(guruId) {
        try {
            const { data, error } = await this.supabase
                .from('izin_guru')
                .select('*')
                .eq('guru_id', guruId)
                .order('tanggal_mulai', { ascending: false })
                .limit(5);
            if (error)
                throw error;
            return data || [];
        }
        catch (err) {
            this.logger.warn(`Error getPerizinanGuru (${guruId}):`, err);
            return [];
        }
    }
    getInfoPondok(topik) {
        const rawTopik = (topik || '').toLowerCase();
        const info = {
            namaPondok: "Pesantren Tahfidz Al-Qur'an Al-Usymuni (PTQA) Batuan",
            alamat: "Kompleks Pondok Pesantren Al-Usymuni, Desa Batuan, Kec. Batuan, Kab. Sumenep, Madura, Jawa Timur 69451",
            sambangan: {
                hari: "Setiap Hari Ahad (Minggu)",
                jam: "Pukul 08.00 - 17.00 WIB",
                aturan: "Wali santri melapor ke pos keamanan/pengurus, berbusana muslim/muslimah rapi & sopan, dan menjaga kebersihan lingkungan pondok."
            },
            rekening: {
                bank: "Bank Syariah Indonesia (BSI)",
                nomor: "7188899912",
                atasNama: "Pesantren Tahfidz Al-Qur'an Al-Usymuni",
                konfirmasi: "Kirim bukti transfer ke WhatsApp CS SI-TAQUA ini atau bendahara pondok."
            },
            kirimanPaket: {
                aturan: "Paket barang atau makanan dititipkan melalui Pos Keamanan / Pengurus Putra/Putri dengan mencantumkan Nama Lengkap Santri dan Kelas/Kamar."
            },
            kegiatanHarian: {
                madrasah: "KBM Sekolah Pagi: 07.00 - 12.00 WIB",
                halaqoh: "Tahfidz Al-Qur'an: Ba'da Subuh, Ba'da Ashar, dan Ba'da Maghrib/Isya"
            }
        };
        if (rawTopik.includes('kunjung') || rawTopik.includes('sambang') || rawTopik.includes('besuk') || rawTopik.includes('jenguk')) {
            return { topik: 'sambangan', data: info.sambangan, namaPondok: info.namaPondok };
        }
        if (rawTopik.includes('rekening') || rawTopik.includes('transfer') || rawTopik.includes('bayar') || rawTopik.includes('bank')) {
            return { topik: 'rekening', data: info.rekening, namaPondok: info.namaPondok };
        }
        if (rawTopik.includes('alamat') || rawTopik.includes('lokasi') || rawTopik.includes('peta') || rawTopik.includes('tempat')) {
            return { topik: 'alamat', alamat: info.alamat, namaPondok: info.namaPondok };
        }
        if (rawTopik.includes('paket') || rawTopik.includes('kirim') || rawTopik.includes('titip')) {
            return { topik: 'paket', data: info.kirimanPaket, namaPondok: info.namaPondok };
        }
        return { topik: 'umum', info };
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map