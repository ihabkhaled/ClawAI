import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';
import type { PaygHold } from '@claw/shared-entitlements';
import { PaygSurface, SpeechUnavailableReason } from '@claw/shared-types';

import { SpeechProvider } from '../../../common/enums';
import { BusinessException, SpeechProviderError } from '../../../common/errors';
import { MessageRole } from '../../../generated/prisma';
import { SpeechSynthesisManager } from '../managers/speech-synthesis.manager';
import { MessageSpeechService } from '../services/message-speech.service';
import type { SynthesizedAudio, TtsVoiceCandidateWire } from '../types/speech.types';
import { prepareSpeakableText } from '../utilities/speakable-text.utility';

// Multimodal batch 9 — "Read aloud" end to end at the service boundary, with
// a ledger double that records what the meter saw: RESERVATION, CONSUMPTION,
// RESERVATION_RELEASE — the rows auth-service would write.

const USER = 'user-1';
const MESSAGE_ID = 'msg-1';
const REPLY = 'The **answer** is forty-two. See [the guide](https://docs.example.com/x).';
const GEMINI_ROW: TtsVoiceCandidateWire = {
  provider: 'GEMINI',
  modelAlias: 'gemini-2.5-flash-preview-tts',
  timeoutMs: 60_000,
  maxTokens: 16_384,
};
const OPENAI_ROW: TtsVoiceCandidateWire = {
  provider: 'OPENAI',
  modelAlias: 'tts-1',
  timeoutMs: 60_000,
  maxTokens: 16_384,
};
const WAV: SynthesizedAudio = {
  bytes: Buffer.from('RIFF....WAVE'),
  mimeType: 'audio/wav',
  usage: { promptTokens: 21, completionTokens: 740 },
};
const MP3: SynthesizedAudio = { bytes: Buffer.from('ID3...'), mimeType: 'audio/mpeg', usage: null };

type LedgerRow = { kind: string; requestId?: string; surface?: PaygSurface; units?: unknown };

type Harness = {
  service: MessageSpeechService;
  ledger: LedgerRow[];
  reserveCredit: Mock;
  finalizeCredit: Mock;
  releaseCredit: Mock;
  providerSynthesize: Mock;
  resolveApiKey: Mock;
  store: Mock;
  exists: Mock;
  updateMetadata: Mock;
  assertTextToSpeechAccess: Mock;
};

type HarnessOptions = {
  candidates?: TtsVoiceCandidateWire[];
  metadata?: unknown;
  content?: string;
  role?: MessageRole;
  threadOwner?: string;
  planAllows?: boolean;
  entitlementsDown?: boolean;
  refuseWith?: unknown;
  clamped?: boolean;
  keys?: Partial<Record<SpeechProvider, string | null>>;
  configured?: boolean;
};

function hold(requestId: string, clamped: boolean): PaygHold {
  return {
    metered: true,
    maxOutputTokens: 16_000,
    clamped,
    reservationId: `res-${requestId}`,
    heldMicroUsd: 1_000,
    availableAfterMicroUsd: 0,
    reason: null,
  };
}

function build(options: HarnessOptions = {}): Harness {
  const ledger: LedgerRow[] = [];
  const reserveCredit = vi.fn(async (input: { requestId: string; surface: PaygSurface }) => {
    if (options.refuseWith !== undefined) {
      throw options.refuseWith;
    }
    ledger.push({ kind: 'RESERVATION', requestId: input.requestId, surface: input.surface });
    return hold(input.requestId, options.clamped ?? false);
  });
  const finalizeCredit = vi.fn(async (held: PaygHold, _usage: unknown, units: unknown) => {
    ledger.push({ kind: 'CONSUMPTION', requestId: held.reservationId ?? '', units });
  });
  const releaseCredit = vi.fn(async (held: PaygHold, reason: string) => {
    ledger.push({
      kind: 'RESERVATION_RELEASE',
      requestId: held.reservationId ?? '',
      units: reason,
    });
  });
  const assertTextToSpeechAccess = vi.fn(async () => {
    if (options.planAllows === false) {
      throw new BusinessException('locked', 'PLAN_FEATURE_DISABLED', HttpStatus.FORBIDDEN);
    }
  });
  const accessControl = {
    reserveCredit,
    finalizeCredit,
    releaseCredit,
    assertTextToSpeechAccess,
    hasPlanFeatureFor: vi.fn(async () => {
      if (options.entitlementsDown === true) {
        throw new BusinessException('down', 'ENTITLEMENTS_UNAVAILABLE', 503);
      }
      return options.planAllows !== false;
    }),
  };
  const keys = options.keys ?? {};
  const resolveApiKey = vi.fn(async (provider: SpeechProvider) =>
    provider in keys ? (keys[provider] ?? null) : `key-${provider}`,
  );
  const providerSynthesize = vi.fn(async () => WAV);
  const manager = new SpeechSynthesisManager(
    { resolve: vi.fn(async () => options.candidates ?? [GEMINI_ROW, OPENAI_ROW]) } as never,
    {
      resolveApiKey,
      isConfigured: vi.fn(async () => options.configured ?? true),
    } as never,
    { synthesize: providerSynthesize } as never,
    accessControl as never,
  );
  const store = vi.fn(async () => 'file-new');
  const exists = vi.fn(async (): Promise<boolean | null> => true);
  const updateMetadata = vi.fn(async () => {});
  const messages = {
    findById: vi.fn(async (id: string) =>
      id === MESSAGE_ID
        ? {
            id: MESSAGE_ID,
            threadId: 'thread-1',
            role: options.role ?? MessageRole.ASSISTANT,
            content: options.content ?? REPLY,
            metadata: options.metadata ?? { fileIds: [] },
          }
        : null,
    ),
    updateMetadata,
  };
  const threads = {
    findById: vi.fn(async () => ({ id: 'thread-1', userId: options.threadOwner ?? USER })),
  };
  const service = new MessageSpeechService(
    messages as never,
    threads as never,
    accessControl as never,
    manager,
    { store, exists } as never,
  );
  return {
    service,
    ledger,
    reserveCredit,
    finalizeCredit,
    releaseCredit,
    providerSynthesize,
    resolveApiKey,
    store,
    exists,
    updateMetadata,
    assertTextToSpeechAccess,
  };
}

async function expectCode(promise: Promise<unknown>, code: string, status: number): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  const exception = error as BusinessException;
  expect(exception.getStatus()).toBe(status);
  expect(JSON.stringify(exception.getResponse())).toContain(code);
}

describe('MessageSpeechService.synthesize', () => {
  it('answers a stranger with the same 404 as a missing message, before any gate', async () => {
    const harness = build({ threadOwner: 'someone-else' });
    await expectCode(harness.service.synthesize(USER, MESSAGE_ID), 'ENTITY_NOT_FOUND', 404);
    await expectCode(harness.service.synthesize(USER, 'missing'), 'ENTITY_NOT_FOUND', 404);
    expect(harness.assertTextToSpeechAccess).not.toHaveBeenCalled();
    expect(harness.reserveCredit).not.toHaveBeenCalled();
  });

  it('refuses a free plan with 403 PLAN_FEATURE_DISABLED and never reserves', async () => {
    const harness = build({ planAllows: false });
    await expectCode(harness.service.synthesize(USER, MESSAGE_ID), 'PLAN_FEATURE_DISABLED', 403);
    expect(harness.reserveCredit).not.toHaveBeenCalled();
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
    expect(harness.ledger).toEqual([]);
  });

  it('refuses a user message and a reply with nothing speakable (422)', async () => {
    await expectCode(
      build({ role: MessageRole.USER }).service.synthesize(USER, MESSAGE_ID),
      'TTS_NOTHING_TO_READ',
      422,
    );
    const codeOnly = build({ content: '```\nconst x = 1;\n```' });
    await expectCode(codeOnly.service.synthesize(USER, MESSAGE_ID), 'TTS_NOTHING_TO_READ', 422);
    expect(codeOnly.reserveCredit).not.toHaveBeenCalled();
  });

  it('replays a stored synthesis of the same text: no reserve, no provider call', async () => {
    const { contentHash } = prepareSpeakableText(REPLY, 4_000);
    const harness = build({
      metadata: {
        speech: {
          fileId: 'file-old',
          filename: 'reply-msg-1.wav',
          mimeType: 'audio/wav',
          provider: 'GEMINI',
          model: 'gemini-2.5-flash-preview-tts',
          characters: 50,
          truncated: false,
          contentHash,
          generation: 1,
        },
      },
    });
    await expect(harness.service.synthesize(USER, MESSAGE_ID)).resolves.toEqual({
      fileId: 'file-old',
      mimeType: 'audio/wav',
      filename: 'reply-msg-1.wav',
      truncated: false,
      characters: 50,
      cached: true,
    });
    expect(harness.exists).toHaveBeenCalledWith('file-old', USER);
    expect(harness.reserveCredit).not.toHaveBeenCalled();
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
  });

  it('re-synthesises under a NEW generation when the stored file is gone', async () => {
    const { contentHash } = prepareSpeakableText(REPLY, 4_000);
    const harness = build({
      metadata: { speech: { fileId: 'file-old', contentHash, generation: 3 } },
    });
    harness.exists.mockResolvedValue(false);
    await harness.service.synthesize(USER, MESSAGE_ID);
    expect(harness.reserveCredit).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: `tts:${MESSAGE_ID}:${contentHash}:g4:1` }),
    );
  });

  it('Gemini path: reserves tokens, finalizes on usageMetadata, stores the WAV, records metadata', async () => {
    const harness = build({ candidates: [GEMINI_ROW] });
    const result = await harness.service.synthesize(USER, MESSAGE_ID);

    expect(result).toMatchObject({ fileId: 'file-new', mimeType: 'audio/wav', cached: false });
    expect(harness.ledger.map((row) => row.kind)).toEqual(['RESERVATION', 'CONSUMPTION']);
    const reserve = harness.reserveCredit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(reserve).toMatchObject({
      userId: USER,
      provider: 'GEMINI',
      model: 'gemini-2.5-flash-preview-tts',
      surface: PaygSurface.TTS,
    });
    expect(reserve['ttsCharacters']).toBeUndefined();
    expect(Number(reserve['requestedMaxOutputTokens'])).toBeGreaterThan(0);
    expect(harness.finalizeCredit).toHaveBeenCalledWith(
      expect.anything(),
      { promptTokens: 21, completionTokens: 740, cachedPromptTokens: 0, reasoningTokens: 0 },
      { toolCalls: 0 },
    );
    // The granted ceiling reaches the provider, never the one asked for.
    expect(harness.providerSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 16_000, apiKey: 'key-GEMINI' }),
    );
    expect(harness.store).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER,
        filename: 'reply-msg-1.wav',
        mimeType: 'audio/wav',
        transcript: 'The answer is forty-two. See the guide.',
      }),
    );
    const metadata = harness.updateMetadata.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata['fileIds']).toEqual([]);
    expect(metadata['speech']).toMatchObject({
      fileId: 'file-new',
      provider: 'GEMINI',
      model: 'gemini-2.5-flash-preview-tts',
      truncated: false,
      generation: 1,
    });
    expect(JSON.stringify(metadata)).not.toContain('RIFF');
  });

  it('OpenAI path: RESERVATION then CONSUMPTION on ttsCharacters, zero tokens', async () => {
    const harness = build({ candidates: [OPENAI_ROW] });
    harness.providerSynthesize.mockResolvedValue(MP3);
    const { characters } = prepareSpeakableText(REPLY, 4_000);

    const result = await harness.service.synthesize(USER, MESSAGE_ID);

    expect(result).toMatchObject({ mimeType: 'audio/mpeg', filename: 'reply-msg-1.mp3' });
    expect(harness.ledger.map((row) => row.kind)).toEqual(['RESERVATION', 'CONSUMPTION']);
    expect(harness.reserveCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'OPENAI',
        model: 'tts-1',
        surface: PaygSurface.TTS,
        promptTokens: 0,
        ttsCharacters: characters,
      }),
    );
    expect(harness.finalizeCredit).toHaveBeenCalledWith(
      expect.anything(),
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { toolCalls: 0, ttsCharacters: characters },
    );
  });

  it('a provider throw releases exactly once; a rejection moves on under a distinct requestId', async () => {
    const harness = build();
    harness.providerSynthesize
      .mockRejectedValueOnce(new SpeechProviderError('rejected', 400, false))
      .mockResolvedValueOnce(MP3);

    await harness.service.synthesize(USER, MESSAGE_ID);

    expect(harness.ledger.map((row) => row.kind)).toEqual([
      'RESERVATION',
      'RESERVATION_RELEASE',
      'RESERVATION',
      'CONSUMPTION',
    ]);
    expect(harness.releaseCredit).toHaveBeenCalledTimes(1);
    expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'PROVIDER_ERROR');
    const ids = harness.reserveCredit.mock.calls.map(
      (call) => (call[0] as { requestId: string }).requestId,
    );
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toMatch(/^tts:msg-1:[0-9a-f]{16}:g1:1$/);
    expect(ids[1]).toMatch(/^tts:msg-1:[0-9a-f]{16}:g1:2$/);
  });

  it('every candidate failing is a 502 TTS_FAILED with every hold released', async () => {
    const harness = build();
    harness.providerSynthesize.mockRejectedValue(new SpeechProviderError('down', 503, false));
    await expectCode(harness.service.synthesize(USER, MESSAGE_ID), 'TTS_FAILED', 502);
    expect(harness.releaseCredit).toHaveBeenCalledTimes(2);
    expect(harness.finalizeCredit).not.toHaveBeenCalled();
    expect(harness.store).not.toHaveBeenCalled();
  });

  it('a deadline releases with TIMEOUT and ends the walk', async () => {
    const harness = build();
    harness.providerSynthesize.mockRejectedValue(new SpeechProviderError('slow', null, true));
    await expectCode(harness.service.synthesize(USER, MESSAGE_ID), 'TTS_FAILED', 504);
    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
    expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'TIMEOUT');
  });

  it('a 402 from the meter ends the walk: no fall-through, no provider call', async () => {
    const refusal = new BusinessException('no credit', 'PAYG_CREDIT_EXHAUSTED', 402);
    const harness = build({ refuseWith: refusal });
    await expectCode(harness.service.synthesize(USER, MESSAGE_ID), 'PAYG_CREDIT_EXHAUSTED', 402);
    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
  });

  it('an unreachable meter fails closed with 503 and no fall-through', async () => {
    const harness = build({ refuseWith: new Error('ECONNREFUSED') });
    await expectCode(harness.service.synthesize(USER, MESSAGE_ID), 'PAYG_PRICING_UNAVAILABLE', 503);
    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
  });

  it('a clamped hold goes back and is a 402, never a cut-off recording', async () => {
    const harness = build({ clamped: true });
    await expectCode(harness.service.synthesize(USER, MESSAGE_ID), 'PAYG_CREDIT_EXHAUSTED', 402);
    expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'CANCELLED');
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
  });

  it('skips a provider with no connector key before any hold', async () => {
    const harness = build({ keys: { [SpeechProvider.GEMINI]: null } });
    harness.providerSynthesize.mockResolvedValue(MP3);
    await harness.service.synthesize(USER, MESSAGE_ID);
    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
    expect(harness.reserveCredit).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'OPENAI' }),
    );
  });

  it('no configured voice at all is 503 TTS_UNAVAILABLE with no hold', async () => {
    const none = build({ candidates: [] });
    await expectCode(none.service.synthesize(USER, MESSAGE_ID), 'TTS_UNAVAILABLE', 503);
    const noKeys = build({
      keys: { [SpeechProvider.GEMINI]: null, [SpeechProvider.OPENAI]: null },
    });
    await expectCode(noKeys.service.synthesize(USER, MESSAGE_ID), 'TTS_UNAVAILABLE', 503);
    expect(noKeys.reserveCredit).not.toHaveBeenCalled();
  });

  it('caps a long reply and says so: truncated reaches the response and metadata', async () => {
    const long = `${'This is a sentence that goes on. '.repeat(200)}`;
    const harness = build({ content: long, candidates: [OPENAI_ROW] });
    harness.providerSynthesize.mockResolvedValue(MP3);

    const result = await harness.service.synthesize(USER, MESSAGE_ID);

    expect(result.truncated).toBe(true);
    expect(result.characters).toBeLessThanOrEqual(4_000);
    const reserve = harness.reserveCredit.mock.calls[0]?.[0] as { ttsCharacters: number };
    expect(reserve.ttsCharacters).toBe(result.characters);
    const metadata = harness.updateMetadata.mock.calls[0]?.[1] as {
      speech: { truncated: boolean };
    };
    expect(metadata.speech.truncated).toBe(true);
  });

  it('two concurrent requests for one reply share one synthesis', async () => {
    const harness = build({ candidates: [OPENAI_ROW] });
    harness.providerSynthesize.mockResolvedValue(MP3);
    const [first, second] = await Promise.all([
      harness.service.synthesize(USER, MESSAGE_ID),
      harness.service.synthesize(USER, MESSAGE_ID),
    ]);
    expect(first).toEqual(second);
    expect(harness.providerSynthesize).toHaveBeenCalledTimes(1);
    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
  });
});

describe('MessageSpeechService.getAvailability', () => {
  it('is available when the plan allows it and a voice is configured', async () => {
    await expect(build().service.getAvailability(USER)).resolves.toEqual({
      available: true,
      reason: null,
    });
  });

  it('names the plan when the plan has no text-to-speech', async () => {
    await expect(build({ planAllows: false }).service.getAvailability(USER)).resolves.toEqual({
      available: false,
      reason: SpeechUnavailableReason.PLAN_DISABLED,
    });
  });

  it('names the missing voice when no candidate provider is configured', async () => {
    await expect(build({ configured: false }).service.getAvailability(USER)).resolves.toEqual({
      available: false,
      reason: SpeechUnavailableReason.NO_VOICE_CONFIGURED,
    });
    await expect(build({ candidates: [] }).service.getAvailability(USER)).resolves.toEqual({
      available: false,
      reason: SpeechUnavailableReason.NO_VOICE_CONFIGURED,
    });
  });

  it('fails closed when entitlements cannot be read', async () => {
    await expect(build({ entitlementsDown: true }).service.getAvailability(USER)).resolves.toEqual({
      available: false,
      reason: SpeechUnavailableReason.TEMPORARILY_UNAVAILABLE,
    });
  });
});
