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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SchedulerController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerController = void 0;
const common_1 = require("@nestjs/common");
const scheduler_service_1 = require("./scheduler.service");
let SchedulerController = SchedulerController_1 = class SchedulerController {
    constructor(schedulerService) {
        this.schedulerService = schedulerService;
        this.logger = new common_1.Logger(SchedulerController_1.name);
    }
    async handleRemindGuruGet(date, res) {
        this.logger.log(`[SchedulerController] GET remind-guru triggered${date ? ` (date: ${date})` : ''}`);
        try {
            const summary = await this.schedulerService.executeTeacherReminders(date);
            return res.status(common_1.HttpStatus.OK).json({
                success: true,
                timestamp: new Date().toISOString(),
                summary
            });
        }
        catch (err) {
            this.logger.error(`[SchedulerController] Error executing teacher reminders: ${err.message || err}`);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: err.message || 'Internal server error'
            });
        }
    }
    async handleRemindGuruPost(date, res) {
        return this.handleRemindGuruGet(date, res);
    }
    async handlePreviewToday(date, res) {
        try {
            const scheduleData = await this.schedulerService.getTodayTeacherSchedules(date);
            const previews = (scheduleData.guruGroups || []).map(g => ({
                guruId: g.guruId,
                namaGuru: g.namaGuru,
                noTelp: g.noTelp || '(Belum Terisi)',
                jadwalCount: g.jadwal.length,
                jadwal: g.jadwal,
                sampleMessage: this.schedulerService.formatReminderMessage(g.namaGuru, scheduleData.dayName, scheduleData.formattedDate, g.jadwal)
            }));
            return res.status(common_1.HttpStatus.OK).json({
                success: true,
                date: scheduleData.dateStr,
                day: scheduleData.dayName,
                formattedDate: scheduleData.formattedDate,
                isHoliday: scheduleData.isHoliday,
                holidayReason: scheduleData.holidayReason,
                totalTeachers: previews.length,
                previews
            });
        }
        catch (err) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: err.message || 'Internal server error'
            });
        }
    }
};
exports.SchedulerController = SchedulerController;
__decorate([
    (0, common_1.Get)(['api/scheduler/remind-guru', 'scheduler/remind-guru', 'remind-guru']),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "handleRemindGuruGet", null);
__decorate([
    (0, common_1.Post)(['api/scheduler/remind-guru', 'scheduler/remind-guru', 'remind-guru']),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "handleRemindGuruPost", null);
__decorate([
    (0, common_1.Get)(['api/scheduler/preview-today', 'scheduler/preview-today', 'preview-today']),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "handlePreviewToday", null);
exports.SchedulerController = SchedulerController = SchedulerController_1 = __decorate([
    (0, common_1.Controller)(''),
    __metadata("design:paramtypes", [scheduler_service_1.SchedulerService])
], SchedulerController);
//# sourceMappingURL=scheduler.controller.js.map