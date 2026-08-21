/**
 * Thin client for Gemini image generation.
 *
 * Two wire formats are supported because Google ships both:
 *   1. `/v1beta/interactions`  — the current Interactions API.
 *   2. `/v1beta/models/{model}:generateContent` — the classic endpoint, still
 *      what older keys/models answer on.
 * We try (1) and transparently fall back to (2) so the app keeps working
 * whichever the user's key is provisioned for.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiImageRequest {
  apiKey: string;
  model: string;
  prompt: string;
  /** Optional reference image (base64, no data: prefix) for edit/restyle calls. */
  imageBase64?: string;
  imageMimeType?: string;
  aspectRatio?: '1:1' | '3:2' | '4:3' | '16:9' | '4:5' | '9:16';
  imageSize?: '1K' | '2K' | '4K';
  signal?: AbortSignal;
}

export interface GeminiImageResult {
  /** Base64 PNG/JPEG payload without the data: prefix. */
  base64: string;
  mimeType: string;
  /** Which wire format actually answered — surfaced in diagnostics. */
  api: 'interactions' | 'generateContent';
}

export class GeminiError extends Error {
  readonly status?: number;
  readonly detail?: string;
  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.detail = detail;
  }
}

export const IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image — fast, 4K capable' },
  { id: 'gemini-3.1-flash-lite-image', label: 'Gemini 3.1 Flash Lite Image — cheapest' },
  { id: 'gemini-3-pro-image', label: 'Gemini 3 Pro Image — best quality' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image — legacy' },
];

export function isConfigured(apiKey: string | undefined | null): boolean {
  return !!apiKey && apiKey.trim().length > 20;
}

export async function generateImage(req: GeminiImageRequest): Promise<GeminiImageResult> {
  if (!isConfigured(req.apiKey)) {
    throw new GeminiError('No Gemini API key set. Add one in Settings → AI artwork.');
  }
  try {
    return await viaInteractions(req);
  } catch (err) {
    if (err instanceof GeminiError && shouldFallback(err)) {
      return viaGenerateContent(req);
    }
    throw err;
  }
}

function shouldFallback(err: GeminiError): boolean {
  // 404 = endpoint/model not available on this key; 400 = payload shape rejected.
  return err.status === 404 || err.status === 400 || err.status === 501;
}

async function viaInteractions(req: GeminiImageRequest): Promise<GeminiImageResult> {
  const input: Record<string, unknown>[] = [{ type: 'text', text: req.prompt }];
  if (req.imageBase64) {
    input.push({
      type: 'image',
      mime_type: req.imageMimeType ?? 'image/jpeg',
      data: req.imageBase64,
    });
  }
  const body = {
    model: req.model,
    input,
    response_format: {
      type: 'image',
      mime_type: 'image/png',
      aspect_ratio: req.aspectRatio ?? '16:9',
      image_size: req.imageSize ?? '2K',
    },
  };

  const json = await post(`${BASE}/interactions`, req.apiKey, body, req.signal);
  const image = findInteractionImage(json);
  if (!image) {
    throw new GeminiError(
      'The model replied without an image. Try a different model or rephrase the bike.',
      undefined,
      safeSnippet(json),
    );
  }
  return { ...image, api: 'interactions' };
}

async function viaGenerateContent(req: GeminiImageRequest): Promise<GeminiImageResult> {
  const parts: Record<string, unknown>[] = [{ text: req.prompt }];
  if (req.imageBase64) {
    parts.push({
      inline_data: { mime_type: req.imageMimeType ?? 'image/jpeg', data: req.imageBase64 },
    });
  }
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: req.aspectRatio ?? '16:9' },
    },
  };

  const json = await post(
    `${BASE}/models/${encodeURIComponent(req.model)}:generateContent`,
    req.apiKey,
    body,
    req.signal,
  );
  const image = findGenerateContentImage(json);
  if (!image) {
    throw new GeminiError(
      'The model replied without an image. Try a different model or rephrase the bike.',
      undefined,
      safeSnippet(json),
    );
  }
  return { ...image, api: 'generateContent' };
}

async function post(
  url: string,
  apiKey: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new GeminiError(
      'Could not reach the Gemini API. Check your connection and try again.',
      undefined,
      String(err),
    );
  }

  const text = await response.text();
  if (!response.ok) {
    throw new GeminiError(describeHttpError(response.status, text), response.status, text.slice(0, 400));
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeminiError('Gemini returned a response we could not parse.', response.status);
  }
}

function describeHttpError(status: number, body: string): string {
  const apiMessage = extractApiMessage(body);
  switch (status) {
    case 400:
      return apiMessage ?? 'Gemini rejected the request.';
    case 401:
    case 403:
      return 'That Gemini API key was refused. Check the key and that the Generative Language API is enabled for it.';
    case 404:
      return `Model not found on this key${apiMessage ? ` (${apiMessage})` : ''}.`;
    case 429:
      return 'Gemini rate limit hit. Wait a moment and try again.';
    default:
      return apiMessage ?? `Gemini request failed (HTTP ${status}).`;
  }
}

function extractApiMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed?.error?.message ?? null;
  } catch {
    return null;
  }
}

/** Walks the Interactions response for the first image payload. */
function findInteractionImage(json: unknown): { base64: string; mimeType: string } | null {
  const root = json as {
    output_image?: { data?: string; mime_type?: string };
    steps?: { content?: { type?: string; data?: string; mime_type?: string }[] }[];
  };
  if (root?.output_image?.data) {
    return { base64: root.output_image.data, mimeType: root.output_image.mime_type ?? 'image/png' };
  }
  for (const step of root?.steps ?? []) {
    for (const item of step?.content ?? []) {
      if (item?.type === 'image' && item.data) {
        return { base64: item.data, mimeType: item.mime_type ?? 'image/png' };
      }
    }
  }
  return deepFindImage(json);
}

function findGenerateContentImage(json: unknown): { base64: string; mimeType: string } | null {
  const root = json as {
    candidates?: {
      content?: {
        parts?: {
          inlineData?: { data?: string; mimeType?: string };
          inline_data?: { data?: string; mime_type?: string };
        }[];
      };
    }[];
  };
  for (const candidate of root?.candidates ?? []) {
    for (const part of candidate?.content?.parts ?? []) {
      const inline = part.inlineData ?? part.inline_data;
      const data = (inline as { data?: string })?.data;
      if (data) {
        const mime =
          (inline as { mimeType?: string })?.mimeType ??
          (inline as { mime_type?: string })?.mime_type ??
          'image/png';
        return { base64: data, mimeType: mime };
      }
    }
  }
  return deepFindImage(json);
}

/** Last resort: find any long base64-looking string in the payload. */
function deepFindImage(json: unknown): { base64: string; mimeType: string } | null {
  let found: string | null = null;
  const visit = (node: unknown, depth: number) => {
    if (found || depth > 8 || node == null) return;
    if (typeof node === 'string') {
      if (node.length > 2048 && /^[A-Za-z0-9+/=\s]+$/.test(node.slice(0, 256))) found = node;
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, depth + 1));
      return;
    }
    if (typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach((child) => visit(child, depth + 1));
    }
  };
  visit(json, 0);
  return found ? { base64: found, mimeType: 'image/png' } : null;
}

function safeSnippet(json: unknown): string {
  try {
    return JSON.stringify(json).slice(0, 400);
  } catch {
    return '';
  }
}

/** Cheap key sanity check used by Settings. */
export async function verifyApiKey(apiKey: string, signal?: AbortSignal): Promise<boolean> {
  const res = await fetch(`${BASE}/models`, {
    headers: { 'x-goog-api-key': apiKey },
    signal,
  });
  return res.ok;
}
