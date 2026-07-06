import { Response, Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { AiService } from '../ai/ai.service';
export declare class WebhookController {
    private readonly supabaseService;
    private readonly aiService;
    private readonly logger;
    private pendingActions;
    constructor(supabaseService: SupabaseService, aiService: AiService);
    private sendFonnteMessage;
    private replyToUser;
    handleWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private executeAction;
}
