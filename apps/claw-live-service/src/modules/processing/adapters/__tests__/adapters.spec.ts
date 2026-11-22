vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({
      FILE_SERVICE_URL: 'http://file-service:4005',
      CONNECTOR_SERVICE_URL: 'http://connector-service:4003',
      INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
    }),
  },
}));

import { LiveModelError } from '../../errors/processing.errors';
import { LiveModelClient } from '../live-model.adapter';
import { TranscriptionAdapter } from '../transcription.adapter';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const sttBody = {
  text: 'hi',
  language: 'en',
  provider: 'GEMINI',
  model: 'flash',
  durationSeconds: 6,
  costMicroUsd: 3,
  costKnown: true,
  noSpeech: false,
};

describe('TranscriptionAdapter', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts the chunk with Service auth to transcribe-chunk', async () => {
    fetchMock.mockResolvedValueOnce(json(sttBody));
    await expect(
      new TranscriptionAdapter().transcribe(Buffer.from('wav'), 'live:r:1'),
    ).resolves.toEqual(sttBody);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://file-service:4005/api/v1/internal/files/transcribe-chunk');
    expect(init.headers.Authorization).toBe(`Service ${'x'.repeat(32)}`);
    expect(init.redirect).toBe('error');
    expect(JSON.parse(init.body)).toEqual({
      contentBase64: Buffer.from('wav').toString('base64'),
      mimeType: 'audio/wav',
      requestId: 'live:r:1',
    });
  });

  it('retries twice with backoff, then gives up with null', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ bad: true }));
    const pending = new TranscriptionAdapter().transcribe(Buffer.from('wav'), 'live:r:2');
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('succeeds on a retry', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json(sttBody));
    const pending = new TranscriptionAdapter().transcribe(Buffer.from('wav'), 'live:r:3');
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual(sttBody);
  });
});

describe('LiveModelClient', () => {
  const fetchMock = vi.fn();
  const chain = [
    { connector: 'OLLAMA', model: 'gemma', style: 'OLLAMA' as const },
    { connector: 'GEMINI', model: 'flash', style: 'OPENAI_COMPAT' as const },
  ];
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('walks the chain: an Ollama failure falls through to the OpenAI-compatible model', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ apiKey: 'k1', baseUrl: 'https://ollama.com' }))
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json({ apiKey: 'k2' }))
      .mockResolvedValueOnce(json({ choices: [{ message: { content: '{"ok":true}' } }] }));
    const reply = await new LiveModelClient().complete(chain, {
      system: 's',
      user: 'u',
      maxTokens: 50,
      imageJpegBase64: 'AAA',
    });
    expect(reply).toMatchObject({ content: '{"ok":true}', connector: 'GEMINI', model: 'flash' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://connector-service:4003/api/v1/internal/connectors/config?provider=OLLAMA',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://ollama.com/api/chat');
    const ollamaBody = JSON.parse(fetchMock.mock.calls[1]?.[1].body);
    expect(ollamaBody.messages[1].images).toEqual(['AAA']);
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    );
    const openAiBody = JSON.parse(fetchMock.mock.calls[3]?.[1].body);
    expect(openAiBody.messages[1].content[1].image_url.url).toBe('data:image/jpeg;base64,AAA');
    expect(fetchMock.mock.calls[3]?.[1].headers.authorization).toBe('Bearer k2');
  });

  it('caches connector config and throws a code when every model fails', async () => {
    const client = new LiveModelClient();
    fetchMock
      .mockResolvedValueOnce(json({ apiKey: 'k1' }))
      .mockResolvedValueOnce(json({ message: { content: 'first' } }))
      .mockResolvedValueOnce(json({ message: { content: '  ' } }));
    await expect(
      client.complete([chain[0]!], { system: 's', user: 'u', maxTokens: 5 }),
    ).resolves.toMatchObject({ content: 'first' });
    await expect(
      client.complete([chain[0]!], { system: 's', user: 'u', maxTokens: 5 }),
    ).rejects.toEqual(new LiveModelError('EMPTY_REPLY'));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports a connector that is not configured or unreachable', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404));
    await expect(
      new LiveModelClient().complete([chain[0]!], { system: 's', user: 'u', maxTokens: 5 }),
    ).rejects.toMatchObject({ code: 'CONNECTOR_NOT_CONFIGURED' });
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(
      new LiveModelClient().complete([chain[0]!], { system: 's', user: 'u', maxTokens: 5 }),
    ).rejects.toMatchObject({ code: 'CONNECTOR_UNREACHABLE' });
    await expect(
      new LiveModelClient().complete([], { system: 's', user: 'u', maxTokens: 5 }),
    ).rejects.toMatchObject({ code: 'NO_MODEL_AVAILABLE' });
  });
});
