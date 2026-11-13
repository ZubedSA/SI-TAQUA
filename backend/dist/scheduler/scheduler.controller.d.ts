import { Response } from 'express';
import { SchedulerService } from './scheduler.service';
export declare class SchedulerController {
    private readonly schedulerService;
    private readonly logger;
    constructor(schedulerService: SchedulerService);
    handleRemindGuruGet(date: string, res: Response): Promise<Response<any, Record<string, any>>>;
    handleRemindGuruPost(date: string, res: Response): Promise<Response<any, Record<string, any>>>;
    handlePreviewToday(date: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
