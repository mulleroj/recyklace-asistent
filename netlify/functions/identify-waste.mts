import { WasteCategory } from '../../types';

const MAX_TEXT_LENGTH = 160;
const MAX_IMAGE_BYTES = 2_500_000;
const MAX_BODY_BYTES = 3_500_000;
const REQUEST_TIMEOUT_MS = 12_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const GEMINI_MODEL = 'gemini-2.0-flash';

const SYSTEM_PROMPT = `Jsi recyklacni asistent pro obec Povrly v CR.
Vrat pouze JSON objekt s poli name, category, note a isFromDatabase.
category musi byt jedna z hodnot enumu WasteCategory. Pokud si nejsi jisty, napis to do note.`;

const allowedCategories = new Set(Object.values(WasteCategory));

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ ok: false, error: 'AI asistent neni nakonfigurovany.' }, 503);

  try {
    const text = await callGemini({
      apiKey,
      query: validation.query,
      image: validation.image,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
    const parsed = parseAiJson(text);
    const item = normalizeAiResult(parsed, validation.query);
    return json({ ok: true, item });
  } catch {
    return json({ ok: false, error: 'AI asistent je docasne nedostupny.' }, 502);
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
  query?: string;
  image?: { data: string; mimeType: string };
  timeoutMs: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  const parts: Array<Record<string, unknown>> = [{ text: buildPrompt(params.query) }];

  if (params.image) {
    parts.push({ inlineData: { data: params.image.data, mimeType: params.image.mimeType } });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 400, responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) throw new Error('upstream failed');
    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;
    if (!text) throw new Error('missing upstream text');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(query?: string): string {
  return `${SYSTEM_PROMPT}\n\nDotaz uzivatele: ${query || 'obrazek bez textu'}`;
}

function parseAiJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const raw = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0] || '{}';
  return JSON.parse(raw);
}

function normalizeAiResult(parsed: Record<string, unknown>, fallback?: string) {
  const category = allowedCategories.has(parsed.category as WasteCategory)
    ? parsed.category as WasteCategory
    : WasteCategory.SMESNY;

  return {
    id: `ai-${Date.now()}`,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 80) : fallback || 'Neznamy predmet',
    category,
    note: typeof parsed.note === 'string' ? parsed.note.trim().slice(0, 500) : 'Vysledek overte podle obaloveho symbolu nebo pravidel obce.',
    isFromDatabase: false,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export const config = {
  path: '/.netlify/functions/identify-waste',
};
