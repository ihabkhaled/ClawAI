// Multimodal batch 8: a video a lane cannot watch natively reaches it as its
// timestamped transcript PLUS sampled frames — images for a lane that can see,
// the vision helper's timestamped observations for one that cannot, or the
// transcript alone with an honest note. Never silently dropped.

import { Logger } from '@nestjs/common';
import type { PaygHold } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { type Mock, vi } from 'vitest';

import { FileDeliveryMode } from '../../../../common/enums/file-delivery-mode.enum';
import { HelperExecutionKind } from '../../../../common/enums/helper-execution-kind.enum';
import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import { VideoFrameDelivery } from '../../../../common/enums/video-frame-delivery.enum';
import type { ChatMessage } from '../../../../generated/prisma';
import {
  VIDEO_FRAMES_PER_VIDEO_MAX,
  VIDEO_FRAMES_TRANSCRIPT_ONLY_NOTE,
} from '../../constants/video-delivery.constants';
import { VISION_HELPER_MAX_IMAGES_PER_TURN } from '../../constants/vision-helper.constants';
import type { AssembledContext, FileContentResponse } from '../../types/context.types';
import type { LlmResponse } from '../../types/execution.types';
import type { ModelMediaCapabilities } from '../../types/model-capability.types';
import type { VideoFramesFetchResult } from '../../types/video-delivery.types';
import type {
  VisionHelperCandidateWire,
  VisionHelperInvoker,
} from '../../types/vision-helper.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';
import { nativeImageContents } from '../../utilities/attachment-delivery.utility';
import { selectVideoFrameTimestamps } from '../../utilities/video-frame-selection.utility';
import { AttachmentDeliveryManager } from '../attachment-delivery.manager';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';
import { VideoDeliveryManager } from '../video-delivery.manager';
import { VisionHelperManager } from '../vision-helper.manager';

const { SUPPORTED, UNSUPPORTED, UNKNOWN } = MediaCapabilityState;

const CAPABILITIES: Record<string, Partial<ModelMediaCapabilities>> = {
  'OPENAI/gpt-4o': { vision: SUPPORTED, videoInput: UNSUPPORTED },
  'GEMINI/gemini-2.5-flash': { vision: SUPPORTED, videoInput: SUPPORTED },
  'DEEPSEEK/deepseek-chat': { vision: UNSUPPORTED, videoInput: UNSUPPORTED },
  'GROQ/llama-3.3-70b': { vision: UNSUPPORTED, videoInput: UNSUPPORTED },
};

const capabilityClient = {
  resolve: async (provider: string, model: string): Promise<ModelMediaCapabilities> =>
    Promise.resolve({
      vision: UNKNOWN,
      audioInput: UNKNOWN,
      videoInput: UNKNOWN,
      ...CAPABILITIES[`${provider}/${model}`],
    }),
  listVideoCapableModels: async () => Promise.resolve(null),
};

const HELPER: VisionHelperCandidateWire = {
  provider: 'GEMINI',
  modelAlias: 'gemini-2.5-flash',
  timeoutMs: 30_000,
  maxTokens: 1_024,
};

const TRANSCRIPT_SECRET = 'Meet Ada Lovelace';
const VIDEO_BYTES = Buffer.from('raw-video-bytes').toString('base64');

const DOCUMENT = [
  'Video "clip.mp4" — length 00:42, 640×360, audio: aac.',
  'Transcript of the audio track (times are from the start of the video):',
  '[00:00–00:05] Welcome to the demo.',
  `[00:18–00:24] ${TRANSCRIPT_SECRET}.`,
].join('\n');

const clip = (overrides: Partial<FileContentResponse> = {}): FileContentResponse => ({
  id: 'vid-1',
  filename: 'clip.mp4',
  mimeType: 'video/mp4',
  content: VIDEO_BYTES,
  extractedText: DOCUMENT,
  ingestionStatus: 'COMPLETED',
  extractionError: null,
  media: { durationMs: 42_000, width: 640, height: 360, hasAudio: true, failureReason: null },
  ...overrides,
});

const picture = (id: string): FileContentResponse => ({
  id,
  filename: `${id}.png`,
  mimeType: 'image/png',
  content: Buffer.from(`bytes-${id}`).toString('base64'),
  extractedText: '',
  ingestionStatus: 'COMPLETED',
  extractionError: null,
});

const QUESTION = 'Who is introduced at 0:20?';

const LARGE_WINDOW: AssembledContext['modelBudget'] = {
  contextWindowTokens: 128_000,
  reservedOutputTokens: 4_096,
  systemOverheadTokens: 0,
  toolOverheadTokens: 0,
  availableInputTokens: 123_904,
  source: 'MODEL_CATALOG',
};

function contextWith(
  files: FileContentResponse[],
  question = QUESTION,
  modelBudget: AssembledContext['modelBudget'] = LARGE_WINDOW,
): AssembledContext {
  return {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content: question,
        metadata: null,
        createdAt: new Date('2026-09-25T00:00:00.000Z'),
      } as ChatMessage,
    ],
    memories: [],
    contextPackItems: [],
    fileContents: files,
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 8_000,
    modelBudget,
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
    turnId: 'turn-1',
  };
}

function hold(): PaygHold {
  return {
    metered: true,
    maxOutputTokens: 700,
    clamped: false,
    reservationId: 'res-1',
    heldMicroUsd: 10,
    availableAfterMicroUsd: 1_000,
    reason: null,
  };
}

const okFrames = async (
  _fileId: string,
  _userId: string,
  timestamps: readonly number[],
): Promise<VideoFramesFetchResult> =>
  Promise.resolve({
    ok: true,
    frames: timestamps.map((timestampMs) => ({
      timestampMs,
      mimeType: 'image/jpeg',
      base64: `FRAME${String(timestampMs)}`,
    })),
    latencyMs: 3,
  });

function build(
  options: {
    candidates?: VisionHelperCandidateWire[];
    onPlan?: boolean;
    frames?: typeof okFrames;
  } = {},
): {
  run: (context: AssembledContext, provider: string, model: string) => Promise<AssembledContext>;
  framesClient: { fetchFrames: Mock };
  invoke: Mock<VisionHelperInvoker>;
  access: { reserveCredit: Mock; hasPlanFeatureFor: Mock };
} {
  const access = {
    reserveCredit: vi.fn(async () => Promise.resolve(hold())),
    releaseCredit: vi.fn(async () => Promise.resolve()),
    hasPlanFeatureFor: vi.fn(async () => Promise.resolve(options.onPlan ?? true)),
  };
  const candidatesClient = {
    resolve: vi.fn(async () => Promise.resolve(options.candidates ?? [HELPER])),
  };
  const helper = new VisionHelperManager(
    candidatesClient as never,
    capabilityClient as never,
    access as never,
  );
  const framesClient = { fetchFrames: vi.fn(options.frames ?? okFrames) };
  const video = new VideoDeliveryManager(framesClient as never, helper);
  const delivery = new AttachmentDeliveryManager(
    capabilityClient as never,
    {
      maxVideoSecondsFor: async () => Promise.resolve(600),
    } as never,
  );
  const invoke = vi.fn<VisionHelperInvoker>(async (call): Promise<LlmResponse> =>
    Promise.resolve({
      content: `A person at a lectern (${call.requestId}).`,
      provider: call.provider,
      model: call.model,
      latencyMs: 5,
      usedFallback: false,
    }),
  );
  const run = async (
    context: AssembledContext,
    provider: string,
    model: string,
  ): Promise<AssembledContext> => {
    const planned = await delivery.applyToContext(context, provider, model);
    const described = await helper.upgradeContext(planned, invoke);
    return video.upgradeContext(described, invoke);
  };
  return { run, framesClient, invoke, access };
}

const assembly = new ContextAssemblyManager(
  new ContextComposerManager(),
  new CrossThreadRetrievalManager({
    findCandidateThreads: async () => Promise.resolve([]),
    findMessagesForThreads: async () => Promise.resolve([]),
  } as never),
  { needsWeb: async () => ({ needsWeb: false, reason: 'test' }) } as never,
  { hasResearchAccess: async () => true } as never,
);

const payloadOf = (lane: AssembledContext): string =>
  JSON.stringify(assembly.buildChatMessages(lane));

const expectedTimestamps = selectVideoFrameTimestamps(42_000, QUESTION, VIDEO_FRAMES_PER_VIDEO_MAX);

describe('VideoDeliveryManager', () => {
  describe('a lane that can see', () => {
    it('gets the transcript block plus each frame as an image labelled with its timestamp', async () => {
      const { run, framesClient, invoke } = build();

      const lane = await run(contextWith([clip()]), 'OPENAI', 'gpt-4o');
      const payload = payloadOf(lane);
      const decision = lane.attachmentDelivery?.decisions[0];

      expect(decision).toMatchObject({
        mode: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
        frameDelivery: VideoFrameDelivery.NATIVE_IMAGES,
        frameTimestampsMs: expectedTimestamps,
      });
      expect(framesClient.fetchFrames).toHaveBeenCalledWith('vid-1', 'user-1', expectedTimestamps);
      expect(expectedTimestamps).toContain(20_000);
      expect(invoke).not.toHaveBeenCalled();
      expect(payload).toContain('VIDEO: clip.mp4 (duration 00:42, 640x360, audio: yes)');
      expect(payload).toContain('TRANSCRIPT (timestamped):');
      expect(payload).toContain(TRANSCRIPT_SECRET);
      expect(payload).toContain('Frame of video \\"clip.mp4\\" at 00:20:');
      expect(payload).toContain('data:image/jpeg;base64,FRAME20000');
      expect(payload).not.toContain(VIDEO_BYTES);
      expect(payload).not.toContain(VIDEO_FRAMES_TRANSCRIPT_ONLY_NOTE);
      // The single-string / local path gets the same frames as images[].
      expect(nativeImageContents(lane)).toContain('FRAME20000');
    });

    it('takes only as many frames as its window can hold — one on an 8k model', async () => {
      const { run, framesClient } = build();

      const lane = await run(
        contextWith([clip()], QUESTION, fallbackModelTokenBudget()),
        'OPENAI',
        'gpt-4o',
      );

      expect(framesClient.fetchFrames).toHaveBeenCalledWith('vid-1', 'user-1', expectedTimestamps);
      expect(lane.attachmentDelivery?.decisions[0]?.frameTimestampsMs).toHaveLength(1);
      expect(nativeImageContents(lane)).toHaveLength(1);
    });

    it('degrades to the transcript with an honest note when the frames cannot be fetched', async () => {
      const { run } = build({
        frames: async () => Promise.resolve({ ok: false, reason: 'status_409', latencyMs: 1 }),
      });

      const lane = await run(contextWith([clip()]), 'OPENAI', 'gpt-4o');

      expect(lane.attachmentDelivery?.decisions[0]).toMatchObject({
        mode: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
        frameDelivery: VideoFrameDelivery.NONE,
        reason: 'file_delivery.reason.video_frames_unavailable',
      });
      const payload = payloadOf(lane);
      expect(payload).toContain(TRANSCRIPT_SECRET);
      expect(payload).toContain("the video's frames could not be viewed");
      expect(payload).not.toContain('image_url');
    });

    it('fetches nothing when the duration is unknown, and says so', async () => {
      const { run, framesClient } = build();

      const lane = await run(contextWith([clip({ media: undefined })]), 'OPENAI', 'gpt-4o');

      expect(framesClient.fetchFrames).not.toHaveBeenCalled();
      expect(lane.attachmentDelivery?.decisions[0]?.reason).toBe(
        'file_delivery.reason.video_frames_unavailable',
      );
    });
  });

  describe('a lane that cannot see', () => {
    it('gets the helper description of each frame, timestamped, metered as VIDEO_FRAME', async () => {
      const { run, invoke, access } = build();

      const lane = await run(contextWith([clip()]), 'DEEPSEEK', 'deepseek-chat');
      const payload = payloadOf(lane);
      const plan = lane.attachmentDelivery;

      expect(invoke).toHaveBeenCalledTimes(
        Math.min(VISION_HELPER_MAX_IMAGES_PER_TURN, expectedTimestamps.length),
      );
      expect(invoke.mock.calls.map(([call]) => call.requestId)).toContain(
        'turn-1:vision:vid-1@20000',
      );
      expect(access.reserveCredit).toHaveBeenCalledWith(
        expect.objectContaining({ surface: PaygSurface.VISION_HELPER }),
      );
      expect(plan?.decisions[0]).toMatchObject({
        mode: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
        frameDelivery: VideoFrameDelivery.HELPER_OBSERVATIONS,
        helperProvider: 'GEMINI',
        helperModel: 'gemini-2.5-flash',
      });
      expect(plan?.helperExecutions?.every((execution) => execution.fileId === 'vid-1')).toBe(true);
      expect(plan?.helperExecutions?.[0]).toMatchObject({
        kind: HelperExecutionKind.VIDEO_FRAME,
        timestampMs: expect.any(Number) as number,
      });
      expect(payload).toContain('FRAME AT 00:20');
      expect(payload).toContain('DERIVED IMAGE OBSERVATIONS');
      expect(payload).toContain(TRANSCRIPT_SECRET);
      expect(payload).not.toContain('image_url');
      expect(payload).not.toContain('FRAME20000');
    });

    it('fetches no frames and calls no helper on a plan without helper vision — transcript only', async () => {
      const { run, framesClient, invoke, access } = build({ onPlan: false });

      const lane = await run(contextWith([clip()]), 'DEEPSEEK', 'deepseek-chat');

      expect(framesClient.fetchFrames).not.toHaveBeenCalled();
      expect(invoke).not.toHaveBeenCalled();
      expect(access.reserveCredit).not.toHaveBeenCalled();
      expect(lane.attachmentDelivery?.decisions[0]).toMatchObject({
        frameDelivery: VideoFrameDelivery.NONE,
        reason: 'file_delivery.reason.video_frames_helper_plan',
      });
      expect(payloadOf(lane)).toContain("the video's frames could not be viewed");
    });

    it('says no helper was available when none is configured', async () => {
      const { run, framesClient } = build({ candidates: [] });

      const lane = await run(contextWith([clip()]), 'DEEPSEEK', 'deepseek-chat');

      expect(framesClient.fetchFrames).not.toHaveBeenCalled();
      expect(lane.attachmentDelivery?.decisions[0]?.reason).toBe(
        'file_delivery.reason.video_frames_no_helper',
      );
    });

    it('spends the per-turn helper cap on attached images first', async () => {
      const { run, invoke } = build();
      const images = ['a', 'b', 'c'].map(picture);

      const lane = await run(contextWith([...images, clip()]), 'DEEPSEEK', 'deepseek-chat');
      const frameCalls = invoke.mock.calls.filter(([call]) => call.requestId.includes('vid-1@'));

      expect(frameCalls).toHaveLength(VISION_HELPER_MAX_IMAGES_PER_TURN - images.length);
      expect(lane.attachmentDelivery?.decisions.at(-1)?.frameDelivery).toBe(
        VideoFrameDelivery.HELPER_OBSERVATIONS,
      );
    });

    it('describes no frame once images used the whole cap, and says why', async () => {
      const { run, framesClient } = build();
      const images = ['a', 'b', 'c', 'd'].map(picture);

      const lane = await run(contextWith([...images, clip()]), 'DEEPSEEK', 'deepseek-chat');

      expect(framesClient.fetchFrames).not.toHaveBeenCalled();
      expect(lane.attachmentDelivery?.decisions.at(-1)).toMatchObject({
        frameDelivery: VideoFrameDelivery.NONE,
        reason: 'file_delivery.reason.vision_helper_limit',
      });
    });
  });

  describe('one turn, many lanes', () => {
    it('fetches the frames once and describes each frame once for every lane and the judge', async () => {
      const { run, framesClient, invoke } = build();
      const turn = contextWith([clip()]);

      await run(turn, 'OPENAI', 'gpt-4o');
      await run(turn, 'DEEPSEEK', 'deepseek-chat');
      const describedOnce = invoke.mock.calls.length;
      await run(turn, 'GROQ', 'llama-3.3-70b');
      const judge = await run(turn, 'OPENAI', 'gpt-4o-mini');

      expect(framesClient.fetchFrames).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledTimes(describedOnce);
      expect(judge.attachmentDelivery?.decisions[0]?.mode).toBe(
        FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
      );
    });
  });

  describe('other video states', () => {
    it('leaves a native lane untouched and a processing video honest', async () => {
      const { run, framesClient } = build();

      const native = await run(contextWith([clip()]), 'GEMINI', 'gemini-2.5-flash');
      const processing = await run(
        contextWith([clip({ extractedText: '[Video file: clip.mp4]', media: undefined })]),
        'OPENAI',
        'gpt-4o',
      );

      expect(native.attachmentDelivery?.decisions[0]?.mode).toBe(FileDeliveryMode.NATIVE_VIDEO);
      expect(processing.attachmentDelivery?.decisions[0]?.mode).toBe(
        FileDeliveryMode.STILL_PROCESSING,
      );
      expect(payloadOf(processing)).toContain('is still being processed');
      expect(framesClient.fetchFrames).not.toHaveBeenCalled();
    });
  });

  it('logs a content-free videoDelivery line: ids, strategy, counts, latency', async () => {
    const log = vi.spyOn(Logger.prototype, 'log');
    const { run } = build();

    await run(contextWith([clip()]), 'OPENAI', 'gpt-4o');
    const lines = log.mock.calls
      .map(([message]) => String(message))
      .filter((message) => message.startsWith('videoDelivery '));
    log.mockRestore();

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]?.slice('videoDelivery '.length) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(entry).toMatchObject({
      fileId: 'vid-1',
      provider: 'OPENAI',
      model: 'gpt-4o',
      strategy: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
      frameDelivery: VideoFrameDelivery.NATIVE_IMAGES,
      frames: expectedTimestamps.length,
    });
    expect(typeof entry['latencyMs']).toBe('number');
    expect(lines[0]).not.toContain(TRANSCRIPT_SECRET);
    expect(lines[0]).not.toContain('FRAME20000');
  });
});
