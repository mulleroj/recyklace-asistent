import { WasteItem } from '../types';

/**
 * AI Provider types
 */
export enum AIProvider {
    GEMINI = 'gemini',
    OPENAI = 'openai',
    NONE = 'none'
}

/**
 * Configuration for AI Service
 */
export interface AIServiceConfig {
    apiKey: string;
    provider: AIProvider;
}

/**
 * Parameters for identifying waste
 */
export interface IdentifyWasteParams {
    query?: string;
    image?: {
        data: string;
        mimeType: string;
    };
}

/**
 * Common interface for all AI providers
 */
export interface AIService {
    /**
     * Identify waste item from query or image
     */
    identifyWaste(params: IdentifyWasteParams): Promise<WasteItem>;

    /**
     * Validate if API key is valid
     */
    validateApiKey?(apiKey: string): Promise<boolean>;
}

/**
 * Custom error for API-related issues
 */
export class ApiKeyError extends Error {
    constructor(
        message: string,
        public shouldPromptForKey: boolean = true,
        public provider?: AIProvider
    ) {
        super(message);
        this.name = 'ApiKeyError';
    }
}

/**
 * Helper to get provider display name
 */
export function getProviderDisplayName(provider: AIProvider): string {
    const names: Record<AIProvider, string> = {
        [AIProvider.GEMINI]: 'Google Gemini',
        [AIProvider.OPENAI]: 'OpenAI GPT-4',
        [AIProvider.NONE]: 'Žádný'
    };
    return names[provider];
}

/**
 * Helper to get provider icon
 */
export function getProviderIcon(provider: AIProvider): string {
    const icons: Record<AIProvider, string> = {
        [AIProvider.GEMINI]: '🔷',
        [AIProvider.OPENAI]: '🟢',
        [AIProvider.NONE]: '❌'
    };
    return icons[provider];
}

/**
 * Helper to get API key signup URL
 */
export function getProviderSignupUrl(provider: AIProvider): string {
    const urls: Record<AIProvider, string> = {
        [AIProvider.GEMINI]: 'https://aistudio.google.com/app/apikey',
        [AIProvider.OPENAI]: 'https://platform.openai.com/api-keys',
        [AIProvider.NONE]: ''
    };
    return urls[provider];
}
