import { HttpStatus, Logger } from '@nestjs/common';
import { type Mock, type MockInstance, vi } from 'vitest';
import type { PaygHold } from '@claw/shared-entitlements';
import { PaygSurface, SpeechUnavailableReason } from '@claw/shared-types';

import { SpeechJobStatus, SpeechProvider } from '../../../common/enums';
import { BusinessException, SpeechProviderError } from '../../../common/errors';
import { MessageRole } from '../../../generated/prisma';
import { SPEECH_JOB_LOCK_TTL_MS, SPEECH_MAX_CHARACTERS } from '../constants/speech.constants';
import { SpeechJobManager } from '../managers/speech-job.manager';
import { SpeechSynthesisManager } from '../managers/speech-synthesis.manager';
import { MessageSpeechService } from '../services/message-speech.service';
import type {
  MessageSpeechStartResult,
  SpeechJobState,
  SpeechProviderRequest,
  SynthesizedAudio,
  TtsVoiceCandidateWire,
} from '../types/speech.types';
import { prepareSpeakableText } from '../utilities/speakable-text.utility';
import { segmentSpeakableText } from '../utilities/speech-segments.utility';

// Progressive "Read aloud" (2026-09-25) end to end at the service boundary,
// with a ledger double that records what the meter saw — RESERVATION,
// CONSUMPTION, RESERVATION_RELEASE — and an in-memory Redis job lock.

const USER = 'user-1';
const MESSAGE_ID = 'msg-1';
const REPLY = 'The **answer** is forty-two. See [the guide](https://docs.example.com/x).';
/** ~1,700 characters: one short first segment and three more. */
const LONG_REPLY = Array.from(
  { length: 40 },
  (_, n) => `Sentence number ${String(n + 1)} is here and it reads fine.`,
).join(' ');
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

type LedgerRow = { kind: string; requestId: string; units?: unknown };

type Harness = {
  service: MessageSpeechService;
  ledger: LedgerRow[];
  reserveCredit: Mock;
  finalizeCredit: Mock;
  releaseCredit: Mock;
  providerSynthesize: Mock;
  store: Mock;
  exists: Mock;
  updateMetadata: Mock;
  assertTextToSpeechAccess: Mock;
  acquire: Mock;
  release: Mock;
  jobRuns: MockInstance<SpeechJobManager['run']>;
  metadata: () => Record<string, unknown>;
  speech: () => SpeechJobState;
};

type HarnessOptions = {
  candidates?: TtsVoiceCandidateWire[];
  metadata?: Record<string, unknown>;
  content?: string;
  role?: MessageRole;
  threadOwner?: string;
  planAllows?: boolean;
  entitlementsDown?: boolean;
  refuseWith?: (requestId: string) => unknown;
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
    const refusal = options.refuseWith?.(input.requestId);
    if (refusal !== undefined) {
      throw refusal;
    }
    expect(input.surface).toBe(PaygSurface.TTS);
    ledger.push({ kind: 'RESERVATION', requestId: input.requestId });
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
  const providerSynthesize = vi.fn(async (_request: SpeechProviderRequest) => WAV);
  const synthesis = new SpeechSynthesisManager(
    { resolve: vi.fn(async () => options.candidates ?? [GEMINI_ROW, OPENAI_ROW]) } as never,
    { resolveApiKey, isConfigured: vi.fn(async () => options.configured ?? true) } as never,
    { synthesize: providerSynthesize } as never,
    accessControl as never,
  );
  let fileCounter = 0;
  const store = vi.fn(async () => {
    fileCounter += 1;
    return `file-${String(fileCounter)}`;
  });
  const exists = vi.fn(async (): Promise<boolean | null> => true);
  let metadata: Record<string, unknown> = options.metadata ?? { fileIds: [] };
  const updateMetadata = vi.fn(async (_id: string, next: Record<string, unknown>) => {
    metadata = JSON.parse(JSON.stringify(next)) as Record<string, unknown>;
  });
  const messages = {
    findById: vi.fn(async (id: string) =>
      id === MESSAGE_ID
        ? {
            id: MESSAGE_ID,
            threadId: 'thread-1',
            role: options.role ?? MessageRole.ASSISTANT,
            content: options.content ?? REPLY,
            metadata,
          }
        : null,
    ),
    updateMetadata,
  };
  const threads = {
    findById: vi.fn(async () => ({ id: 'thread-1', userId: options.threadOwner ?? USER })),
  };
  const locks = new Map<string, string>();
  let lockCounter = 0;
  const acquire = vi.fn(async (messageId: string): Promise<string | null> => {
    if (locks.has(messageId)) {
      return null;
    }
    lockCounter += 1;
    const token = `token-${String(lockCounter)}`;
    locks.set(messageId, token);
    return token;
  });
  const release = vi.fn(async (messageId: string, token: string) => {
    if (locks.get(messageId) === token) {
      locks.delete(messageId);
    }
  });
  const lock = { acquire, release };
  const fileStore = { store, exists };
  const jobs = new SpeechJobManager(
    messages as never,
    synthesis,
    fileStore as never,
    lock as never,
  );
  const jobRuns = vi.spyOn(jobs, 'run');
  const service = new MessageSpeechService(
    messages as never,
    threads as never,
    accessControl as never,
    synthesis,
    fileStore as never,
    jobs,
    lock as never,
  );
  return {
    service,
    ledger,
    reserveCredit,
    finalizeCredit,
    releaseCredit,
    providerSynthesize,
    store,
    exists,
    updateMetadata,
    assertTextToSpeechAccess,
    acquire,
    release,
    jobRuns,
    metadata: () => metadata,
    speech: () => metadata['speech'] as SpeechJobState,
  };
}

/** POST, then wait for the background job it started (if any) to finish. */
async function startAndFinish(harness: Harness): Promise<MessageSpeechStartResult> {
  const result = await harness.service.start(USER, MESSAGE_ID);
  await Promise.all(harness.jobRuns.mock.results.map((entry) => entry.value));
  return result;
}

async function expectCode(promise: Promise<unknown>, code: string, status: number): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  const exception = error as BusinessException;
  expect(exception.getStatus()).toBe(status);
  expect(exception.code).toBe(code);
}

function readyState(content: string, fileId: string, generation = 1): SpeechJobState {
  const speakable = prepareSpeakableText(content, SPEECH_MAX_CHARACTERS);
  return {
    version: 2,
    status: SpeechJobStatus.READY,
    contentHash: speakable.contentHash,
    generation,
    startedAt: new Date().toISOString(),
    totalSegments: 1,
    characters: speakable.characters,
    truncated: false,
    segments: [
      {
        index: 0,
        fileId,
        mimeType: 'audio/wav',
        characters: speakable.characters,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash-preview-tts',
      },
    ],
    errorCode: null,
  };
}

describe('MessageSpeechService.start — gates before anything paid', () => {
  it('answers a stranger with the same 404 as a missing message, before any gate', async () => {
    const harness = build({ threadOwner: 'someone-else' });
    await expectCode(harness.service.start(USER, MESSAGE_ID), 'ENTITY_NOT_FOUND', 404);
    await expectCode(harness.service.start(USER, 'missing'), 'ENTITY_NOT_FOUND', 404);
    expect(harness.assertTextToSpeechAccess).not.toHaveBeenCalled();
    expect(harness.acquire).not.toHaveBeenCalled();
    expect(harness.reserveCredit).not.toHaveBeenCalled();
  });

  it('refuses a free plan with 403 PLAN_FEATURE_DISABLED: no lock, no job, no hold', async () => {
    const harness = build({ planAllows: false });
    await expectCode(harness.service.start(USER, MESSAGE_ID), 'PLAN_FEATURE_DISABLED', 403);
    expect(harness.acquire).not.toHaveBeenCalled();
    expect(harness.jobRuns).not.toHaveBeenCalled();
    expect(harness.ledger).toEqual([]);
  });

  it('refuses a user message and a reply with nothing speakable (422)', async () => {
    await expectCode(
      build({ role: MessageRole.USER }).service.start(USER, MESSAGE_ID),
      'TTS_NOTHING_TO_READ',
      422,
    );
    const codeOnly = build({ content: '```\nconst x = 1;\n```' });
    await expectCode(codeOnly.service.start(USER, MESSAGE_ID), 'TTS_NOTHING_TO_READ', 422);
    expect(codeOnly.reserveCredit).not.toHaveBeenCalled();
  });

  it('Redis down: 503, fail closed — no job starts that cannot prove it is the only one', async () => {
    const harness = build();
    harness.acquire.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expectCode(harness.service.start(USER, MESSAGE_ID), 'TTS_FAILED', 503);
    expect(harness.jobRuns).not.toHaveBeenCalled();
    expect(harness.reserveCredit).not.toHaveBeenCalled();
  });
});

describe('MessageSpeechService.start — async, idempotent', () => {
  it('answers 202 GENERATING at once, without waiting on the provider', async () => {
    const harness = build({ candidates: [GEMINI_ROW] });
    let finishProvider: (audio: SynthesizedAudio) => void = () => {};
    harness.providerSynthesize.mockImplementationOnce(
      async () =>
        new Promise<SynthesizedAudio>((resolve) => {
          finishProvider = resolve;
        }),
    );

    const result = await harness.service.start(USER, MESSAGE_ID);

    expect(result.httpStatus).toBe(202);
    expect(result.body).toEqual({
      status: SpeechJobStatus.GENERATING,
      segments: [],
      totalSegments: 1,
      truncated: false,
      errorCode: null,
    });
    expect(harness.speech().status).toBe(SpeechJobStatus.GENERATING);
    await vi.waitFor(() => {
      expect(harness.providerSynthesize).toHaveBeenCalledTimes(1);
    });
    expect(harness.store).not.toHaveBeenCalled();
    finishProvider(WAV);
    await Promise.all(harness.jobRuns.mock.results.map((entry) => entry.value));
    expect(harness.speech().status).toBe(SpeechJobStatus.READY);
  });

  it('two POSTs at once start ONE job and ONE set of holds', async () => {
    const harness = build({ candidates: [GEMINI_ROW] });
    const [first, second] = await Promise.all([
      harness.service.start(USER, MESSAGE_ID),
      harness.service.start(USER, MESSAGE_ID),
    ]);
    await Promise.all(harness.jobRuns.mock.results.map((entry) => entry.value));

    expect(first.httpStatus).toBe(202);
    expect(second.httpStatus).toBe(202);
    expect(second.body.status).toBe(SpeechJobStatus.GENERATING);
    expect(harness.jobRuns).toHaveBeenCalledTimes(1);
    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
    expect(harness.ledger.map((row) => row.kind)).toEqual(['RESERVATION', 'CONSUMPTION']);
  });

  it('a POST while a job runs (another replica) reports it and starts nothing', async () => {
    const running: SpeechJobState = {
      ...readyState(REPLY, 'file-a'),
      status: SpeechJobStatus.GENERATING,
      segments: [],
    };
    const harness = build({ metadata: { speech: running } });
    const result = await harness.service.start(USER, MESSAGE_ID);
    expect(result.httpStatus).toBe(202);
    expect(result.body.status).toBe(SpeechJobStatus.GENERATING);
    expect(harness.acquire).not.toHaveBeenCalled();
    expect(harness.jobRuns).not.toHaveBeenCalled();
  });

  it('replays a READY reading of the same text: 200, no lock, no hold, no provider call', async () => {
    const harness = build({ metadata: { speech: readyState(REPLY, 'file-old') } });
    const result = await harness.service.start(USER, MESSAGE_ID);
    expect(result.httpStatus).toBe(200);
    expect(result.body).toMatchObject({
      status: SpeechJobStatus.READY,
      segments: [{ index: 0, fileId: 'file-old', mimeType: 'audio/wav' }],
      totalSegments: 1,
    });
    expect(harness.exists).toHaveBeenCalledWith('file-old', USER);
    expect(harness.acquire).not.toHaveBeenCalled();
    expect(harness.ledger).toEqual([]);
  });

  it('replays a version-1 reading (one fileId, before segmenting) for free', async () => {
    const { contentHash } = prepareSpeakableText(REPLY, SPEECH_MAX_CHARACTERS);
    const harness = build({
      metadata: {
        speech: { fileId: 'file-v1', mimeType: 'audio/wav', contentHash, generation: 1 },
      },
    });
    const result = await harness.service.start(USER, MESSAGE_ID);
    expect(result.httpStatus).toBe(200);
    expect(result.body.segments).toEqual([
      { index: 0, fileId: 'file-v1', mimeType: 'audio/wav', characters: 0 },
    ]);
    expect(harness.reserveCredit).not.toHaveBeenCalled();
  });

  it('re-synthesises under a NEW generation when the stored file is gone', async () => {
    const harness = build({
      candidates: [GEMINI_ROW],
      metadata: { speech: readyState(REPLY, 'file-old', 3) },
    });
    harness.exists.mockResolvedValue(false);
    await startAndFinish(harness);
    const { contentHash } = prepareSpeakableText(REPLY, SPEECH_MAX_CHARACTERS);
    expect(harness.reserveCredit).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: `tts:${MESSAGE_ID}:${contentHash}:g4:seg1:1` }),
    );
    expect(harness.speech().segments.map((segment) => segment.fileId)).toEqual(['file-1']);
  });
});

describe('SpeechJobManager — per segment: reserve → store → record → finalize', () => {
  it('Gemini: reserves tokens, stores a WAV per segment, records metadata, then finalizes', async () => {
    const harness = build({ candidates: [GEMINI_ROW] });
    await startAndFinish(harness);

    expect(harness.ledger.map((row) => row.kind)).toEqual(['RESERVATION', 'CONSUMPTION']);
    const reserve = harness.reserveCredit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(reserve).toMatchObject({ userId: USER, provider: 'GEMINI', surface: PaygSurface.TTS });
    expect(reserve['ttsCharacters']).toBeUndefined();
    expect(harness.finalizeCredit).toHaveBeenCalledWith(
      expect.anything(),
      { promptTokens: 21, completionTokens: 740, cachedPromptTokens: 0, reasoningTokens: 0 },
      { toolCalls: 0 },
    );
    expect(harness.providerSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 16_000, apiKey: 'key-GEMINI' }),
    );
    expect(harness.store).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER,
        filename: 'reply-msg-1-1.wav',
        mimeType: 'audio/wav',
        transcript: 'The answer is forty-two. See the guide.',
      }),
    );
    const metadata = harness.metadata();
    expect(metadata['fileIds']).toEqual([]);
    expect(harness.speech()).toMatchObject({
      version: 2,
      status: SpeechJobStatus.READY,
      generation: 1,
      totalSegments: 1,
      errorCode: null,
      segments: [{ index: 0, fileId: 'file-1', provider: 'GEMINI' }],
    });
    expect(JSON.stringify(metadata)).not.toContain('RIFF');
    // CONSUMPTION only once the audio is stored AND recorded.
    const finalizedAt = harness.finalizeCredit.mock.invocationCallOrder[0] ?? 0;
    expect(harness.store.mock.invocationCallOrder[0]).toBeLessThan(finalizedAt);
    const recordedAt = harness.updateMetadata.mock.invocationCallOrder[1] ?? Infinity;
    expect(recordedAt).toBeLessThan(finalizedAt);
    expect(harness.releaseCredit).not.toHaveBeenCalled();
  });

  it('OpenAI: each segment reserves and finalizes on ITS characters, zero tokens', async () => {
    const harness = build({ candidates: [OPENAI_ROW], content: LONG_REPLY });
    harness.providerSynthesize.mockResolvedValue(MP3);
    await startAndFinish(harness);

    const segments = segmentSpeakableText(
      prepareSpeakableText(LONG_REPLY, SPEECH_MAX_CHARACTERS).text,
    );
    expect(segments.length).toBeGreaterThan(2);
    const reserved = harness.reserveCredit.mock.calls
      .map((call) => (call[0] as { ttsCharacters: number }).ttsCharacters)
      .sort((left, right) => left - right);
    expect(reserved).toEqual(
      segments.map((segment) => segment.characters).sort((left, right) => left - right),
    );
    expect(harness.finalizeCredit).toHaveBeenCalledTimes(segments.length);
    expect(harness.speech().status).toBe(SpeechJobStatus.READY);
    expect(harness.speech().segments.map((segment) => segment.index)).toEqual(
      segments.map((segment) => segment.index),
    );
    expect(harness.store).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'reply-msg-1-2.mp3' }),
    );
  });

  it('asks for segment 1 first and never has more than 3 provider calls in flight', async () => {
    const harness = build({ candidates: [GEMINI_ROW], content: LONG_REPLY });
    let inFlight = 0;
    let peak = 0;
    harness.providerSynthesize.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return WAV;
    });
    await startAndFinish(harness);

    const texts = harness.providerSynthesize.mock.calls.map((call) => call[0].text);
    const segments = segmentSpeakableText(
      prepareSpeakableText(LONG_REPLY, SPEECH_MAX_CHARACTERS).text,
    );
    expect(texts[0]).toBe(segments[0]?.text);
    expect(segments[0]?.characters).toBeLessThanOrEqual(160);
    expect(peak).toBe(3);
    expect(texts).toHaveLength(segments.length);
  });

  it('a timed-out segment is retried ONCE on the same candidate under a new requestId', async () => {
    const harness = build({ candidates: [GEMINI_ROW, OPENAI_ROW] });
    harness.providerSynthesize
      .mockRejectedValueOnce(new SpeechProviderError('slow', null, true))
      .mockResolvedValueOnce(WAV);
    await startAndFinish(harness);

    const calls = harness.reserveCredit.mock.calls.map(
      (call) => call[0] as { requestId: string; provider: string },
    );
    expect(calls.map((call) => call.provider)).toEqual(['GEMINI', 'GEMINI']);
    expect(calls[0]?.requestId).toMatch(/:g1:seg1:1$/);
    expect(calls[1]?.requestId).toMatch(/:g1:seg1:2$/);
    expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'TIMEOUT');
    expect(harness.speech().status).toBe(SpeechJobStatus.READY);
  });

  it('two timeouts on one candidate move on to the next candidate', async () => {
    const harness = build({ candidates: [GEMINI_ROW, OPENAI_ROW] });
    harness.providerSynthesize
      .mockRejectedValueOnce(new SpeechProviderError('slow', null, true))
      .mockRejectedValueOnce(new SpeechProviderError('slow', null, true))
      .mockResolvedValueOnce(MP3);
    await startAndFinish(harness);
    const providers = harness.reserveCredit.mock.calls.map(
      (call) => (call[0] as { provider: string }).provider,
    );
    expect(providers).toEqual(['GEMINI', 'GEMINI', 'OPENAI']);
    expect(harness.speech().segments[0]?.provider).toBe('OPENAI');
  });

  it('a provider rejection moves on at once under a distinct requestId', async () => {
    const harness = build();
    harness.providerSynthesize
      .mockRejectedValueOnce(new SpeechProviderError('rejected', 400, false))
      .mockResolvedValueOnce(MP3);
    await startAndFinish(harness);
    expect(harness.ledger.map((row) => row.kind)).toEqual([
      'RESERVATION',
      'RESERVATION_RELEASE',
      'RESERVATION',
      'CONSUMPTION',
    ]);
    expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'PROVIDER_ERROR');
  });

  it('a failed segment is released and not charged; the others play: PARTIAL', async () => {
    const harness = build({ candidates: [GEMINI_ROW], content: LONG_REPLY });
    const segments = segmentSpeakableText(
      prepareSpeakableText(LONG_REPLY, SPEECH_MAX_CHARACTERS).text,
    );
    const failing = segments[1]?.text;
    harness.providerSynthesize.mockImplementation(async (request: SpeechProviderRequest) => {
      if (request.text === failing) {
        throw new SpeechProviderError('down', 503, false);
      }
      return WAV;
    });
    await startAndFinish(harness);

    const state = harness.speech();
    expect(state.status).toBe(SpeechJobStatus.PARTIAL);
    expect(state.errorCode).toBe('TTS_FAILED');
    expect(state.segments.map((segment) => segment.index)).not.toContain(1);
    expect(state.segments).toHaveLength(segments.length - 1);
    expect(harness.finalizeCredit).toHaveBeenCalledTimes(segments.length - 1);
    const released = harness.ledger.filter((row) => row.kind === 'RESERVATION_RELEASE');
    expect(released).toHaveLength(1);
    expect(released[0]?.requestId).toMatch(/:seg2:1$/);
    expect(
      harness.ledger.some((row) => row.kind === 'CONSUMPTION' && row.requestId.includes(':seg2:')),
    ).toBe(false);
  });

  it('a credit refusal stops every worker: no further holds, FAILED with the PAYG code', async () => {
    const refusal = new BusinessException('no credit', 'PAYG_CREDIT_EXHAUSTED', 402);
    const harness = build({
      candidates: [GEMINI_ROW, OPENAI_ROW],
      content: LONG_REPLY,
      refuseWith: () => refusal,
    });
    await startAndFinish(harness);
    // Three workers each tried their first segment once; none moved to OPENAI or a 4th segment.
    expect(harness.reserveCredit.mock.calls.length).toBeLessThanOrEqual(3);
    const providers = harness.reserveCredit.mock.calls.map(
      (call) => (call[0] as { provider: string }).provider,
    );
    expect(providers.every((provider) => provider === 'GEMINI')).toBe(true);
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
    expect(harness.speech()).toMatchObject({
      status: SpeechJobStatus.FAILED,
      errorCode: 'PAYG_CREDIT_EXHAUSTED',
    });
    expect(harness.release).toHaveBeenCalledTimes(1);
  });

  it('a clamped hold goes back and stops the job, never a cut-off recording', async () => {
    const harness = build({ clamped: true });
    await startAndFinish(harness);
    expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'CANCELLED');
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
    expect(harness.speech().errorCode).toBe('PAYG_CREDIT_EXHAUSTED');
  });

  it('a store failure after a PAID call releases that hold: no CONSUMPTION for it', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    try {
      const harness = build({ candidates: [GEMINI_ROW] });
      harness.store.mockRejectedValueOnce(
        new BusinessException('The voice model could not read this reply.', 'TTS_FAILED', 502),
      );
      await startAndFinish(harness);

      expect(harness.ledger.map((row) => row.kind)).toEqual(['RESERVATION', 'RESERVATION_RELEASE']);
      expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'CANCELLED');
      expect(harness.speech()).toMatchObject({ status: SpeechJobStatus.FAILED, segments: [] });
      const line = warn.mock.calls
        .map((call) => String(call[0]))
        .find((text) => text.startsWith('ttsSettlement'));
      expect(line).toMatch(/outcome=RELEASED reason=STORE_FAILED/);
      expect(line).not.toContain(USER);
    } finally {
      warn.mockRestore();
    }
  });

  it('logs the settlement by reservation id, never with a user id or a balance', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    try {
      const harness = build({ candidates: [GEMINI_ROW] });
      await startAndFinish(harness);
      const line = log.mock.calls
        .map((call) => String(call[0]))
        .find((text) => text.startsWith('ttsSettlement'));
      expect(line).toMatch(/reservationId=res-tts:msg-1:[0-9a-f]{16}:g1:seg1:1 outcome=FINALIZED$/);
      expect(line).not.toContain(USER);
    } finally {
      log.mockRestore();
    }
  });

  it('starts no paid attempt past the job deadline', async () => {
    let now = 1_000_000;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const harness = build({ candidates: [GEMINI_ROW], content: LONG_REPLY });
      harness.providerSynthesize.mockImplementation(async () => {
        now += 170_000;
        return WAV;
      });
      await startAndFinish(harness);
      // The first wave (3 workers) started in time; after it the window is gone.
      expect(harness.reserveCredit.mock.calls.length).toBeLessThanOrEqual(3);
      expect(harness.speech().status).not.toBe(SpeechJobStatus.GENERATING);
      expect(harness.release).toHaveBeenCalledTimes(1);
    } finally {
      clock.mockRestore();
    }
  });

  it('no configured voice at all: FAILED TTS_UNAVAILABLE with no hold', async () => {
    const harness = build({
      keys: { [SpeechProvider.GEMINI]: null, [SpeechProvider.OPENAI]: null },
    });
    await startAndFinish(harness);
    expect(harness.reserveCredit).not.toHaveBeenCalled();
    expect(harness.speech()).toMatchObject({
      status: SpeechJobStatus.FAILED,
      errorCode: 'TTS_UNAVAILABLE',
    });
  });

  it('caps a very long reply at 12,000 characters and says so', async () => {
    const long = 'This is a sentence that goes on. '.repeat(500);
    const harness = build({ content: long, candidates: [OPENAI_ROW] });
    harness.providerSynthesize.mockResolvedValue(MP3);
    const result = await startAndFinish(harness);
    expect(result.body.truncated).toBe(true);
    expect(harness.speech().truncated).toBe(true);
    expect(harness.speech().characters).toBeLessThanOrEqual(12_000);
  });
});

// Found live 2026-09-25: Gemini answered 429 in 339 ms with 3 segments in
// flight, OpenAI's fallback was out of quota, and the segment was dropped.
describe('SpeechJobManager — rate limits: wait, retry the same provider, slow down', () => {
  const rateLimited = (hintMs: number | null = null): SpeechProviderError =>
    new SpeechProviderError('busy', 429, false, true, hintMs);

  /** POST, then run every timer (backoff waits) until the job has finished. */
  async function startAndDrain(harness: Harness): Promise<void> {
    await harness.service.start(USER, MESSAGE_ID);
    await vi.runAllTimersAsync();
    await Promise.all(harness.jobRuns.mock.results.map((entry) => entry.value));
  }

  let random: MockInstance<typeof Math.random>;
  beforeEach(() => {
    vi.useFakeTimers();
    random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    random.mockRestore();
    vi.useRealTimers();
  });

  it('429 then success on the SAME provider: READY, one CONSUMPTION, the 429 released', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    try {
      const harness = build({ candidates: [GEMINI_ROW, OPENAI_ROW] });
      harness.providerSynthesize.mockRejectedValueOnce(rateLimited()).mockResolvedValueOnce(WAV);
      await startAndDrain(harness);

      const calls = harness.reserveCredit.mock.calls.map(
        (call) => call[0] as { requestId: string; provider: string },
      );
      expect(calls.map((call) => call.provider)).toEqual(['GEMINI', 'GEMINI']);
      expect(calls[0]?.requestId).toMatch(/:g1:seg1:1$/);
      expect(calls[1]?.requestId).toMatch(/:g1:seg1:2$/);
      expect(harness.ledger.map((row) => [row.kind, row.requestId.slice(-2)])).toEqual([
        ['RESERVATION', ':1'],
        ['RESERVATION_RELEASE', ':1'],
        ['RESERVATION', ':2'],
        ['CONSUMPTION', ':2'],
      ]);
      expect(harness.releaseCredit).toHaveBeenCalledWith(expect.anything(), 'PROVIDER_ERROR');
      expect(harness.speech().status).toBe(SpeechJobStatus.READY);
      const line = warn.mock.calls
        .map((call) => String(call[0]))
        .find((text) => text.startsWith('ttsAttempt outcome=RATE_LIMITED'));
      expect(line).toMatch(/retry=1\/3 hintMs=null retryInMs=1500$/);
      expect(line).not.toContain(USER);
    } finally {
      warn.mockRestore();
    }
  });

  it("honours the provider's retry hint: no retry before it elapses", async () => {
    const harness = build({ candidates: [GEMINI_ROW] });
    harness.providerSynthesize.mockRejectedValueOnce(rateLimited(7_000)).mockResolvedValueOnce(WAV);
    await harness.service.start(USER, MESSAGE_ID);
    await vi.advanceTimersByTimeAsync(6_999);
    expect(harness.providerSynthesize).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(harness.providerSynthesize).toHaveBeenCalledTimes(2);
    await vi.runAllTimersAsync();
    await Promise.all(harness.jobRuns.mock.results.map((entry) => entry.value));
    expect(harness.speech().status).toBe(SpeechJobStatus.READY);
  });

  it('after 3 rate-limit retries the walk falls through to the next candidate', async () => {
    const harness = build({ candidates: [GEMINI_ROW, OPENAI_ROW] });
    harness.providerSynthesize
      .mockRejectedValueOnce(rateLimited())
      .mockRejectedValueOnce(rateLimited())
      .mockRejectedValueOnce(rateLimited())
      .mockRejectedValueOnce(rateLimited())
      .mockResolvedValueOnce(MP3);
    await startAndDrain(harness);

    const providers = harness.reserveCredit.mock.calls.map(
      (call) => (call[0] as { provider: string }).provider,
    );
    expect(providers).toEqual(['GEMINI', 'GEMINI', 'GEMINI', 'GEMINI', 'OPENAI']);
    const requestIds = harness.reserveCredit.mock.calls.map(
      (call) => (call[0] as { requestId: string }).requestId,
    );
    expect(new Set(requestIds).size).toBe(5);
    // Four 429s: four releases, none charged; only the OpenAI call is consumed.
    expect(harness.ledger.filter((row) => row.kind === 'RESERVATION_RELEASE')).toHaveLength(4);
    expect(harness.ledger.filter((row) => row.kind === 'CONSUMPTION')).toHaveLength(1);
    expect(harness.speech().segments[0]?.provider).toBe('OPENAI');
  });

  it('a hint longer than the 10 s cap is not waited out: straight to the next candidate', async () => {
    const harness = build({ candidates: [GEMINI_ROW, OPENAI_ROW] });
    harness.providerSynthesize
      .mockRejectedValueOnce(rateLimited(45_000))
      .mockResolvedValueOnce(MP3);
    await startAndDrain(harness);
    const providers = harness.reserveCredit.mock.calls.map(
      (call) => (call[0] as { provider: string }).provider,
    );
    expect(providers).toEqual(['GEMINI', 'OPENAI']);
    expect(harness.speech().status).toBe(SpeechJobStatus.READY);
  });

  it('after the first 429 the job runs ONE call at a time; calls in flight finish', async () => {
    const harness = build({ candidates: [GEMINI_ROW], content: LONG_REPLY });
    const segments = segmentSpeakableText(
      prepareSpeakableText(LONG_REPLY, SPEECH_MAX_CHARACTERS).text,
    );
    const limitedText = segments[1]?.text;
    let limited = false;
    let inFlight = 0;
    let peakBefore = 0;
    const startedBefore = new Set<string>();
    let newSegmentsBesideOthers = 0;
    harness.providerSynthesize.mockImplementation(async (request: SpeechProviderRequest) => {
      if (limited && !startedBefore.has(request.text) && inFlight > 0) {
        newSegmentsBesideOthers += 1;
      }
      if (!limited) {
        startedBefore.add(request.text);
      }
      inFlight += 1;
      peakBefore = limited ? peakBefore : Math.max(peakBefore, inFlight);
      try {
        if (request.text === limitedText && !limited) {
          // 429 after 10 ms, while segments 1 and 3 are still rendering (50 ms).
          await new Promise((resolve) => setTimeout(resolve, 10));
          limited = true;
          throw rateLimited();
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
        return WAV;
      } finally {
        inFlight -= 1;
      }
    });
    await startAndDrain(harness);

    expect(peakBefore).toBe(3);
    // Segments 1 and 3 (in flight at the 429) finished; segment 4 started alone.
    expect(startedBefore.size).toBe(3);
    expect(segments.length).toBeGreaterThan(3);
    expect(newSegmentsBesideOthers).toBe(0);
    expect(harness.speech().status).toBe(SpeechJobStatus.READY);
    expect(harness.speech().segments).toHaveLength(segments.length);
    expect(harness.finalizeCredit).toHaveBeenCalledTimes(segments.length);
  });

  it('never starts a retry that cannot fit the job deadline', async () => {
    const harness = build({ candidates: [GEMINI_ROW] });
    harness.providerSynthesize.mockImplementation(async () => {
      // The 429 lands with 10 s left: after the store + settle reserve and a
      // 1.5 s wait, nothing is left for an attempt — so no retry starts.
      vi.setSystemTime(Date.now() + 170_000);
      throw rateLimited();
    });
    await startAndDrain(harness);

    expect(harness.reserveCredit).toHaveBeenCalledTimes(1);
    expect(harness.providerSynthesize).toHaveBeenCalledTimes(1);
    expect(harness.finalizeCredit).not.toHaveBeenCalled();
    expect(harness.speech()).toMatchObject({ status: SpeechJobStatus.FAILED, segments: [] });
  });
});

describe('MessageSpeechService — resume and poll', () => {
  it('a stale GENERATING job reads as PARTIAL, and a POST resumes only the missing segments', async () => {
    const segments = segmentSpeakableText(
      prepareSpeakableText(LONG_REPLY, SPEECH_MAX_CHARACTERS).text,
    );
    const speakable = prepareSpeakableText(LONG_REPLY, SPEECH_MAX_CHARACTERS);
    const stale: SpeechJobState = {
      version: 2,
      status: SpeechJobStatus.GENERATING,
      contentHash: speakable.contentHash,
      generation: 2,
      startedAt: new Date(Date.now() - SPEECH_JOB_LOCK_TTL_MS - 1_000).toISOString(),
      totalSegments: segments.length,
      characters: speakable.characters,
      truncated: false,
      segments: [
        {
          index: 0,
          fileId: 'file-kept',
          mimeType: 'audio/wav',
          characters: segments[0]?.characters ?? 0,
          provider: 'GEMINI',
          model: 'gemini-2.5-flash-preview-tts',
        },
      ],
      errorCode: null,
    };
    const harness = build({
      candidates: [GEMINI_ROW],
      content: LONG_REPLY,
      metadata: { speech: stale },
    });

    await expect(harness.service.getState(USER, MESSAGE_ID)).resolves.toMatchObject({
      status: SpeechJobStatus.PARTIAL,
      errorCode: 'TTS_FAILED',
    });

    await startAndFinish(harness);
    const ids = harness.reserveCredit.mock.calls.map(
      (call) => (call[0] as { requestId: string }).requestId,
    );
    expect(ids).toHaveLength(segments.length - 1);
    expect(ids.every((id) => id.includes(':g3:'))).toBe(true);
    expect(ids.some((id) => id.includes(':seg1:'))).toBe(false);
    expect(harness.speech().status).toBe(SpeechJobStatus.READY);
    expect(harness.speech().segments[0]?.fileId).toBe('file-kept');
  });

  it('GET is owner-only: a stranger gets the same 404 as a missing id', async () => {
    const harness = build({ threadOwner: 'someone-else' });
    await expectCode(harness.service.getState(USER, MESSAGE_ID), 'ENTITY_NOT_FOUND', 404);
    await expectCode(harness.service.getState(USER, 'missing'), 'ENTITY_NOT_FOUND', 404);
  });

  it('GET says NONE before any reading, and NONE when the stored reading is of other text', async () => {
    await expect(build().service.getState(USER, MESSAGE_ID)).resolves.toEqual({
      status: SpeechJobStatus.NONE,
      segments: [],
      totalSegments: 0,
      truncated: false,
      errorCode: null,
    });
    const other = build({ metadata: { speech: readyState('Something else.', 'file-x') } });
    await expect(other.service.getState(USER, MESSAGE_ID)).resolves.toMatchObject({
      status: SpeechJobStatus.NONE,
    });
  });

  it('GET never reserves, locks or calls a provider', async () => {
    const harness = build();
    await harness.service.getState(USER, MESSAGE_ID);
    expect(harness.acquire).not.toHaveBeenCalled();
    expect(harness.reserveCredit).not.toHaveBeenCalled();
    expect(harness.providerSynthesize).not.toHaveBeenCalled();
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
  });

  it('fails closed when entitlements cannot be read', async () => {
    await expect(build({ entitlementsDown: true }).service.getAvailability(USER)).resolves.toEqual({
      available: false,
      reason: SpeechUnavailableReason.TEMPORARILY_UNAVAILABLE,
    });
  });
});
