export declare class AiService {
    private readonly logger;
    private conversationMemory;
    private genAI;
    private geminiParserModel;
    private geminiResponseModel;
    constructor();
    private getContext;
    setContext(sender: string, intent: string, santriName: string): void;
    private addToHistory;
    private parseIntentWithGemini;
    private cleanSantriName;
    private parseIntentLocal;
    parseIntent(userPrompt: string, sender: string): Promise<any>;
    private formatResponseWithGemini;
    private generateResponseLocal;
    generateResponse(userPrompt: string, intent: string, dbResult: any, sender: string): Promise<string>;
}
