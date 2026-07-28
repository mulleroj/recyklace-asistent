import { WasteItem } from '../../types';

interface IdentifyWasteParams {
  query?: string;
  image?: {
    data: string;
    mimeType: string;
  };
}

export class AiProxyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProxyError';
  }
}

export async function identifyWasteViaProxy(
  params: IdentifyWasteParams,
  signal?: AbortSignal
): Promise<WasteItem> {
  const response = await fetch('/.netlify/functions/identify-waste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new AiProxyError(data?.error || 'AI asistent je docasne nedostupny.');
  }

  return data.item as WasteItem;
}
