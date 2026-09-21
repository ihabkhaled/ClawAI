// B6b — capability routing unit tests.
//
// Proves the two things the routing decision must never get wrong:
//   - GEMINI is preferred over OPENAI regardless of snapshot order
//   - a model with no AUDIO modality is not treated as capable

import { beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { httpGet } from '@claw/shared-utilities';
import { TranscriptionCapabilityClient } from '../transcription-capability.client';
import { type TranscriptionSnapshotResponse } from '../../types/transcription.types';

vi.mock('@claw/shared-utilities', () => ({
  httpGet: vi.fn(),
  declaredHost: vi.fn(() => new Set(['connector-service:4003'])),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn(() => ({ CONNECTOR_SERVICE_URL: 'http://connector-service:4003' })),
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
});
