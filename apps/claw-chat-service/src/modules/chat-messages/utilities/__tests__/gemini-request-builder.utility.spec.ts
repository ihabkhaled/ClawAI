// Slice D — Gemini generateContent request builder unit tests.
//
// The builder routes each base64 image_url part to either inline_data (under
// the size threshold) or file_data (over the threshold, via the injected
// upload function). The upload fn is mocked here so the test stays pure.

import { buildGeminiRequestBody } from '../gemini-request-builder.utility';
import type { OpenAiChatMessage } from '../../types/execution.types';
import type {
  GeminiFileDataPart,
  GeminiInlineDataPart,
  GeminiTextPart,
} from '../../types/gemini.types';

// Helper — build a base64 payload of the requested decoded byte length.
const base64OfSize = (decodedBytes: number): string => {
  return Buffer.alloc(decodedBytes, 0xab).toString('base64');
};

describe('buildGeminiRequestBody', () => {
  it('returns text-only contents and never invokes the upload fn for string messages', async () => {
    const uploadFn = jest.fn();
    const source: OpenAiChatMessage[] = [{ role: 'user', content: 'Hello Gemini' }];

    const result = await buildGeminiRequestBody(source, uploadFn, 1000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.inlineCount).toBe(0);
    expect(result.fileDataCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.body.contents).toHaveLength(1);
    expect(result.body.contents[0]!.role).toBe('user');
    expect(result.body.contents[0]!.parts).toEqual([{ text: 'Hello Gemini' }]);
    expect(result.body.systemInstruction).toBeUndefined();
  });

  it('extracts system messages into systemInstruction and never invokes upload fn for them', async () => {
    const uploadFn = jest.fn();
    const source: OpenAiChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hi' },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 1000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.body.systemInstruction).toEqual({
      parts: [{ text: 'You are a helpful assistant.' }],
    });
    expect(result.body.contents).toHaveLength(1);
    expect(result.body.contents[0]!.role).toBe('user');
  });

  it('inlines a small image (size < threshold) and never calls the upload fn', async () => {
    const uploadFn = jest.fn<Promise<string>, [Buffer, string]>();
    // ~96 decoded bytes — well under threshold.
    const tinyPng = base64OfSize(96);
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Tiny image' },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${tinyPng}` },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 10_000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.inlineCount).toBe(1);
    expect(result.fileDataCount).toBe(0);
    const parts = result.body.contents[0]!.parts;
    expect(parts).toHaveLength(2);
    expect((parts[0] as GeminiTextPart).text).toBe('Tiny image');
    const inlinePart = parts[1] as GeminiInlineDataPart;
    expect(inlinePart.inline_data.mime_type).toBe('image/png');
    expect(inlinePart.inline_data.data).toBe(tinyPng);
  });

  it('uploads a large image (size >= threshold) and emits a file_data part with the returned uri', async () => {
    const fileUri = 'files/abc-12345';
    const uploadFn = jest.fn<Promise<string>, [Buffer, string]>().mockResolvedValue(fileUri);
    const bigPng = base64OfSize(50_000); // 50 KB decoded
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${bigPng}` },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 10_000);

    expect(uploadFn).toHaveBeenCalledTimes(1);
    const [bufferArg, mimeArg] = uploadFn.mock.calls[0]!;
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(bufferArg.length).toBe(50_000);
    expect(mimeArg).toBe('image/png');
    expect(result.inlineCount).toBe(0);
    expect(result.fileDataCount).toBe(1);
    const parts = result.body.contents[0]!.parts;
    const fileDataPart = parts[0] as GeminiFileDataPart;
    expect(fileDataPart.file_data.mime_type).toBe('image/png');
    expect(fileDataPart.file_data.file_uri).toBe(fileUri);
  });

  it('routes a mix of small + large attachments correctly (some inline, some uploaded)', async () => {
    const smallPng = base64OfSize(100);
    const largePng = base64OfSize(80_000);
    const largePdf = base64OfSize(60_000);
    const uploadFn = jest
      .fn<Promise<string>, [Buffer, string]>()
      .mockResolvedValueOnce('files/large-png')
      .mockResolvedValueOnce('files/large-pdf');

    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'mixed' },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${smallPng}` },
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${largePng}` },
          },
          {
            type: 'image_url',
            image_url: { url: `data:application/pdf;base64,${largePdf}` },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 10_000);

    expect(uploadFn).toHaveBeenCalledTimes(2);
    expect(uploadFn.mock.calls[0]![1]).toBe('image/png');
    expect(uploadFn.mock.calls[1]![1]).toBe('application/pdf');
    expect(result.inlineCount).toBe(1);
    expect(result.fileDataCount).toBe(2);

    const parts = result.body.contents[0]!.parts;
    expect(parts).toHaveLength(4);
    expect((parts[0] as GeminiTextPart).text).toBe('mixed');
    expect('inline_data' in (parts[1] as object)).toBe(true);
    expect((parts[1] as GeminiInlineDataPart).inline_data.data).toBe(smallPng);
    expect('file_data' in (parts[2] as object)).toBe(true);
    expect((parts[2] as GeminiFileDataPart).file_data.file_uri).toBe('files/large-png');
    expect('file_data' in (parts[3] as object)).toBe(true);
    expect((parts[3] as GeminiFileDataPart).file_data.file_uri).toBe('files/large-pdf');
  });

  it('surfaces an upload error via a FILE_UPLOAD_FAILED warning rather than swallowing it silently (inline fallback retained on the part)', async () => {
    const bigPng = base64OfSize(50_000);
    const uploadErr = new Error('Files API: 503 Service Unavailable');
    const uploadFn = jest.fn<Promise<string>, [Buffer, string]>().mockRejectedValue(uploadErr);
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${bigPng}` },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 10_000);

    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('FILE_UPLOAD_FAILED');
    expect(result.warnings[0]!.detail).toContain('Files API: 503 Service Unavailable');
    // The builder falls back to inline so the caller still sees an inline part
    // rather than a dropped attachment — surfacing the error AND keeping the
    // attachment delivery best-effort.
    expect(result.inlineCount).toBe(1);
    expect(result.fileDataCount).toBe(0);
  });

  it('maps assistant role to "model" and user role to "user"', async () => {
    const uploadFn = jest.fn();
    const source: OpenAiChatMessage[] = [
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Answer' },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 1000);

    expect(result.body.contents).toHaveLength(2);
    expect(result.body.contents[0]!.role).toBe('user');
    expect(result.body.contents[1]!.role).toBe('model');
  });

  it('drops a malformed data URL with a MALFORMED_DATA_URL warning', async () => {
    const uploadFn = jest.fn();
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'header' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png,not-base64' },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 1000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('MALFORMED_DATA_URL');
  });

  it('drops a non-data: URL with a NON_DATA_URL_IMAGE warning', async () => {
    const uploadFn = jest.fn();
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'header' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/foo.png' },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 1000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.warnings[0]!.reason).toBe('NON_DATA_URL_IMAGE');
  });

  it('drops an empty payload with an EMPTY_IMAGE_PAYLOAD warning', async () => {
    const uploadFn = jest.fn();
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'header' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,' },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 1000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.warnings[0]!.reason).toBe('EMPTY_IMAGE_PAYLOAD');
  });

  it('returns empty contents and no warnings for empty input', async () => {
    const uploadFn = jest.fn();

    const result = await buildGeminiRequestBody([], uploadFn, 1000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.body.contents).toEqual([]);
    expect(result.warnings).toHaveLength(0);
    expect(result.inlineCount).toBe(0);
    expect(result.fileDataCount).toBe(0);
  });
});
