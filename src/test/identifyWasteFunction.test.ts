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
    process.env.GEMINI_API_KEY = 'test-key';
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
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const data = await response.json();
    expect(response.status).toBe(502);
    expect(data.error).toBe('AI asistent je docasne nedostupny.');
  });

  it('returns normalized successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              name: 'PET lahev',
              category: WasteCategory.PLAST,
              note: 'Seslapnout.',
              isFromDatabase: false,
            }),
          }],
        },
      }],
    })));
    const response = await handler(request({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'lahev' }),
    }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.item.name).toBe('PET lahev');
    expect(data.item.category).toBe(WasteCategory.PLAST);
  });
});
