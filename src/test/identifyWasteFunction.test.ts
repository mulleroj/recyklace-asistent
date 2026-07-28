import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/functions/identify-waste.mts';
import { WasteCategory } from '../../types';

const url = 'https://example.test/.netlify/functions/identify-waste';

function request(init: RequestInit) {
  return new Request(url, init);
}

describe('identify-waste Netlify Function', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.GEMINI_MODEL;
  });

  it('rejects missing API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    expect(response.status).toBe(503);
  });

  it('rejects unsupported methods', async () => {
    const response = await handler(request({ method: 'GET' }));
    expect(response.status).toBe(405);
  });

  it('rejects invalid content type', async () => {
    const response = await handler(request({ method: 'POST', body: 'x' }));
    expect(response.status).toBe(415);
  });

  it('rejects empty query', async () => {
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '   ' }),
    }));
    expect(response.status).toBe(400);
  });

  it('rejects too long query', async () => {
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'x'.repeat(161) }),
    }));
    expect(response.status).toBe(400);
  });

  it('rejects disallowed MIME type', async () => {
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: { mimeType: 'image/gif', data: 'abcd' } }),
    }));
    expect(response.status).toBe(400);
  });

  it('rejects oversized image', async () => {
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: { mimeType: 'image/jpeg', data: 'a'.repeat(3_400_000) } }),
    }));
    expect(response.status).toBe(400);
  });

  it('hides upstream failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const data = await response.json();
    expect(response.status).toBe(502);
    expect(data.error).toBe('AI asistent je docasne nedostupny.');
  });

  it('uses the default gemini-3.6-flash model', async () => {
    const fetchMock = mockGeminiSuccess();
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/models/gemini-3.6-flash:generateContent');
  });

  it('respects an allowed GEMINI_MODEL override', async () => {
    process.env.GEMINI_MODEL = 'gemini-3.5-flash';
    const fetchMock = mockGeminiSuccess();
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/models/gemini-3.5-flash:generateContent');
  });

  it('falls back to the safe default for disallowed GEMINI_MODEL values', async () => {
    process.env.GEMINI_MODEL = '../bad-model?key=leak';
    const fetchMock = mockGeminiSuccess();
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/models/gemini-3.6-flash:generateContent');
    expect(String(url)).not.toContain('bad-model');
  });

  it('sends the API key through x-goog-api-key and not in the URL', async () => {
    const fetchMock = mockGeminiSuccess();
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('test-key');
    expect(url).not.toContain('?key=');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
  });

  it('sends an explicit structured JSON response schema', async () => {
    const fetchMock = mockGeminiSuccess();
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseFormat.text.mimeType).toBe('application/json');
    expect(body.generationConfig.responseFormat.text.schema.required).toEqual([
      'name',
      'category',
      'note',
      'isFromDatabase',
    ]);
    expect(body.generationConfig.responseFormat.text.schema.properties.category.enum).toContain(WasteCategory.PLAST);
  });

  it('maps provider 404 for missing models to a safe public error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'NOT_FOUND', message: 'model not found' },
    }, { status: 404 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const data = await response.json();
    expect(response.status).toBe(502);
    expect(data.error).toBe('AI asistent je docasne nedostupny.');
  });

  it('maps provider auth failures without exposing provider body or key', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'PERMISSION_DENIED', message: 'bad key test-key' },
    }, { status: 403 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const data = await response.json();
    expect(response.status).toBe(502);
    expect(JSON.stringify(data)).not.toContain('PERMISSION_DENIED');
    expect(JSON.stringify(data)).not.toContain('test-key');
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('test-key');
  });

  it('maps provider rate limits to a temporary public error with Retry-After', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'RESOURCE_EXHAUSTED' },
    }, { status: 429 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
  });

  it('maps provider timeout to a safe 504 response', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const pending = handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    await vi.advanceTimersByTimeAsync(12_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(response.headers.get('retry-after')).toBe('30');
  });

  it('returns normalized successful response', async () => {
    mockGeminiSuccess({
      name: 'PET lahev',
      category: WasteCategory.PLAST,
      note: 'Seslapnout.',
      isFromDatabase: true,
      ignored: '<script>alert(1)</script>',
    });
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.item).toEqual({
      id: expect.stringMatching(/^ai-/),
      name: 'PET lahev',
      category: WasteCategory.PLAST,
      note: 'Seslapnout.',
      isFromDatabase: false,
    });
  });

  it('falls back to a safe category for unexpected provider categories', async () => {
    mockGeminiSuccess({
      name: 'divna vec',
      category: 'UNKNOWN',
      note: 'Overit.',
      isFromDatabase: false,
    });
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'divna vec' }),
    }));
    const data = await response.json();
    expect(data.item.category).toBe(WasteCategory.SMESNY);
  });

  it('returns a safe error for invalid provider JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      candidates: [{ content: { parts: [{ text: 'not json' }] } }],
    })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    expect(response.status).toBe(502);
  });

  it('logs only safe metadata for upstream errors', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { message: 'bad request for secret-key and full query' },
    }, { status: 500 })));
    const fullQuery = 'velmi konkretni uzivatelsky dotaz';
    const imageData = 'a'.repeat(100);
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: fullQuery,
        image: { mimeType: 'image/jpeg', data: imageData },
      }),
    }));
    const logs = JSON.stringify(logSpy.mock.calls);
    expect(logs).toContain('Gemini request failed');
    expect(logs).toContain('queryLength');
    expect(logs).toContain('hasImage');
    expect(logs).not.toContain('test-key');
    expect(logs).not.toContain(fullQuery);
    expect(logs).not.toContain(imageData);
  });
});

function mockGeminiSuccess(item: Record<string, unknown> = {
  name: 'PET lahev',
  category: WasteCategory.PLAST,
  note: 'Seslapnout.',
  isFromDatabase: false,
}) {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify(item),
          }],
        },
      }],
    }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
