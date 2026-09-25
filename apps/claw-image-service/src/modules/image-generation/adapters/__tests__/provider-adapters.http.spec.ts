import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { ImageFailureCode } from '../../../../common/enums';
import { generateWithGemini } from '../gemini-image.adapter';
import { generateWithXai } from '../xai-image.adapter';

/**
 * The adapters over a REAL HTTP round trip: the shared axios client, the SSRF
 * guard with the declared connector host, and no-redirect handling all run.
 *
 * The fake provider answers with the response shapes captured from the live
 * APIs on 2026-09-23 (bytes shortened):
 *  - xAI  POST /v1/images/generations →
 *      { data: [{ b64_json, mime_type: "image/jpeg" }], usage: { cost_in_usd_ticks } }
 *  - Gemini POST /v1beta/models/<id>:generateContent →
 *      { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] },
 *        finishReason: "STOP" }], usageMetadata: {...} }
 *  - Gemini imagen-* → 404 NOT_FOUND (Imagen is shut down in the Gemini API)
 */

type Recorded = { method: string; url: string; headers: IncomingMessage['headers']; body: unknown };
type Handler = (req: Recorded) => {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

let server: Server;
let baseUrl = '';
let recorded: Recorded[] = [];
let handler: Handler = () => ({ status: 500, body: {} });

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      resolve(raw);
    });
  });
}

async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readBody(req);
  const entry: Recorded = {
    method: req.method ?? '',
    url: req.url ?? '',
    headers: req.headers,
    body: raw.length > 0 ? JSON.parse(raw) : undefined,
  };
  recorded.push(entry);
  const answer = handler(entry);
  res.writeHead(answer.status, { 'content-type': 'application/json', ...answer.headers });
  res.end(JSON.stringify(answer.body));
}

const GEMINI_IMAGE_OK = {
  candidates: [
    {
      content: {
        parts: [{ inlineData: { mimeType: 'image/jpeg', data: '/9j/GEMINI' } }],
        role: 'model',
      },
      finishReason: 'STOP',
      index: 0,
    },
  ],
  usageMetadata: {
    promptTokenCount: 7,
    candidatesTokenCount: 1207,
    totalTokenCount: 1335,
    thoughtsTokenCount: 121,
  },
  modelVersion: 'gemini-3-pro-image',
};

beforeAll(async () => {
  server = createServer((req, res) => {
    void onRequest(req, res);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${String(port)}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve();
    });
  });
});

beforeEach(() => {
  recorded = [];
});

describe('generateWithXai over HTTP', () => {
  it('sends the documented request and reads the live response shape', async () => {
    handler = () => ({
      status: 200,
      body: {
        data: [{ b64_json: '/9j/XAI', mime_type: 'image/jpeg' }],
        usage: { cost_in_usd_ticks: 200000000 },
      },
    });

    const result = await generateWithXai(
      `${baseUrl}/v1`,
      'xai-test-key',
      'a red apple',
      'grok-imagine-image',
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.method).toBe('POST');
    expect(recorded[0]?.url).toBe('/v1/images/generations');
    expect(recorded[0]?.headers.authorization).toBe('Bearer xai-test-key');
    expect(recorded[0]?.body).toEqual({
      model: 'grok-imagine-image',
      prompt: 'a red apple',
      n: 1,
      response_format: 'b64_json',
    });
    expect(result).toEqual({
      imageBase64: '/9j/XAI',
      imageUrl: undefined,
      revisedPrompt: undefined,
      mimeType: 'image/jpeg',
      // xAI's own price (200,000,000 ticks = $0.02), carried for the
      // reconciliation log only — never billed from.
      providerCostTicks: 200000000,
    });
  });

  it('omits providerCostTicks when xAI sends no usage block', async () => {
    handler = () => ({ status: 200, body: { data: [{ b64_json: '/9j/XAI' }] } });

    const result = await generateWithXai(`${baseUrl}/v1`, 'k', 'p', 'grok-imagine-image');

    expect(result.providerCostTicks).toBeUndefined();
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('turns an xAI refusal into a classified failure', async () => {
    handler = () => ({
      status: 429,
      body: { code: 'resource-exhausted', error: 'Rate limit exceeded' },
    });
    await expect(
      generateWithXai(`${baseUrl}/v1`, 'k', 'p', 'grok-imagine-image'),
    ).rejects.toMatchObject({
      code: ImageFailureCode.PROVIDER_QUOTA_EXCEEDED,
    });
  });

  it('never follows a redirect off the declared host', async () => {
    handler = () => ({
      status: 302,
      body: {},
      headers: { location: 'http://169.254.169.254/latest' },
    });
    await expect(
      generateWithXai(`${baseUrl}/v1`, 'k', 'p', 'grok-imagine-image'),
    ).rejects.toBeDefined();
    expect(recorded).toHaveLength(1);
  });
});

describe('generateWithGemini over HTTP', () => {
  it('puts the key in a header, never in the URL, and strips the catalog prefix', async () => {
    handler = () => ({ status: 200, body: GEMINI_IMAGE_OK });

    const result = await generateWithGemini(
      `${baseUrl}/v1beta/openai`,
      'gemini-test-key',
      'a red apple',
      'models/gemini-3-pro-image',
    );

    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.url).toBe('/v1beta/models/gemini-3-pro-image:generateContent');
    expect(recorded[0]?.url).not.toContain('key=');
    expect(recorded[0]?.headers['x-goog-api-key']).toBe('gemini-test-key');
    expect(recorded[0]?.body).toMatchObject({
      contents: [{ parts: [{ text: 'Generate an image: a red apple' }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    expect(result.imageBase64).toBe('/9j/GEMINI');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.usage?.promptTokens).toBe(7);
  });

  it('falls back to a capable model when the catalog model 404s (imagen-*)', async () => {
    handler = (req) =>
      req.url.includes('imagen-4.0-generate-001')
        ? {
            status: 404,
            body: {
              error: {
                code: 404,
                message: 'models/imagen-4.0-generate-001 is not found',
                status: 'NOT_FOUND',
              },
            },
          }
        : { status: 200, body: GEMINI_IMAGE_OK };

    const result = await generateWithGemini(
      `${baseUrl}/v1beta`,
      'k',
      'p',
      'models/imagen-4.0-generate-001',
    );

    expect(recorded.map((r) => r.url)).toEqual([
      '/v1beta/models/imagen-4.0-generate-001:generateContent',
      '/v1beta/models/gemini-2.5-flash-image:generateContent',
    ]);
    expect(result.imageBase64).toBe('/9j/GEMINI');
  });

  it('stops at a safety block instead of trying two more models', async () => {
    handler = () => ({
      status: 200,
      body: {
        candidates: [
          { content: { parts: [{ text: 'I cannot create that.' }] }, finishReason: 'IMAGE_SAFETY' },
        ],
      },
    });

    await expect(
      generateWithGemini(`${baseUrl}/v1beta`, 'k', 'p', 'gemini-2.5-flash-image'),
    ).rejects.toMatchObject({
      code: ImageFailureCode.CONTENT_REJECTED,
    });
    expect(recorded).toHaveLength(1);
  });

  it('classifies an invalid key (Gemini answers 400) as an auth failure', async () => {
    handler = () => ({
      status: 400,
      body: {
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
        },
      },
    });

    await expect(
      generateWithGemini(`${baseUrl}/v1beta`, 'bad', 'p', 'gemini-2.5-flash-image'),
    ).rejects.toMatchObject({
      code: ImageFailureCode.PROVIDER_AUTH_FAILED,
    });
  });

  it('reports a text-only answer as no image returned', async () => {
    handler = () => ({
      status: 200,
      body: {
        candidates: [
          { content: { parts: [{ text: 'Here is a description.' }] }, finishReason: 'STOP' },
        ],
      },
    });

    await expect(
      generateWithGemini(`${baseUrl}/v1beta`, 'k', 'p', 'gemini-2.5-flash-image'),
    ).rejects.toMatchObject({
      code: ImageFailureCode.NO_IMAGE_RETURNED,
    });
  });
});
