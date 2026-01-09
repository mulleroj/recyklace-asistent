import {
    AIProvider,
    AIService,
    ApiKeyError
} from './aiProviderInterface';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openaiService';

// LocalStorage keys
const PROVIDER_KEY = 'recyklacni_asistent_ai_provider';
const GEMINI_API_KEY = 'recyklacni_asistent_api_key_gemini';
const OPENAI_API_KEY = 'recyklacni_asistent_api_key_openai';

// Legacy key for backward compatibility
const LEGACY_API_KEY = 'recyklacni_asistent_api_key';

/**
 * AI Provider Manager - Singleton
 * Manages AI provider selection and API keys
 */
export class AIProviderManager {
    private static instance: AIProviderManager;

    private constructor() {
        // Migrate legacy API key to Gemini key
        this.migrateLegacyKey();
    }

    static getInstance(): AIProviderManager {
        if (!AIProviderManager.instance) {
            AIProviderManager.instance = new AIProviderManager();
        }
        return AIProviderManager.instance;
    }

    /**
     * Migrate legacy single API key to provider-specific key
     */
    private migrateLegacyKey(): void {
        const legacyKey = localStorage.getItem(LEGACY_API_KEY);
        if (legacyKey && !this.getApiKey(AIProvider.GEMINI)) {
            // Move legacy key to Gemini (it was Gemini before)
            this.setApiKey(AIProvider.GEMINI, legacyKey);
            // Don't delete legacy key yet in case user downgrades
        }
    }

    /**
     * Get current AI provider
     */
    getCurrentProvider(): AIProvider {
        const saved = localStorage.getItem(PROVIDER_KEY);
        if (saved && Object.values(AIProvider).includes(saved as AIProvider)) {
            return saved as AIProvider;
        }

        // Default: check which API key exists
        if (this.getApiKey(AIProvider.GEMINI)) {
            return AIProvider.GEMINI;
        }
        if (this.getApiKey(AIProvider.OPENAI)) {
            return AIProvider.OPENAI;
        }

        return AIProvider.NONE;
    }

    /**
     * Set current AI provider
     */
    setProvider(provider: AIProvider): void {
        localStorage.setItem(PROVIDER_KEY, provider);
    }

    /**
     * Get API key for specific provider
     */
    getApiKey(provider: AIProvider): string | null {
        switch (provider) {
            case AIProvider.GEMINI:
                return localStorage.getItem(GEMINI_API_KEY);
            case AIProvider.OPENAI:
                return localStorage.getItem(OPENAI_API_KEY);
            default:
                return null;
        }
    }

    /**
     * Set API key for specific provider
     */
    setApiKey(provider: AIProvider, key: string): void {
        switch (provider) {
            case AIProvider.GEMINI:
                localStorage.setItem(GEMINI_API_KEY, key);
                // Also set legacy key for backward compatibility
                localStorage.setItem(LEGACY_API_KEY, key);
                break;
            case AIProvider.OPENAI:
                localStorage.setItem(OPENAI_API_KEY, key);
                break;
        }
        // Auto-switch to this provider when key is set
        this.setProvider(provider);
    }

    /**
     * Clear API key for specific provider
     */
    clearApiKey(provider: AIProvider): void {
        switch (provider) {
            case AIProvider.GEMINI:
                localStorage.removeItem(GEMINI_API_KEY);
                localStorage.removeItem(LEGACY_API_KEY);
                break;
            case AIProvider.OPENAI:
                localStorage.removeItem(OPENAI_API_KEY);
                break;
        }
    }

    /**
     * Check if provider has valid API key
     */
    hasApiKey(provider?: AIProvider): boolean {
        const targetProvider = provider || this.getCurrentProvider();
        const key = this.getApiKey(targetProvider);
        return !!key && key.length > 0;
    }

    /**
     * Get AIService instance for current provider
     */
    getAIService(): AIService | null {
        const provider = this.getCurrentProvider();
        const apiKey = this.getApiKey(provider);

        if (!apiKey) {
            return null;
        }

        switch (provider) {
            case AIProvider.GEMINI:
                return new GeminiService(apiKey);
            case AIProvider.OPENAI:
                return new OpenAIService(apiKey);
            default:
                return null;
        }
    }

    /**
     * Get AIService for specific provider
     */
    getAIServiceForProvider(provider: AIProvider): AIService | null {
        const apiKey = this.getApiKey(provider);
        if (!apiKey) {
            return null;
        }

        switch (provider) {
            case AIProvider.GEMINI:
                return new GeminiService(apiKey);
            case AIProvider.OPENAI:
                return new OpenAIService(apiKey);
            default:
                return null;
        }
    }
}

// Backward compatibility exports
// These maintain the old API while using the new manager
export const getApiKey = (): string | null => {
    const manager = AIProviderManager.getInstance();
    const provider = manager.getCurrentProvider();
    return manager.getApiKey(provider);
};

export const setApiKey = (key: string): void => {
    const manager = AIProviderManager.getInstance();
    // Default to Gemini for backward compatibility
    manager.setApiKey(AIProvider.GEMINI, key);
};

export const clearApiKey = (): void => {
    const manager = AIProviderManager.getInstance();
    const provider = manager.getCurrentProvider();
    manager.clearApiKey(provider);
};

export const hasApiKey = (): boolean => {
    return AIProviderManager.getInstance().hasApiKey();
};

// New convenience function
export const identifyWaste = async (params: any): Promise<any> => {
    const service = AIProviderManager.getInstance().getAIService();
    if (!service) {
        throw new ApiKeyError(
            'API klíč nebyl zadán. Prosím zadejte API klíč v nastavení.',
            true
        );
    }
    return service.identifyWaste(params);
};
