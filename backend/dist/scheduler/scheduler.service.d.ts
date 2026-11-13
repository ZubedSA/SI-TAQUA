import { SupabaseService } from '../supabase/supabase.service';
export interface SesiMengajar {
    tipe: 'MADROSAH' | 'HALAQOH';
    jam_ke: number;
    jam_mulai?: string;
    jam_selesai?: string;
    targetNama: string;
    mapelNama?: string;
}
export interface GuruScheduleGroup {
    guruId: string;
    namaGuru: string;
    noTelp: string;
    jadwal: SesiMengajar[];
}
export declare class SchedulerService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    getWIBDateInfo(overrideDateStr?: string): {
        dateStr: string;
        dayName: string;
        formattedDate: string;
    };
    getActiveHolidays(dateStr: string): Promise<any[]>;
    getTodayTeacherSchedules(overrideDateStr?: string): Promise<{
        dateStr: string;
        dayName: string;
        formattedDate: string;
        isHoliday: boolean;
        holidayReason: string;
        guruGroups: any[];
    } | {
        dateStr: string;
        dayName: string;
        formattedDate: string;
        isHoliday: boolean;
        guruGroups: GuruScheduleGroup[];
        holidayReason?: undefined;
    }>;
    formatReminderMessage(namaGuru: string, hari: string, tanggal: string, jadwal: SesiMengajar[]): string;
    formatPhoneNumber(phone: string): string;
    sendFonnte(target: string, message: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }>;
    executeTeacherReminders(overrideDateStr?: string): Promise<{
        success: boolean;
        skipped: boolean;
        message: string;
        date: string;
        results: any[];
        day?: undefined;
        totalTeachers?: undefined;
        successCount?: undefined;
        failedCount?: undefined;
        noPhoneCount?: undefined;
    } | {
        success: boolean;
        skipped: boolean;
        date: string;
        day: string;
        totalTeachers: number;
        successCount: number;
        failedCount: number;
        noPhoneCount: number;
        results: any[];
        message?: undefined;
    }>;
}
