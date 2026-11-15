import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private readonly logger;
    private supabase;
    constructor();
    getClient(): SupabaseClient;
    findSantriByName(name: string): Promise<{
        id: any;
        nama: any;
        nis: any;
        status: any;
        kelas_id: any;
        halaqoh_id: any;
        kelas: {
            nama: any;
        }[];
    }[]>;
    findGuruByName(name: string): Promise<{
        id: any;
        nama: any;
        nip: any;
        status: any;
    }[]>;
    getActiveSantriCount(): Promise<number>;
    getSantriStatistics(filter?: {
        kelas?: string;
        halaqoh?: string;
        status?: string;
        detail?: boolean;
    }): Promise<{
        type: string;
        query: string;
        matchedKelas: any[];
        total: number;
        santriNames: any[];
        allKelasAvailable: any[];
        matchedHalaqoh?: undefined;
        allHalaqohAvailable?: undefined;
        breakdown?: undefined;
    } | {
        type: string;
        query: string;
        matchedHalaqoh: any[];
        total: number;
        santriNames: any[];
        allHalaqohAvailable: any[];
        matchedKelas?: undefined;
        allKelasAvailable?: undefined;
        breakdown?: undefined;
    } | {
        type: string;
        total: number;
        breakdown: {
            kelas: any;
            count: number;
        }[];
        allKelasAvailable: any[];
        query?: undefined;
        matchedKelas?: undefined;
        santriNames?: undefined;
        matchedHalaqoh?: undefined;
        allHalaqohAvailable?: undefined;
    } | {
        type: string;
        total: number;
        breakdown: any[];
        query?: undefined;
        matchedKelas?: undefined;
        santriNames?: undefined;
        allKelasAvailable?: undefined;
        matchedHalaqoh?: undefined;
        allHalaqohAvailable?: undefined;
    }>;
    checkPembayaran(santriId: string, month?: string): Promise<{
        id: any;
        jumlah: any;
        jatuh_tempo: any;
        status: any;
        keterangan: any;
        santri: {
            nama: any;
        }[];
        kategori_pembayaran: {
            nama: any;
        }[];
    }[]>;
    getHafalan(santriId: string): Promise<any[]>;
    getNilai(santriId: string): Promise<{
        id: any;
        nilai_tugas: any;
        nilai_uts: any;
        nilai_uas: any;
        nilai_akhir: any;
        tahun_ajaran: any;
        jenis_ujian: any;
        kategori: any;
        mapel: {
            nama: any;
        }[];
        semester: {
            nama: any;
        }[];
    }[]>;
    getPresensi(santriId: string): Promise<any[]>;
    getWhoHasNotDepositedToday(): Promise<{
        id: any;
        nama: any;
        nis: any;
        kelas: {
            nama: any;
        }[];
    }[]>;
    getSantriByStatusPresensiToday(statusFilter: string): Promise<{
        id: any;
        tanggal: any;
        status: any;
        keterangan: any;
        santri: {
            id: any;
            nama: any;
            nis: any;
            kelas: {
                nama: any;
            }[];
        }[];
    }[]>;
    getTotalPemasukanBulanIni(): Promise<{
        pembayaran_santri: number;
        kas_pemasukan: number;
        total: number;
    }>;
    getPemasukanPerbandingan(): Promise<{
        bulan_ini: number;
        bulan_lalu: number;
        selisih: number;
        persentase: number;
    }>;
    getSantriHadirHariIni(): Promise<{
        total: number;
        hadir: number;
        izin: number;
        sakit: number;
        alpha: number;
    }>;
    getSantriPalingBanyakIzin(): Promise<{
        nama: string;
        count: number;
    }[]>;
    getTunggakanTerbesar(): Promise<{
        nama: string;
        total: number;
    }[]>;
    getTop10Hafalan(): Promise<{
        nama: string;
        kelas: string;
        maxJuz: number;
        totalSetoran: number;
    }[]>;
    getGuruBelumAbsen(): Promise<{
        id: any;
        nama: any;
        nip: any;
    }[]>;
    addNilai(santriId: string, mapelNama: string, nilaiAkhir: number, semester?: string, tahunAjaran?: string): Promise<any>;
    addPembayaran(santriId: string, categoryName: string, nominal: number, tanggal?: string): Promise<any>;
    addHafalan(santriId: string, juz: number, surah: string, ayatMulai: number, ayatSelesai: number, status?: string): Promise<any>;
    addAbsensi(santriId: string, status: string, keterangan?: string, tanggal?: string): Promise<any>;
    addPelanggaran(santriId: string, jenis: string, tingkat: number, deskripsi?: string): Promise<any>;
    addCatatanPembinaan(santriId: string, jenis: 'UMUM' | 'KONSELING' | 'PEMBINAAN' | 'PUJIAN' | 'CATATAN', isi: string): Promise<any>;
    isMessageProcessed(messageId: string): Promise<boolean>;
    markMessageProcessed(messageId: string): Promise<void>;
    logWebhookPayload(body: any, query: any): Promise<void>;
    getRecentWebhookLogs(): Promise<import("@supabase/postgrest-js").PostgrestSingleResponse<any[]>>;
    findSantriByWaliPhone(phone: string): Promise<any[]>;
    getDebugDbData(): Promise<{
        santri: {
            id: any;
            nama: any;
            nis: any;
            status: any;
            no_telp_wali: any;
        }[];
        kategori: {
            id: any;
            nama: any;
            nominal_default: any;
            is_active: any;
        }[];
        tagihan: {
            id: any;
            santri_id: any;
            kategori_id: any;
            jumlah: any;
            jatuh_tempo: any;
            status: any;
            keterangan: any;
        }[];
        error?: undefined;
    } | {
        error: any;
        santri?: undefined;
        kategori?: undefined;
        tagihan?: undefined;
    }>;
    ensureSampleData(): Promise<void>;
    getGuruByPhone(phone: string): Promise<any | null>;
    isGuru(phone: string): Promise<boolean>;
    hasAccessToSantri(phone: string, santriId: string): Promise<boolean>;
    logAiInteraction(userPrompt: string, intent: string, functionName: string, parameters: any, query: string, queryResult: any, finalReply: string, responseTimeMs: number, errorMsg?: string): Promise<void>;
    getPelanggaran(santriId: string): Promise<any[]>;
    getPrestasi(santriId: string): Promise<any[]>;
    getJadwalGuru(guruId: string, dayName?: string): Promise<{
        guruNama: any;
        dayName: string;
        schedules: any[];
    }>;
    getJadwalSantri(santriId: string, dayName?: string): Promise<{
        santriNama: string;
        schedules: any[];
        kelasNama?: undefined;
        halaqohNama?: undefined;
        dayName?: undefined;
    } | {
        santriNama: any;
        kelasNama: any;
        halaqohNama: any;
        dayName: string;
        schedules: {
            id: any;
            hari: any;
            tipe: any;
            jam_ke: any;
            jam_mulai: any;
            jam_selesai: any;
            mapelNama: any;
            guruNama: any;
        }[];
    } | {
        santriNama: string;
        dayName: string;
        schedules: any[];
        kelasNama?: undefined;
        halaqohNama?: undefined;
    }>;
    getKalenderAkademik(filterUpcoming?: boolean): Promise<any[]>;
    getPerizinanSantri(santriId: string): Promise<{
        id: any;
        tanggal: any;
        status: any;
        keterangan: any;
        created_at: any;
    }[]>;
    getPerizinanGuru(guruId: string): Promise<any[]>;
    getInfoPondok(topik?: string): {
        topik: string;
        data: {
            bank: string;
            nomor: string;
            atasNama: string;
            konfirmasi: string;
        };
        namaPondok: string;
        alamat?: undefined;
        info?: undefined;
    } | {
        topik: string;
        alamat: string;
        namaPondok: string;
        data?: undefined;
        info?: undefined;
    } | {
        topik: string;
        data: {
            aturan: string;
        };
        namaPondok: string;
        alamat?: undefined;
        info?: undefined;
    } | {
        topik: string;
        info: {
            namaPondok: string;
            alamat: string;
            sambangan: {
                hari: string;
                jam: string;
                aturan: string;
            };
            rekening: {
                bank: string;
                nomor: string;
                atasNama: string;
                konfirmasi: string;
            };
            kirimanPaket: {
                aturan: string;
            };
            kegiatanHarian: {
                madrasah: string;
                halaqoh: string;
            };
        };
        data?: undefined;
        namaPondok?: undefined;
        alamat?: undefined;
    };
}
