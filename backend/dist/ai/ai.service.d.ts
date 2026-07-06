export declare class AiService {
    private readonly logger;
    private conversationMemory;
    constructor();
    private getContext;
    private setContext;
    parseIntent(userPrompt: string, sender: string): Promise<any>;
    generateResponse(userPrompt: string, intent: string, dbResult: any, sender: string): Promise<string>;
}
