import { Response, Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { AiService } from '../ai/ai.service';
export declare class WebhookController {
    private readonly supabaseService;
    private readonly aiService;
    private readonly logger;
    private pendingActions;
    private processedMessages;
    private sentMessages;
    constructor(supabaseService: SupabaseService, aiService: AiService);
    private normalizeText;
    private isSamePhone;
    private isBotSentMessage;
    private handleSantriMatches;
    private cleanupExpiredPending;
    private cleanupExpiredProcessed;
    private cleanupExpiredSentMessages;
    private sendFonnteMessage;
    private replyToUser;
    getDebugLogs(res: Response): Promise<Response<any, Record<string, any>>>;
    getDebugDb(res: Response): Promise<Response<any, Record<string, any>>>;
    handleWebhookPost(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleWebhookGet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleRootPost(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    handleRootGet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private handleWebhook;
    private executeAction;
}
