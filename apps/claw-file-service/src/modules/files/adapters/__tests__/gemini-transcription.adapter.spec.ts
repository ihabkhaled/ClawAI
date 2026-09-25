import { vi } from 'vitest';
import type * as SharedUtilities from '@claw/shared-utilities';

const httpPost = vi.fn();

vi.mock('@claw/shared-utilities', async (importOriginal) => {
  const actual = await importOriginal<typeof SharedUtilities>();
  return {
    httpPost: (...args: unknown[]) => httpPost(...args),
    declaredHost: (url: string) => url,
    extractGeminiUsage: actual.extractGeminiUsage,
  };
});

const { transcribeWithGemini } = await import('../gemini-transcription.adapter');
const { TranscriptionResponseIssue } = await import('../../../../common/enums');
const { TranscriptionResponseError } = await import('../../../../common/errors');

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

    expect(transcript).toEqual({ text: 'hello world' });
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

  // Multimodal batch 4 — PAYG. The finalize settles on what Gemini REPORTED,
  // and the request carries the ceiling the hold GRANTED (rule 37 item 2).
  it('returns usageMetadata as measured usage, thinking tokens folded into completion', async () => {
    httpPost.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'words' }] } }],
      usageMetadata: {
        promptTokenCount: 200,
        candidatesTokenCount: 30,
        thoughtsTokenCount: 10,
        cachedContentTokenCount: 0,
      },
    });

    const result = await transcribeWithGemini(
      'https://generativelanguage.googleapis.com/v1beta',
      'api-key-1',
      'YmFzZTY0',
      'audio/wav',
      'gemini-2.5-flash',
      640,
    );

    expect(result).toEqual({
      text: 'words',
      usage: {
        promptTokens: 200,
        completionTokens: 40,
        cachedPromptTokens: 0,
        reasoningTokens: 10,
      },
    });
    const [, body] = httpPost.mock.calls[0] as [string, Record<string, unknown>, unknown, unknown];
    expect(body.generationConfig).toEqual({
      temperature: 0,
      maxOutputTokens: 640,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it('sends temperature 0 but no ceiling when none is given', async () => {
    httpPost.mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] });

    await transcribeWithGemini(
      'https://x.test/v1beta',
      'k',
      'YmFzZTY0',
      'audio/wav',
      'gemini-2.5-flash',
    );

    const [, body] = httpPost.mock.calls[0] as [string, Record<string, unknown>, unknown, unknown];
    expect(body.generationConfig).toEqual({
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });
});

// Live 2026-09-25: Gemini 2.5 Flash spent 1002 completion tokens where another
// run spent 453, and once answered 200 with 0 characters. Thinking goes off
// where the model accepts it, and the response is read part by part.
describe('transcribeWithGemini — generation config and response reading', () => {
  const call = (model: string): Promise<unknown> =>
    transcribeWithGemini('https://x.test/v1beta', 'k', 'YmFzZTY0', 'audio/wav', model, 512);
  const sentConfig = (): Record<string, unknown> => {
    const [, body] = httpPost.mock.calls[0] as [string, Record<string, unknown>, unknown, unknown];
    return body.generationConfig as Record<string, unknown>;
  };

  beforeEach(() => {
    httpPost.mockReset();
    httpPost.mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
  });

  it.each([
    'gemini-2.5-flash',
    'models/gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'models/gemini-2.5-flash-lite',
  ])('turns thinking off for %s, inside the same generationConfig', async (model) => {
    await call(model);
    expect(sentConfig()).toEqual({
      temperature: 0,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it.each(['gemini-2.5-pro', 'models/gemini-2.5-pro', 'models/gemini-2.0-flash', 'gemini-3-pro'])(
    'sends no thinkingConfig for %s (0 is rejected or unknown there)',
    async (model) => {
      await call(model);
      expect(sentConfig()).toEqual({ temperature: 0, maxOutputTokens: 512 });
    },
  );

  it('joins non-thought parts in order and skips thought parts', async () => {
    httpPost.mockResolvedValue({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              { text: 'Planning the transcript…', thought: true },
              { text: 'Hello ' },
              { text: 'secret reasoning', thought: true },
              { text: 'world.' },
            ],
          },
        },
      ],
    });
    await expect(call('gemini-2.5-flash')).resolves.toEqual({ text: 'Hello world.' });
  });

  it('throws THOUGHT_ONLY when the only text is in thought parts', async () => {
    httpPost.mockResolvedValue({
      candidates: [
        { finishReason: 'STOP', content: { parts: [{ text: 'thinking…', thought: true }] } },
      ],
      usageMetadata: { promptTokenCount: 207, candidatesTokenCount: 0, thoughtsTokenCount: 158 },
    });
    await expect(call('gemini-2.5-pro')).rejects.toMatchObject({
      name: 'TranscriptionResponseError',
      issue: TranscriptionResponseIssue.THOUGHT_ONLY,
    });
  });

  it('throws TRUNCATED on MAX_TOKENS, even with partial text', async () => {
    httpPost.mockResolvedValue({
      candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Hello wor' }] } }],
    });
    await expect(call('gemini-2.5-flash')).rejects.toMatchObject({
      issue: TranscriptionResponseIssue.TRUNCATED,
    });
  });

  it.each(['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'])(
    'throws BLOCKED naming %s, never "empty transcript"',
    async (finishReason) => {
      httpPost.mockResolvedValue({ candidates: [{ finishReason, content: { parts: [] } }] });
      const error = await call('gemini-2.5-flash').catch((thrown: unknown) => thrown);
      expect(error).toBeInstanceOf(TranscriptionResponseError);
      expect(error).toMatchObject({ issue: TranscriptionResponseIssue.BLOCKED });
      expect((error as Error).message).toContain(finishReason);
    },
  );

  it('throws BLOCKED on promptFeedback.blockReason with no candidates', async () => {
    httpPost.mockResolvedValue({ promptFeedback: { blockReason: 'OTHER' } });
    await expect(call('gemini-2.5-flash')).rejects.toMatchObject({
      issue: TranscriptionResponseIssue.BLOCKED,
    });
  });

  it('returns a plain empty STOP answer as empty text — the manager owns that check', async () => {
    httpPost.mockResolvedValue({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '  ' }] } }],
      usageMetadata: { promptTokenCount: 207, candidatesTokenCount: 0 },
    });
    await expect(call('gemini-2.5-flash')).resolves.toMatchObject({ text: '' });
  });
});
