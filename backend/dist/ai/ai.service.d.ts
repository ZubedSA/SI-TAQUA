export interface CallerContext {
    isGuru?: boolean;
    guruNama?: string;
    isWali?: boolean;
    children?: Array<{
        id: string;
        nama: string;
        nis?: string;
    }>;
}
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
    private readonly NON_SANTRI_STOPWORDS;
    private cleanSantriName;
    parseIntentLocal(userPrompt: string, sender: string, callerContext?: CallerContext): any;
    parseIntent(userPrompt: string, sender: string, callerContext?: CallerContext): Promise<any>;
    private formatResponseWithGemini;
    private generateResponseLocal;
    generateResponse(userPrompt: string, intent: string, dbResult: any, sender: string, isGuru?: boolean, guruName?: string): Promise<string>;
}
