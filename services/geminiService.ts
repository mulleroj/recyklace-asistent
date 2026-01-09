
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { WasteItem } from "../types";
import {
  AIService,
  IdentifyWasteParams,
  ApiKeyError,
  AIProvider
} from './aiProviderInterface';

// Backward compatibility exports
export { ApiKeyError } from './aiProviderInterface';
export type { IdentifyWasteParams } from './aiProviderInterface';

/**
 * Gemini AI service implementation
 * Uses Google's Gemini 2.0 Flash model
 */
export class GeminiService implements AIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async identifyWaste({ query, image }: IdentifyWasteParams): Promise<WasteItem> {
    if (!this.apiKey) {
      throw new ApiKeyError(
        'Gemini API klíč nebyl zadán. Prosím zadejte váš Gemini API klíč.',
        true,
        AIProvider.GEMINI
      );
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    try {
      const contents: any[] = [];

      // Build the prompt
      let promptText = SYSTEM_INSTRUCTION + "\n\n";

      if (query) {
        promptText += `Uživatel popsal předmět jako: "${query}"\n`;
      }

      if (image) {
        promptText += "Proveď důkladnou vizuální analýzu přil oženého obrázku. Zohledni možné odlesky, stíny a texturu materiálu. Hledej recyklační kódy a symboly. Identifikuj předmět a urči jeho správnou recyklační kategorii pro ČR.";

        contents.push({
          role: "user",
          parts: [
            { text: promptText },
            {
              inlineData: {
                data: image.data,
                mimeType: image.mimeType,
              },
            },
          ],
        });
      } else {
        contents.push({
          role: "user",
          parts: [{ text: promptText }],
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contents,
      });

      const text = response.text || '';

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

      const data = JSON.parse(jsonStr);
      return {
        id: Math.random().toString(36).substring(7),
        name: data.name || (query || "Neznámý předmět"),
        category: data.category,
        note: data.note,
        isFromDatabase: data.isFromDatabase
      };
    } catch (error: any) {
      console.error("Gemini Error Details:", {
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        name: error?.name,
        error: error
      });

      // Check for specific API errors
      const errorMessage = error?.message || error?.toString() || '';
      const errorStatus = error?.status || error?.response?.status;

      // 404 = Model not found
      if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('not found')) {
        throw new ApiKeyError(
          'Model nenalezen. Zkuste jiný API klíč.',
          true,
          AIProvider.GEMINI
        );
      }

      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
        throw new ApiKeyError(
          'Neplatný API klíč. Zkontrolujte prosím váš klíč a zkuste to znovu.',
          true,
          AIProvider.GEMINI
        );
      }

      if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        throw new ApiKeyError(
          'Překročen limit API. Váš klíč dosáhl denního limitu volání. Zkuste to později nebo použijte jiný klíč.',
          true,
          AIProvider.GEMINI
        );
      }

      if (errorMessage.includes('PERMISSION_DENIED')) {
        throw new ApiKeyError(
          'Přístup odepřen. Zkontrolujte oprávnění vašeho API klíče.',
          true,
          AIProvider.GEMINI
        );
      }

      if (errorMessage.includes('INVALID_ARGUMENT')) {
        throw new ApiKeyError(
          'Neplatný požadavek. Zkuste to prosím znovu.',
          false,
          AIProvider.GEMINI
        );
      }

      // Show actual error message for debugging
      const displayError = errorMessage.substring(0, 200) || 'Neznámá chyba';
      throw new ApiKeyError(
        `Chyba Gemini: ${displayError}`,
        false,
        AIProvider.GEMINI
      );
    }
  }

  /**
   * Validate API key by making a simple test request
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: "test" }] }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
