import { WasteItem } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants';
import {
    AIService,
    IdentifyWasteParams,
    ApiKeyError,
    AIProvider
} from './aiProviderInterface';

const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * OpenAI service implementation
 * Uses GPT-4 for text queries and GPT-4 Vision for images
 */
export class OpenAIService implements AIService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async identifyWaste({ query, image }: IdentifyWasteParams): Promise<WasteItem> {
        if (!this.apiKey) {
            throw new ApiKeyError(
                'OpenAI API klíč nebyl zadán. Prosím zadejte váš OpenAI API klíč.',
                true,
                AIProvider.OPENAI
            );
        }

        try {
            const messages: any[] = [];

            // Build the system message
            messages.push({
                role: 'system',
                content: SYSTEM_INSTRUCTION
            });

            // Build user message
            const userMessageParts: any[] = [];

            let promptText = '';
            if (query) {
                promptText += `Uživatel popsal předmět jako: "${query}"\n`;
            }

            if (image) {
                promptText += 'Proveď důkladnou vizuální analýzu přiloženého obrázku. Zohledni možné odlesky, stíny a texturu materiálu. Hledej recyklační kódy a symboly. Identifikuj předmět a urči jeho správnou recyklační kategorii pro ČR.';

                userMessageParts.push({
                    type: 'text',
                    text: promptText
                });

                userMessageParts.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:${image.mimeType};base64,${image.data}`
                    }
                });
            } else {
                userMessageParts.push({
                    type: 'text',
                    text: promptText
                });
            }

            messages.push({
                role: 'user',
                content: userMessageParts
            });

            // Choose model based on whether we have an image
            const model = image ? 'gpt-4-turbo' : 'gpt-4-turbo';

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw await this.handleApiError(response.status, errorData);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';

            // Extract JSON from response (may be wrapped in markdown code block)
            let jsonStr = text || '{}';
            const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            } else {
                // Try to find raw JSON
                const rawJsonMatch = jsonStr.match(/\{[\s\S]*\}/);
                if (rawJsonMatch) {
                    jsonStr = rawJsonMatch[0];
                }
            }

            const parsed = JSON.parse(jsonStr);
            return {
                id: Math.random().toString(36).substring(7),
                name: parsed.name || (query || 'Neznámý předmět'),
                category: parsed.category,
                note: parsed.note,
                isFromDatabase: parsed.isFromDatabase
            };
        } catch (error: any) {
            console.error('OpenAI Error Details:', {
                message: error?.message,
                status: error?.status,
                error: error
            });

            // If it's already an ApiKeyError, re-throw it
            if (error instanceof ApiKeyError) {
                throw error;
            }

            // Show actual error message for debugging
            const displayError = error?.message?.substring(0, 200) || 'Neznámá chyba';
            throw new ApiKeyError(
                `Chyba OpenAI: ${displayError}`,
                false,
                AIProvider.OPENAI
            );
        }
    }

    /**
     * Handle API errors with specific messages
     */
    private async handleApiError(status: number, errorData: any): Promise<ApiKeyError> {
        const errorMessage = errorData?.error?.message || '';
        const errorType = errorData?.error?.type || '';

        switch (status) {
            case 401:
                return new ApiKeyError(
                    'Neplatný OpenAI API klíč. Zkontrolujte prosím váš klíč a zkuste to znovu.',
                    true,
                    AIProvider.OPENAI
                );

            case 429:
                if (errorType === 'insufficient_quota') {
                    return new ApiKeyError(
                        'Nedostatečný kredit na OpenAI účtu. Dobijte prosím kredit nebo použijte jiný klíč.',
                        true,
                        AIProvider.OPENAI
                    );
                }
                return new ApiKeyError(
                    'Překročen limit API. Váš klíč dosáhl denního limitu volání. Zkuste to později.',
                    true,
                    AIProvider.OPENAI
                );

            case 400:
                return new ApiKeyError(
                    'Neplatný požadavek. Zkuste to prosím znovu.',
                    false,
                    AIProvider.OPENAI
                );

            case 404:
                return new ApiKeyError(
                    'Model nenalezen. Zkontrolujte nastavení.',
                    false,
                    AIProvider.OPENAI
                );

            case 503:
                return new ApiKeyError(
                    'OpenAI služba je dočasně nedostupná. Zkuste to později.',
                    false,
                    AIProvider.OPENAI
                );

            default:
                return new ApiKeyError(
                    `OpenAI chyba (${status}): ${errorMessage || 'Neznámá chyba'}`,
                    false,
                    AIProvider.OPENAI
                );
        }
    }

    /**
     * Validate API key by making a simple test request
     */
    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-turbo',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5
                })
            });

            return response.ok || response.status === 429; // 429 means key is valid but rate limited
        } catch {
            return false;
        }
    }
}
