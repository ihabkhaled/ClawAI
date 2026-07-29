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

  it('inlines a small video with its original MIME type without decoding it as text', async () => {
    const uploadFn = jest.fn<Promise<string>, [Buffer, string]>();
    const videoBase64 = Buffer.from('small-video-bytes').toString('base64');
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this clip' },
          {
            type: 'image_url',
            image_url: { url: `data:video/mp4;base64,${videoBase64}` },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 10_000);

    expect(uploadFn).not.toHaveBeenCalled();
    expect(result.inlineCount).toBe(1);
    const inlinePart = result.body.contents[0]!.parts[1] as GeminiInlineDataPart;
    expect(inlinePart.inline_data).toEqual({
      mime_type: 'video/mp4',
      data: videoBase64,
    });
  });

  it('uploads a large video through the Gemini Files API path', async () => {
    const uploadFn = jest
      .fn<Promise<string>, [Buffer, string]>()
      .mockResolvedValue('files/video-123');
    const videoBase64 = base64OfSize(50_000);
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:video/webm;base64,${videoBase64}` },
          },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 10_000);

    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(uploadFn.mock.calls[0]![0]).toEqual(Buffer.from(videoBase64, 'base64'));
    expect(uploadFn.mock.calls[0]![1]).toBe('video/webm');
    expect(result.fileDataCount).toBe(1);
    const filePart = result.body.contents[0]!.parts[0] as GeminiFileDataPart;
    expect(filePart.file_data).toEqual({
      mime_type: 'video/webm',
      file_uri: 'files/video-123',
    });
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

  it('does not inline an oversized attachment when the Files API upload fails', async () => {
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

    await expect(buildGeminiRequestBody(source, uploadFn, 10_000)).rejects.toThrow(
      'Files API: 503 Service Unavailable',
    );

    expect(uploadFn).toHaveBeenCalledTimes(1);
    // Oversized content must never be copied back into inline_data after an
    // upload failure; rejecting the request preserves the hard size boundary.
  });

  it('uses Files API when aggregate encoded inline bytes exceed the request ceiling', async () => {
    const first = base64OfSize(6);
    const second = base64OfSize(6);
    const uploadFn = jest.fn<Promise<string>, [Buffer, string]>().mockResolvedValue('files/second');
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${first}` } },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${second}` } },
        ],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 12);

    expect(result.inlineCount).toBe(1);
    expect(result.fileDataCount).toBe(1);
    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect((result.body.contents[0]!.parts[0] as GeminiInlineDataPart).inline_data.data).toBe(
      first,
    );
    expect((result.body.contents[0]!.parts[1] as GeminiFileDataPart).file_data.file_uri).toBe(
      'files/second',
    );
  });

  it.each([
    ['video/quicktime', 'video/mov'],
    ['video/x-msvideo', 'video/avi'],
  ])('normalizes %s to Gemini provider MIME %s', async (inputMime, providerMime) => {
    const payload = base64OfSize(50_000);
    const uploadFn = jest.fn<Promise<string>, [Buffer, string]>().mockResolvedValue('files/video');
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: `data:${inputMime};base64,${payload}` } }],
      },
    ];

    const result = await buildGeminiRequestBody(source, uploadFn, 10_000);

    expect(uploadFn).toHaveBeenCalledWith(expect.any(Buffer), providerMime);
    expect((result.body.contents[0]!.parts[0] as GeminiFileDataPart).file_data.mime_type).toBe(
      providerMime,
    );
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
