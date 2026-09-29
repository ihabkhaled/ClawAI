// B6b — capability routing unit tests.
//
// Proves the two things the routing decision must never get wrong:
//   - GEMINI is preferred over OPENAI regardless of snapshot order
//   - a model with no AUDIO modality is not treated as capable

import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { httpGet } from '@claw/shared-utilities';
import { TranscriptionCapabilityClient } from '../transcription-capability.client';
import { type TranscriptionSnapshotResponse } from '../../types/transcription.types';

vi.mock('@claw/shared-utilities', () => ({
  httpGet: vi.fn(),
  declaredHost: vi.fn(() => new Set(['connector-service:4003'])),
}));

const localConfig = vi.hoisted(() => ({ base: '' }));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({
      CONNECTOR_SERVICE_URL: 'http://connector-service:4003',
      LOCAL_SPEECH_BASE_URL: localConfig.base,
    })),
  },
}));

const mockedHttpGet = httpGet as MockedFunction<typeof httpGet>;

const snapshot = (models: TranscriptionSnapshotResponse['models']): TranscriptionSnapshotResponse =>
  ({ models }) as TranscriptionSnapshotResponse;

describe('TranscriptionCapabilityClient', () => {
  let client: TranscriptionCapabilityClient;

  beforeEach(() => {
    vi.clearAllMocks();
    TranscriptionCapabilityClient.invalidate();
    client = new TranscriptionCapabilityClient();
  });

  it('prefers GEMINI over OPENAI even when OpenAI rows come first', async () => {
    mockedHttpGet.mockResolvedValue(
      snapshot([
        { provider: 'OPENAI', modelKey: 'gpt-4o', modalitiesIn: ['TEXT', 'AUDIO'] },
        { provider: 'GEMINI', modelKey: 'gemini-2.5-flash', modalitiesIn: ['TEXT', 'AUDIO'] },
      ]),
    );

    await expect(client.findCapableModel()).resolves.toEqual({
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
    });
  });

  it('ignores models with no AUDIO modality', async () => {
    mockedHttpGet.mockResolvedValue(
      snapshot([
        { provider: 'GEMINI', modelKey: 'gemini-text', modalitiesIn: ['TEXT', 'IMAGE_INPUT'] },
        { provider: 'OPENAI', modelKey: 'gpt-4o-mini', modalitiesIn: ['TEXT'] },
      ]),
    );

    await expect(client.findCapableModel()).resolves.toBeNull();
  });

  it('falls back to OPENAI when only OpenAI has an audio-capable model', async () => {
    mockedHttpGet.mockResolvedValue(
      snapshot([
        { provider: 'GEMINI', modelKey: 'gemini-text', modalitiesIn: ['TEXT'] },
        { provider: 'OPENAI', modelKey: 'gpt-4o-audio', modalitiesIn: ['TEXT', 'AUDIO'] },
      ]),
    );

    await expect(client.findCapableModel()).resolves.toEqual({
      provider: 'OPENAI',
      model: 'gpt-4o-audio',
    });
  });

  it('accepts the raw supportsAudio flag when the snapshot exposes it', async () => {
    mockedHttpGet.mockResolvedValue(
      snapshot([{ provider: 'GEMINI', modelKey: 'gemini-flash', supportsAudio: true }]),
    );

    await expect(client.findCapableModel()).resolves.toEqual({
      provider: 'GEMINI',
      model: 'gemini-flash',
    });
  });

  it('ignores an audio-capable provider that has no adapter', async () => {
    mockedHttpGet.mockResolvedValue(
      snapshot([{ provider: 'ANTHROPIC', modelKey: 'claude-audio', modalitiesIn: ['AUDIO'] }]),
    );

    await expect(client.findCapableModel()).resolves.toBeNull();
  });

  it('returns null instead of throwing when connector-service is unreachable', async () => {
    mockedHttpGet.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(client.findCapableModel()).resolves.toBeNull();
  });

  it('caches the answer so a batch of uploads makes one snapshot call', async () => {
    mockedHttpGet.mockResolvedValue(
      snapshot([{ provider: 'GEMINI', modelKey: 'gemini-flash', modalitiesIn: ['AUDIO'] }]),
    );

    await client.findCapableModel();
    await client.findCapableModel();
    await new TranscriptionCapabilityClient().findCapableModel();

    expect(mockedHttpGet).toHaveBeenCalledTimes(1);
  });

  it('rejects a connector config with no API key', async () => {
    mockedHttpGet.mockResolvedValue({ provider: 'GEMINI', apiKey: '' });

    await expect(client.fetchConnectorConfig('GEMINI')).rejects.toThrow(
      'Connector GEMINI returned no API key',
    );
  });

  describe('findCapableModels', () => {
    it('returns every provider in priority order, not just the first', async () => {
      mockedHttpGet.mockResolvedValue(
        snapshot([
          { provider: 'OPENAI', modelKey: 'gpt-4o-audio', modalitiesIn: ['AUDIO'] },
          { provider: 'GEMINI', modelKey: 'gemini-2.5-flash', modalitiesIn: ['AUDIO'] },
        ]),
      );

      await expect(client.findCapableModels()).resolves.toEqual([
        { provider: 'GEMINI', model: 'gemini-2.5-flash' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);
    });

    it('returns only the providers that actually have an audio-capable row', async () => {
      mockedHttpGet.mockResolvedValue(
        snapshot([{ provider: 'GEMINI', modelKey: 'gemini-2.5-flash', modalitiesIn: ['AUDIO'] }]),
      );

      await expect(client.findCapableModels()).resolves.toEqual([
        { provider: 'GEMINI', model: 'gemini-2.5-flash' },
      ]);
    });

    // Prod 2026-09-25: the snapshot's first GEMINI audio row was
    // models/antigravity-preview-05-2026 and every voice note went there.
    it('ranks a stable flash model ahead of the preview row the snapshot lists first', async () => {
      mockedHttpGet.mockResolvedValue(
        snapshot([
          {
            provider: 'GEMINI',
            modelKey: 'models/antigravity-preview-05-2026',
            modalitiesIn: ['TEXT', 'AUDIO'],
          },
          { provider: 'GEMINI', modelKey: 'models/gemini-2.5-pro', modalitiesIn: ['AUDIO'] },
          { provider: 'GEMINI', modelKey: 'models/gemini-2.5-flash', modalitiesIn: ['AUDIO'] },
          { provider: 'OPENAI', modelKey: 'gpt-4o-audio', modalitiesIn: ['AUDIO'] },
        ]),
      );

      await expect(client.findCapableModels()).resolves.toEqual([
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
        { provider: 'GEMINI', model: 'models/gemini-2.5-pro' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);
    });

    it('returns an empty list, not null, when nothing is capable', async () => {
      mockedHttpGet.mockResolvedValue(snapshot([]));

      await expect(client.findCapableModels()).resolves.toEqual([]);
    });

    it('caches the whole list, matching findCapableModel', async () => {
      mockedHttpGet.mockResolvedValue(
        snapshot([{ provider: 'GEMINI', modelKey: 'gemini-2.5-flash', modalitiesIn: ['AUDIO'] }]),
      );

      await client.findCapableModels();
      await client.findCapableModels();

      expect(mockedHttpGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('LOCAL candidate (ADR-128)', () => {
    beforeEach(() => {
      localConfig.base = 'http://speech:8000';
    });

    afterEach(() => {
      localConfig.base = '';
    });

    it('appends LOCAL AFTER every cloud candidate when the container is healthy', async () => {
      mockedHttpGet
        .mockResolvedValueOnce(
          snapshot([
            { provider: 'GEMINI', modelKey: 'gemini-2.5-flash', modalitiesIn: ['AUDIO'] },
            { provider: 'OPENAI', modelKey: 'gpt-4o-audio', modalitiesIn: ['AUDIO'] },
          ]),
        )
        .mockResolvedValueOnce('OK');

      const all = await client.findCapableModels();

      expect(all.map((c) => c.provider)).toEqual(['GEMINI', 'OPENAI', 'LOCAL']);
      expect(all[2]).toEqual({ provider: 'LOCAL', model: 'Systran/faster-whisper-small' });
      expect(mockedHttpGet.mock.calls[1]?.[0]).toBe('http://speech:8000/health');
    });

    it('is the ONLY candidate when no cloud connector is audio-capable', async () => {
      mockedHttpGet
        .mockResolvedValueOnce(
          snapshot([{ provider: 'GEMINI', modelKey: 'gemini-text', modalitiesIn: ['TEXT'] }]),
        )
        .mockResolvedValueOnce('OK');

      await expect(client.findCapableModel()).resolves.toEqual({
        provider: 'LOCAL',
        model: 'Systran/faster-whisper-small',
      });
    });

    it('is still offered when connector-service is down', async () => {
      mockedHttpGet
        .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
        .mockResolvedValueOnce('OK');

      await expect(client.findCapableModels()).resolves.toEqual([
        { provider: 'LOCAL', model: 'Systran/faster-whisper-small' },
      ]);
    });

    it('is not offered when the container does not answer its health check', async () => {
      mockedHttpGet
        .mockResolvedValueOnce(snapshot([]))
        .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND speech'));

      await expect(client.findCapableModels()).resolves.toEqual([]);
    });

    it('is off when LOCAL_SPEECH_BASE_URL is blank (no probe at all)', async () => {
      localConfig.base = '  ';
      mockedHttpGet.mockResolvedValueOnce(snapshot([]));

      await expect(client.findCapableModels()).resolves.toEqual([]);
      expect(mockedHttpGet).toHaveBeenCalledTimes(1);
    });

    it('builds LOCAL config without asking connector-service, with an inert key', async () => {
      await expect(client.fetchConnectorConfig('LOCAL')).resolves.toEqual({
        provider: 'LOCAL',
        apiKey: 'local',
        baseUrl: 'http://speech:8000/v1',
      });
      expect(mockedHttpGet).not.toHaveBeenCalled();
    });

    it('does not double the /v1 an operator already wrote', async () => {
      localConfig.base = 'http://proxy/v1/';

      const config = await client.fetchConnectorConfig('LOCAL');

      expect(config.baseUrl).toBe('http://proxy/v1');
    });

    it('refuses LOCAL config when the base URL is blank', async () => {
      localConfig.base = '';

      await expect(client.fetchConnectorConfig('LOCAL')).rejects.toThrow(
        'Local speech is not configured',
      );
    });
  });
});
