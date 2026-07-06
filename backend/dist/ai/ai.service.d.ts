export declare class AiService {
    private readonly logger;
    private conversationMemory;
    private genAI;
    private geminiModel;
    constructor();
    private getContext;
    private setContext;
    private addToHistory;
    private parseIntentWithGemini;
    private parseIntentLocal;
    parseIntent(userPrompt: string, sender: string): Promise<any>;
    private generateResponseWithGemini;
    private generateResponseLocal;
    generateResponse(userPrompt: string, intent: string, dbResult: any, sender: string): Promise<string>;
}
