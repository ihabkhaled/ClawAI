import { vi } from 'vitest';

const httpPost = vi.fn();

vi.mock('@claw/shared-utilities', () => ({
  httpPost: (...args: unknown[]) => httpPost(...args),
  declaredHost: (url: string) => url,
}));

const { transcribeWithOpenAi } = await import('../openai-transcription.adapter');

// Multimodal batch 4 — whisper reports no tokens. `verbose_json` reports the
// clip's `duration`, which is the measured unit PAYG finalizes on.
describe('transcribeWithOpenAi', () => {
  beforeEach(() => {
    httpPost.mockReset();
  });

  it('asks for verbose_json and returns the measured duration', async () => {
    httpPost.mockResolvedValue({ text: ' hello ', duration: 12.5 });

    const result = await transcribeWithOpenAi(
      'https://api.openai.com/v1',
      'sk-test',
      'YmFzZTY0',
      'audio/webm',
      'whisper-1',
    );

    expect(result).toEqual({ text: 'hello', durationSeconds: 12.5 });
    const [url, form] = httpPost.mock.calls[0] as [string, FormData, unknown, unknown];
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(form.get('response_format')).toBe('verbose_json');
    expect(form.get('model')).toBe('whisper-1');
  });

  it('leaves the duration undefined when the provider omits it', async () => {
    httpPost.mockResolvedValue({ text: 'hi' });

    const result = await transcribeWithOpenAi(
      'https://api.openai.com/v1',
      'k',
      'YmFzZTY0',
      'audio/webm',
      'whisper-1',
    );

    expect(result).toEqual({ text: 'hi', durationSeconds: undefined });
  });
});
