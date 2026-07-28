import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/functions/identify-waste.mts';
import { WasteCategory } from '../../types';

const url = 'https://example.test/.netlify/functions/identify-waste';
const previewUrl = 'https://deploy-preview-1--recyklace.netlify.app/.netlify/functions/identify-waste';
const productionUrl = 'https://recyklace.netlify.app/.netlify/functions/identify-waste';
const aiErrorClassHeader = 'x-recyklace-ai-error-class';
const legacyMimeField = `response${'Mime'}Type`;
const legacySchemaField = `response${'Schema'}`;
const allowedAiErrorClasses = new Set([
  'invalid-request',
  'auth-config',
  'model-not-found',
  'quota',
  'provider-timeout',
  'provider-unavailable',
  'invalid-provider-response',
  'network-failure',
]);

function request(init: RequestInit, targetUrl = url) {
  return new Request(targetUrl, init);
}

describe('identify-waste Netlify Function', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.GEMINI_MODEL;
    delete process.env.CONTEXT;
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

  it('sends the documented structured JSON response format', async () => {
    const fetchMock = mockGeminiSuccess();
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const format = body.generationConfig.responseFormat;
    expect(format.text.mimeType).toBe('application/json');
    expect(format.text.schema.required).toEqual([
      'name',
      'category',
      'note',
      'isFromDatabase',
    ]);
    expect(format.text.schema.additionalProperties).toBe(false);
    expect(format.text.schema.properties.category.enum).toContain(WasteCategory.PLAST);
    expect(body.generationConfig[legacyMimeField]).toBeUndefined();
    expect(body.generationConfig[legacySchemaField]).toBeUndefined();
  });

  it('sends image requests with inline_data', async () => {
    const fetchMock = mockGeminiSuccess();
    await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'obal',
        image: { mimeType: 'image/png', data: 'iVBORw0KGgo=' },
      }),
    }));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[1]).toEqual({
      inline_data: { data: 'iVBORw0KGgo=', mime_type: 'image/png' },
    });
  });

  it('classifies provider 400 as invalid-request on deploy previews', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'INVALID_ARGUMENT', message: 'schema rejected by provider' },
    }, { status: 400 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    expect(response.status).toBe(502);
    expect(response.headers.get(aiErrorClassHeader)).toBe('invalid-request');
  });

  it('maps provider 404 for missing models to model-not-found diagnostics', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'NOT_FOUND', message: 'model not found' },
    }, { status: 404 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    const data = await response.json();
    expect(response.status).toBe(502);
    expect(data.error).toBe('AI asistent je docasne nedostupny.');
    expect(response.headers.get(aiErrorClassHeader)).toBe('model-not-found');
  });

  it('maps provider auth failures to auth-config without exposing provider body or key', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'PERMISSION_DENIED', message: 'bad key test-key' },
    }, { status: 403 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    const data = await response.json();
    expect(response.status).toBe(502);
    expect(response.headers.get(aiErrorClassHeader)).toBe('auth-config');
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
    }, previewUrl));
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get(aiErrorClassHeader)).toBe('quota');
  });

  it('maps provider timeout to provider-timeout diagnostics', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const pending = handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    await vi.advanceTimersByTimeAsync(12_000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get(aiErrorClassHeader)).toBe('provider-timeout');
  });

  it('maps provider 5xx to provider-unavailable diagnostics', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'UNAVAILABLE' },
    }, { status: 503 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    expect(response.status).toBe(502);
    expect(response.headers.get(aiErrorClassHeader)).toBe('provider-unavailable');
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

  it('classifies invalid provider JSON as invalid-provider-response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      candidates: [{ content: { parts: [{ text: 'not json' }] } }],
    })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    expect(response.status).toBe(502);
    expect(response.headers.get(aiErrorClassHeader)).toBe('invalid-provider-response');
  });

  it('classifies fetch failures as network-failure', async () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down with test-key')));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    expect(response.status).toBe(502);
    expect(response.headers.get(aiErrorClassHeader)).toBe('network-failure');
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('test-key');
  });

  it('does not expose diagnostic headers on production', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: { status: 'INVALID_ARGUMENT', message: 'schema rejected by provider' },
    }, { status: 400 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, productionUrl));
    expect(response.status).toBe(502);
    expect(response.headers.get(aiErrorClassHeader)).toBeNull();
  });

  it('limits preview diagnostics to allowed coarse classes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      error: {
        status: 'INVALID_ARGUMENT',
        message: 'provider message containing test-key and schema internals',
      },
    }, { status: 400 })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }, previewUrl));
    const errorClass = response.headers.get(aiErrorClassHeader);
    expect(errorClass).toBe('invalid-request');
    expect(allowedAiErrorClasses.has(errorClass || '')).toBe(true);
    expect(errorClass).not.toContain('test-key');
    expect(errorClass).not.toContain('provider message');
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
