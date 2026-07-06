import { Response, Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { AiService } from '../ai/ai.service';
export declare class WebhookController {
    private readonly supabaseService;
    private readonly aiService;
    private readonly logger;
    private pendingActions;
    private processedMessages;
    constructor(supabaseService: SupabaseService, aiService: AiService);
    private isSamePhone;
    private cleanupExpiredPending;
    private cleanupExpiredProcessed;
    private sendFonnteMessage;
    private replyToUser;
    getDebugLogs(res: Response): Promise<Response<any, Record<string, any>>>;
    handleWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private executeAction;
}
