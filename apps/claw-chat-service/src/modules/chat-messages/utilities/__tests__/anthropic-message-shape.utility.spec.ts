// Slice D — Anthropic native Messages API transform unit tests.
//
// Covers the OpenAI-canonical → Anthropic blocks transformation:
//   - text-only passthrough
//   - PDF data URLs → document blocks (the critical PDF native path)
//   - image data URLs → image blocks
//   - mixed PDF + image + text in correct order
//   - role passthrough (system / user)
//   - empty input → empty output (no throw)

import { transformOpenAiMessagesToAnthropic } from '../anthropic-message-shape.utility';
import type { OpenAiChatMessage } from '../../types/execution.types';
import type {
  AnthropicDocumentBlock,
  AnthropicImageBlock,
  AnthropicTextBlock,
} from '../../types/anthropic-message-shape.types';

describe('transformOpenAiMessagesToAnthropic', () => {
  it('passes through a text-only message as a plain string content', () => {
    const source: OpenAiChatMessage[] = [{ role: 'user', content: 'Hello there' }];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.pdfCount).toBe(0);
    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({
      role: 'user',
      content: 'Hello there',
    });
  });

  it('passes through a text-only multi-part message as a single text block array', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Just text here' }],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.pdfCount).toBe(0);
    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.messages).toHaveLength(1);
    const content = result.messages[0]!.content;
    expect(Array.isArray(content)).toBe(true);
    const blocks = content as Array<AnthropicTextBlock>;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: 'text', text: 'Just text here' });
  });

  it('transforms a base64 PDF image_url into an Anthropic document block', () => {
    const pdfBase64 = 'JVBERi0xLjQKJeLjz9MKMSAwIG9iagoo';
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Summarise this PDF' },
          {
            type: 'image_url',
            image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
          },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.pdfCount).toBe(1);
    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.messages).toHaveLength(1);
    const blocks = result.messages[0]!.content as Array<
      AnthropicTextBlock | AnthropicDocumentBlock
    >;
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'text', text: 'Summarise this PDF' });
    expect(blocks[1]).toEqual({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBase64,
      },
    });
  });

  it('transforms a base64 PNG image_url into an Anthropic image block', () => {
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAA';
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image' },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${pngBase64}` },
          },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.pdfCount).toBe(0);
    expect(result.imageCount).toBe(1);
    expect(result.warnings).toHaveLength(0);
    const blocks = result.messages[0]!.content as Array<AnthropicTextBlock | AnthropicImageBlock>;
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toEqual({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: pngBase64,
      },
    });
  });

  it('preserves mixed text + PDF + image ordering as 3 blocks', () => {
    const pdfBase64 = 'JVBERi0xLjQK';
    const pngBase64 = 'iVBORw0KGgo=';
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Compare these two:' },
          {
            type: 'image_url',
            image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${pngBase64}` },
          },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.pdfCount).toBe(1);
    expect(result.imageCount).toBe(1);
    expect(result.warnings).toHaveLength(0);
    const blocks = result.messages[0]!.content as Array<
      AnthropicTextBlock | AnthropicImageBlock | AnthropicDocumentBlock
    >;
    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.type).toBe('text');
    expect(blocks[1]!.type).toBe('document');
    expect(blocks[2]!.type).toBe('image');
    expect((blocks[0] as AnthropicTextBlock).text).toBe('Compare these two:');
    expect((blocks[1] as AnthropicDocumentBlock).source.media_type).toBe('application/pdf');
    expect((blocks[1] as AnthropicDocumentBlock).source.data).toBe(pdfBase64);
    expect((blocks[2] as AnthropicImageBlock).source.media_type).toBe('image/png');
    expect((blocks[2] as AnthropicImageBlock).source.data).toBe(pngBase64);
  });

  it('passes the system role through verbatim (Anthropic SDK splits system out of the messages array at the client layer)', () => {
    const source: OpenAiChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hi' },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toEqual({
      role: 'system',
      content: 'You are a helpful assistant.',
    });
    expect(result.messages[1]).toEqual({ role: 'user', content: 'Hi' });
    expect(result.pdfCount).toBe(0);
    expect(result.imageCount).toBe(0);
  });

  it('returns empty messages array for empty input without throwing', () => {
    expect(() => transformOpenAiMessagesToAnthropic([])).not.toThrow();

    const result = transformOpenAiMessagesToAnthropic([]);
    expect(result.messages).toEqual([]);
    expect(result.pdfCount).toBe(0);
    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('drops an empty text part inside an array content (no zero-length text block emitted)', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '' },
          { type: 'text', text: 'real text' },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    const blocks = result.messages[0]!.content as AnthropicTextBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('real text');
  });

  it('emits a MALFORMED_DATA_URL warning and drops the part when the data URL has no base64 marker', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Look at this' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png,not-base64' },
          },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('MALFORMED_DATA_URL');
    expect(result.imageCount).toBe(0);
    expect(result.pdfCount).toBe(0);
    const blocks = result.messages[0]!.content as AnthropicTextBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('Look at this');
  });

  it('emits a NON_DATA_URL_IMAGE warning and drops the part for https:// URLs', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hosted image' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/foo.png' },
          },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('NON_DATA_URL_IMAGE');
    expect(result.imageCount).toBe(0);
  });

  it('emits an EMPTY_IMAGE_PAYLOAD warning and drops the part when base64 payload is empty', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Zero-byte' },
          {
            type: 'image_url',
            image_url: { url: 'data:application/pdf;base64,' },
          },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('EMPTY_IMAGE_PAYLOAD');
    expect(result.pdfCount).toBe(0);
    expect(result.imageCount).toBe(0);
  });

  it('treats application/pdf with mixed case as a PDF (case-insensitive media type match)', () => {
    const pdfBase64 = 'JVBERi0=';
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:Application/PDF;base64,${pdfBase64}` },
          },
        ],
      },
    ];

    const result = transformOpenAiMessagesToAnthropic(source);

    expect(result.pdfCount).toBe(1);
    expect(result.imageCount).toBe(0);
    const blocks = result.messages[0]!.content as AnthropicDocumentBlock[];
    expect(blocks[0]!.type).toBe('document');
    expect(blocks[0]!.source.media_type).toBe('application/pdf');
  });
});
