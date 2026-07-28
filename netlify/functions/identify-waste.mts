import { WasteCategory } from '../../types';

const MAX_TEXT_LENGTH = 160;
const MAX_IMAGE_BYTES = 2_500_000;
const MAX_BODY_BYTES = 3_500_000;
const REQUEST_TIMEOUT_MS = 12_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-3.6-flash',
  'gemini-3.5-flash',
]);

const SYSTEM_PROMPT = `Jsi recyklacni asistent pro obec Povrly v CR.
Vrat pouze JSON objekt s poli name, category, note a isFromDatabase.
category musi byt jedna z hodnot enumu WasteCategory. Pokud si nejsi jisty, napis to do note.`;

const allowedCategories = new Set(Object.values(WasteCategory));

class GeminiUpstreamError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    readonly publicStatus = 502,
    readonly retryAfter?: number,
  ) {
    super(reason);
    this.name = 'GeminiUpstreamError';
  }
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ ok: false, error: 'Content-Type must be application/json.' }, 415);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: 'Pozadavek je prilis velky.' }, 413);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Neplatny JSON.' }, 400);
  }

  const validation = validatePayload(payload);
  if (validation.ok === false) return json({ ok: false, error: validation.error }, 400);

  const apiKey = getServerEnv('GEMINI_API_KEY');
  if (!apiKey) return json({ ok: false, error: 'AI asistent neni nakonfigurovany.' }, 503);
  const geminiModel = getGeminiModel();

  try {
    const text = await callGemini({
      apiKey,
      geminiModel,
      query: validation.query,
      image: validation.image,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
    const parsed = parseAiJson(text);
    const item = normalizeAiResult(parsed, validation.query);
    return json({ ok: true, item });
  } catch (error) {
    const upstreamError = normalizeUpstreamError(error);
    logGeminiError(upstreamError, {
      model: geminiModel,
      hasImage: Boolean(validation.image),
      queryLength: validation.query?.length || 0,
    });
    return json(
      { ok: false, error: 'AI asistent je docasne nedostupny.' },
      upstreamError.publicStatus,
      upstreamError.retryAfter ? { 'retry-after': String(upstreamError.retryAfter) } : undefined,
    );
  }
};

function validatePayload(payload: unknown):
  | { ok: true; query?: string; image?: { data: string; mimeType: string } }
  | { ok: false; error: string } {
  const body = payload as { query?: unknown; image?: { data?: unknown; mimeType?: unknown } };
  const query = typeof body.query === 'string' ? body.query.trim().replace(/\s+/g, ' ') : undefined;
  const image = body.image;

  if (!query && !image) return { ok: false, error: 'Zadejte text nebo obrazek.' };
  if (query && (query.length < 2 || query.length > MAX_TEXT_LENGTH)) {
    return { ok: false, error: 'Textovy dotaz ma neplatnou delku.' };
  }

  if (image) {
    if (typeof image.data !== 'string' || typeof image.mimeType !== 'string') {
      return { ok: false, error: 'Obrazek ma neplatny format.' };
    }
    if (!ALLOWED_IMAGE_TYPES.has(image.mimeType)) {
      return { ok: false, error: 'Nepodporovany typ obrazku.' };
    }
    const size = Math.ceil(image.data.length * 0.75);
    if (size > MAX_IMAGE_BYTES) return { ok: false, error: 'Obrazek je prilis velky.' };
  }

  return { ok: true, query, image: image as { data: string; mimeType: string } | undefined };
}

async function callGemini(params: {
  apiKey: string;
  geminiModel: string;
  query?: string;
  image?: { data: string; mimeType: string };
  timeoutMs: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  const parts: Array<Record<string, unknown>> = [{ text: buildPrompt(params.query) }];

  if (params.image) {
    parts.push({ inline_data: { data: params.image.data, mime_type: params.image.mimeType } });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.geminiModel}:generateContent`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': params.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          maxOutputTokens: 400,
          responseFormat: {
            text: {
              mimeType: 'application/json',
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string', enum: Object.values(WasteCategory) },
                  note: { type: 'string' },
                  isFromDatabase: { type: 'boolean' },
                },
                required: ['name', 'category', 'note', 'isFromDatabase'],
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw await createGeminiHttpError(response);
    }
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
    if (!text) throw new GeminiUpstreamError(502, 'missing_candidate_text');
    return text;
  } catch (error) {
    if (error instanceof GeminiUpstreamError) throw error;
    if (isAbortError(error)) throw new GeminiUpstreamError(504, 'provider_timeout', 504, 30);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(query?: string): string {
  return `${SYSTEM_PROMPT}\n\nDotaz uzivatele: ${query || 'obrazek bez textu'}`;
}

function parseAiJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const raw = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0];
  if (!raw) throw new GeminiUpstreamError(502, 'invalid_provider_json');
  try {
    return JSON.parse(raw);
  } catch {
    throw new GeminiUpstreamError(502, 'invalid_provider_json');
  }
}

function normalizeAiResult(parsed: Record<string, unknown>, fallback?: string) {
  const category = allowedCategories.has(parsed.category as WasteCategory)
    ? parsed.category as WasteCategory
    : WasteCategory.SMESNY;
  const name = cleanText(parsed.name, 80) || cleanText(fallback, 80) || 'Neznamy predmet';
  const note = cleanText(parsed.note, 500) || 'Vysledek overte podle obaloveho symbolu nebo pravidel obce.';

  return {
    id: `ai-${Date.now()}`,
    name,
    category,
    note,
    isFromDatabase: false,
  };
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';
}

function getGeminiModel(): string {
  const configured = getServerEnv('GEMINI_MODEL')?.trim();
  if (configured && ALLOWED_GEMINI_MODELS.has(configured)) return configured;
  return DEFAULT_GEMINI_MODEL;
}

function getServerEnv(name: string): string | undefined {
  const netlifyEnv = (globalThis as {
    Netlify?: { env?: { get?: (key: string) => string | undefined } };
  }).Netlify?.env?.get?.(name);
  return netlifyEnv || process.env[name];
}

async function createGeminiHttpError(response: Response): Promise<GeminiUpstreamError> {
  const providerReason = extractProviderReason(await safeReadBody(response));
  if (response.status === 401 || response.status === 403) {
    return new GeminiUpstreamError(response.status, providerReason || 'provider_auth_or_config', 502);
  }
  if (response.status === 404) {
    return new GeminiUpstreamError(response.status, providerReason || 'provider_model_not_found', 502);
  }
  if (response.status === 429) {
    return new GeminiUpstreamError(response.status, providerReason || 'provider_rate_limited', 503, 30);
  }
  if (response.status >= 500) {
    return new GeminiUpstreamError(response.status, providerReason || 'provider_5xx', 502);
  }
  return new GeminiUpstreamError(response.status, providerReason || 'provider_4xx', 502);
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 2_000);
  } catch {
    return '';
  }
}

function extractProviderReason(body: string): string {
  try {
    const data = JSON.parse(body) as { error?: { status?: unknown; code?: unknown; message?: unknown } };
    const reason = data.error?.status || data.error?.code || data.error?.message;
    if (typeof reason === 'string') return sanitizeReason(reason);
    if (typeof reason === 'number') return `code_${reason}`;
  } catch {
    // Provider bodies are untrusted; ignore malformed diagnostics.
  }
  return '';
}

function sanitizeReason(reason: string): string {
  return reason
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[redacted_google_api_key]')
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[redacted_openai_api_key]')
    .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=_-]+/gi, '[redacted_image]')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.:-]/g, '')
    .slice(0, 80) || 'provider_error';
}

function normalizeUpstreamError(error: unknown): GeminiUpstreamError {
  if (error instanceof GeminiUpstreamError) return error;
  if (isAbortError(error)) return new GeminiUpstreamError(504, 'provider_timeout', 504, 30);
  return new GeminiUpstreamError(502, 'provider_request_failed');
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function logGeminiError(
  error: GeminiUpstreamError,
  metadata: { model: string; hasImage: boolean; queryLength: number },
): void {
  console.error('Gemini request failed', {
    status: error.status,
    reason: error.reason,
    model: metadata.model,
    hasImage: metadata.hasImage,
    queryLength: metadata.queryLength,
  });
}

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export const config = {
  path: '/.netlify/functions/identify-waste',
};
