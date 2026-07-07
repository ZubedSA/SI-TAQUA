export declare class SupabaseService {
    private readonly logger;
    private supabase;
    constructor();
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
        semester: any;
        tahun_ajaran: any;
        mapel: {
            nama: any;
        }[];
    }[]>;
    getPresensi(santriId: string): Promise<any[]>;
    getWhoHasNotDepositedToday(): Promise<{
        id: any;
        nama: any;
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
        maxJuz: number;
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
    findSantriByWaliPhone(phone: string): Promise<boolean | {
        id: any;
        nama: any;
        nis: any;
        status: any;
        no_telp_wali: any;
    }[] | {
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
    hasAccessToSantri(phone: string, santriId: string): Promise<boolean>;
    logAiInteraction(userPrompt: string, intent: string, functionName: string, parameters: any, query: string, queryResult: any, finalReply: string, responseTimeMs: number, errorMsg?: string): Promise<void>;
    getPelanggaran(santriId: string): Promise<any[]>;
    getPrestasi(santriId: string): Promise<any[]>;
}
