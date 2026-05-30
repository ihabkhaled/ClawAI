import { transformOpenAiMessagesToOllama } from '../ollama-message-shape.utility';
import type { OpenAiChatMessage } from '../../types/execution.types';

describe('transformOpenAiMessagesToOllama', () => {
  it('passes through a text-only message unchanged', () => {
    const source: OpenAiChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello there' },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.messages).toEqual([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello there' },
    ]);
    // No `images` field when there were no images.
    expect(result.messages[0]).not.toHaveProperty('images');
    expect(result.messages[1]).not.toHaveProperty('images');
  });

  it('extracts base64 payload from a single image_url content part', () => {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAA';
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(1);
    expect(result.warnings).toHaveLength(0);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({
      role: 'user',
      content: 'Describe this image',
      images: [base64],
    });
  });

  it('extracts base64 payloads from multiple image parts in the last message', () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAA';
    const jpeg = '/9j/4AAQSkZJRgABAQEAYABg';
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Compare these two images' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${png}` } },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpeg}` } },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.messages[0]!.images).toEqual([png, jpeg]);
    expect(result.messages[0]!.content).toBe('Compare these two images');
  });

  it('concatenates multiple text parts with newlines and keeps images on the same message', () => {
    const base64 = 'AAAA';
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'First sentence.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
          { type: 'text', text: 'Second sentence.' },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(1);
    expect(result.messages[0]!.content).toBe('First sentence.\nSecond sentence.');
    expect(result.messages[0]!.images).toEqual([base64]);
  });

  it('skips empty text parts (no leading/trailing newline in concatenated content)', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '' },
          { type: 'text', text: 'Only this should show up' },
          { type: 'text', text: '' },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(0);
    expect(result.messages[0]!.content).toBe('Only this should show up');
  });

  it('drops a malformed data URL (no base64 marker) with a MALFORMED_DATA_URL warning', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Look at this' },
          { type: 'image_url', image_url: { url: 'data:image/png,not-actually-base64' } },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('MALFORMED_DATA_URL');
    expect(result.messages[0]).not.toHaveProperty('images');
    expect(result.messages[0]!.content).toBe('Look at this');
  });

  it('drops a non-data: URL image (e.g. https://...) with a NON_DATA_URL_IMAGE warning', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Web image' },
          { type: 'image_url', image_url: { url: 'https://example.com/foo.png' } },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('NON_DATA_URL_IMAGE');
    expect(result.messages[0]).not.toHaveProperty('images');
  });

  it('drops an empty base64 payload with an EMPTY_IMAGE_PAYLOAD warning', () => {
    const source: OpenAiChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Zero-byte image' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,' } },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.reason).toBe('EMPTY_IMAGE_PAYLOAD');
    expect(result.messages[0]).not.toHaveProperty('images');
  });

  it('handles a system message before a multimodal user message correctly', () => {
    const base64 = 'AAAA';
    const source: OpenAiChatMessage[] = [
      { role: 'system', content: 'system prompt' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
        ],
      },
    ];

    const result = transformOpenAiMessagesToOllama(source);

    expect(result.imageCount).toBe(1);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toEqual({ role: 'system', content: 'system prompt' });
    expect(result.messages[1]).toEqual({
      role: 'user',
      content: 'What is this?',
      images: [base64],
    });
  });

  it('returns empty messages array for empty input', () => {
    const result = transformOpenAiMessagesToOllama([]);

    expect(result.messages).toEqual([]);
    expect(result.imageCount).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });
});
