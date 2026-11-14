import { Controller, Get, Post, Query, Res, HttpStatus, Logger, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { SchedulerService } from './scheduler.service';

@Controller('')
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  /**
   * Endpoint Cron / Manual Trigger untuk mengirim pengingat jadwal guru hari ini
   * Dipanggil otomatis oleh Vercel Cron setiap jam 06:00 WIB (23:00 UTC)
   * Mendukung path alias: /api/scheduler/remind-guru, /scheduler/remind-guru, /remind-guru
   */
  @Get(['api/scheduler/remind-guru', 'scheduler/remind-guru', 'remind-guru'])
  async handleRemindGuruGet(@Query('date') date: string, @Res() res: Response) {
    this.logger.log(`[SchedulerController] GET remind-guru triggered${date ? ` (date: ${date})` : ''}`);
    try {
      const summary = await this.schedulerService.executeTeacherReminders(date);
      return res.status(HttpStatus.OK).json({
        success: true,
        timestamp: new Date().toISOString(),
        summary
      });
    } catch (err: any) {
      this.logger.error(`[SchedulerController] Error executing teacher reminders: ${err.message || err}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: err.message || 'Internal server error'
      });
    }
  }

  @Post(['api/scheduler/remind-guru', 'scheduler/remind-guru', 'remind-guru'])
  async handleRemindGuruPost(@Query('date') date: string, @Res() res: Response) {
    return this.handleRemindGuruGet(date, res);
  }

  /**
   * Endpoint Preview: Melihat daftar guru & jadwal hari ini beserta format pesan WA tanpa mengirim ke Fonnte
   */
  @Get(['api/scheduler/preview-today', 'scheduler/preview-today', 'preview-today'])
  async handlePreviewToday(@Query('date') date: string, @Res() res: Response) {
    try {
      const scheduleData = await this.schedulerService.getTodayTeacherSchedules(date);
      
      const previews = (scheduleData.guruGroups || []).map(g => ({
        guruId: g.guruId,
        namaGuru: g.namaGuru,
        noTelp: g.noTelp || '(Belum Terisi)',
        jadwalCount: g.jadwal.length,
        jadwal: g.jadwal,
        sampleMessage: this.schedulerService.formatReminderMessage(
          g.namaGuru,
          scheduleData.dayName,
          scheduleData.formattedDate,
          g.jadwal
        )
      }));

      return res.status(HttpStatus.OK).json({
        success: true,
        date: scheduleData.dateStr,
        day: scheduleData.dayName,
        formattedDate: scheduleData.formattedDate,
        isHoliday: scheduleData.isHoliday,
        holidayReason: scheduleData.holidayReason,
        totalTeachers: previews.length,
        previews
      });
    } catch (err: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: err.message || 'Internal server error'
      });
    }
  }
}

