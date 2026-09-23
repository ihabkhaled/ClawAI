import { vi } from 'vitest';

const httpPost = vi.fn();

vi.mock('@claw/shared-utilities', () => ({
  httpPost: (...args: unknown[]) => httpPost(...args),
  declaredHost: (url: string) => url,
}));

const { transcribeWithGemini } = await import('../gemini-transcription.adapter');

// Regression (live QA, 2026-09-23): the connector catalog's Gemini model key
// carries a `models/` prefix. Sending it straight into the URL produced
// `/models/models%2F<model>:generateContent` and Gemini's REST API 400s on it
// every time — every transcription failed regardless of the audio. See
// transcription-format.utility.spec.ts for the isolated stripping test; this
// proves the adapter actually calls the stripped URL, not just the helper.
describe('transcribeWithGemini', () => {
  beforeEach(() => {
    httpPost.mockReset();
  });

  it('calls the native generateContent URL with exactly one "models/" segment', async () => {
    httpPost.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'hello world' }] } }],
    });

    const transcript = await transcribeWithGemini(
      'https://generativelanguage.googleapis.com/v1beta/openai',
      'api-key-1',
      'YmFzZTY0',
      'audio/wav',
      'models/antigravity-preview-05-2026',
    );

    expect(transcript).toBe('hello world');
    expect(httpPost).toHaveBeenCalledTimes(1);
    const [url] = httpPost.mock.calls[0] as [string, unknown, unknown, unknown];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/antigravity-preview-05-2026:generateContent',
    );
  });

  it('does not double-prefix a model key that already has none', async () => {
    httpPost.mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] });

    await transcribeWithGemini(
      'https://generativelanguage.googleapis.com/v1beta',
      'api-key-1',
      'YmFzZTY0',
      'audio/wav',
      'gemini-2.5-flash',
    );

    const [url] = httpPost.mock.calls[0] as [string, unknown, unknown, unknown];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
  });
});
