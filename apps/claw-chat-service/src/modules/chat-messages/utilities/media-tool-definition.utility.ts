import { inferImageCapabilityProvider, inferVideoCapabilityProvider } from '@claw/shared-utilities';

import {
  MEDIA_AUDIO_GEMINI_HINT,
  MEDIA_AUDIO_PROVIDER_GEMINI,
  MEDIA_DEFAULT_TARGET,
  MEDIA_FALLBACK_MAX_ATTEMPTS,
  MEDIA_IMAGE_SIZE_PIXELS,
  MEDIA_IMAGE_SIZE_PROVIDER,
  MEDIA_KNOWN_MODELS,
  MEDIA_PROMPT_MAX_CHARS,
  MEDIA_PROVIDER_ORDER,
  MEDIA_TOOL_DESCRIPTION,
  MEDIA_TOOL_INPUT_SCHEMA,
  MEDIA_TOOL_NAME,
  MEDIA_TOOL_OPERATION,
  MEDIA_TOOL_TARGET_ID,
  MEDIA_TOOL_VERSION,
  MEDIA_VIDEO_SECONDS,
} from '../constants/media-tools.constants';
import { RUNTIME_V2_SCHEMA_VERSION } from '../constants/runtime-v2.constants';
import { MEDIA_TOOL_ARG_SCHEMA } from '../dto/media-tool-args.dto';
import { type ToolDefinitionDto, toolDefinitionSchema } from '../dto/runtime-v2.dto';
import { MediaKind } from '../enums/media-kind.enum';
import type {
  MediaStartRequest,
  MediaTarget,
  MediaToolArgs,
  MediaToolArgsResult,
} from '../types/media-tools.types';

/** A kind's row of a per-kind table. Every kind has one; a miss is a programming error. */
export function kindEntry<T>(table: ReadonlyMap<MediaKind, T>, kind: MediaKind): T {
  const entry = table.get(kind);
  if (entry === undefined) throw new Error(`No media table entry for kind ${kind}`);
  return entry;
}

/**
 * The media tools as Runtime-shaped definitions, so the existing native tool lane
 * (translation, byte budget, provider dialects, call normalisation) carries them unchanged,
 * exactly as it carries plugin tools. One operation and one target each.
 */
export function buildMediaToolCatalog(kinds: readonly MediaKind[]): ToolDefinitionDto[] {
  return kinds.map((kind) =>
    toolDefinitionSchema.parse({
      schemaVersion: RUNTIME_V2_SCHEMA_VERSION,
      name: kindEntry(MEDIA_TOOL_NAME, kind),
      version: MEDIA_TOOL_VERSION,
      description: kindEntry(MEDIA_TOOL_DESCRIPTION, kind),
      operations: [MEDIA_TOOL_OPERATION],
      riskClasses: ['network'],
      targetIds: [MEDIA_TOOL_TARGET_ID],
      inputSchema: kindEntry(MEDIA_TOOL_INPUT_SCHEMA, kind),
    }),
  );
}

/** The kind a (native or Runtime) tool name belongs to, or undefined for any other tool. */
export function mediaKindOfTool(toolName: string): MediaKind | undefined {
  return Object.values(MediaKind).find((kind) => MEDIA_TOOL_NAME.get(kind) === toolName);
}

/** Validates what the model sent. A bad optional field is dropped; a bad prompt is an error. */
export function parseMediaToolArgs(kind: MediaKind, raw: unknown): MediaToolArgsResult {
  const parsed = kindEntry(MEDIA_TOOL_ARG_SCHEMA, kind).safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: `${MEDIA_TOOL_NAME.get(kind) ?? kind} needs a non-empty "prompt" of at most ${String(MEDIA_PROMPT_MAX_CHARS)} characters.`,
    };
  }
  const data = parsed.data;
  return {
    ok: true,
    args: {
      kind,
      prompt: String(data['prompt']),
      model: data['model'] as string | undefined,
      size: data['size'] as MediaToolArgs['size'],
      durationSeconds: data['durationSeconds'] as number | undefined,
      aspectRatio: data['aspectRatio'] as MediaToolArgs['aspectRatio'],
      voice: data['voice'] as string | undefined,
      format: data['format'] as string | undefined,
      audioKind: data['kind'] as MediaToolArgs['audioKind'],
    },
  };
}

/**
 * The provider a model id the user named belongs to, via the shared media classifier (image and
 * video patterns), then the known-model table, then the audio hint. Undefined when unknown.
 */
function providerOfNamedModel(kind: MediaKind, named: string): string | undefined {
  if (kind === MediaKind.IMAGE) {
    return inferImageCapabilityProvider(named) ?? kindEntry(MEDIA_KNOWN_MODELS, kind).get(named);
  }
  if (kind === MediaKind.VIDEO) {
    return inferVideoCapabilityProvider(named) ?? kindEntry(MEDIA_KNOWN_MODELS, kind).get(named);
  }
  return MEDIA_AUDIO_GEMINI_HINT.test(named) ? MEDIA_AUDIO_PROVIDER_GEMINI : undefined;
}

/** The target the user named, if any model they named is one the platform can serve. */
export function resolveNamedMediaTarget(args: MediaToolArgs): MediaTarget | undefined {
  const named = args.model?.trim();
  if (named === undefined || named === '') return undefined;
  const provider = providerOfNamedModel(args.kind, named);
  return provider === undefined ? undefined : { provider, model: named };
}

/** The provider and model a call starts on: the model the user named, else the default. */
export function resolveMediaTarget(args: MediaToolArgs): MediaTarget {
  return resolveNamedMediaTarget(args) ?? kindEntry(MEDIA_DEFAULT_TARGET, args.kind);
}

/**
 * Every target one call may try, in order. A model the user named is honored alone (no silent
 * swap to another model); otherwise the default first, then the other cloud providers of the
 * kind, capped at `MEDIA_FALLBACK_MAX_ATTEMPTS`. Local providers are never listed.
 */
export function resolveMediaTargets(args: MediaToolArgs, userText?: string): MediaTarget[] {
  // A model counts as named only if the user's own words say it. A chat model that fills `model`
  // by itself (copying a listed id) must not switch off the cross-provider fallback.
  const userNamedIt =
    userText === undefined ||
    userText.toLowerCase().includes(args.model?.trim().toLowerCase() ?? '\0');
  const named = userNamedIt ? resolveNamedMediaTarget(args) : undefined;
  return named !== undefined
    ? [named]
    : [...kindEntry(MEDIA_PROVIDER_ORDER, args.kind)].slice(0, MEDIA_FALLBACK_MAX_ATTEMPTS);
}

/** The service request for one validated call. */
export function toMediaStartRequest(
  args: MediaToolArgs,
  target: MediaTarget,
  turn: { userId: string; threadId?: string | undefined; userMessageId?: string | undefined },
): MediaStartRequest {
  const pixels =
    args.kind === MediaKind.IMAGE &&
    args.size !== undefined &&
    target.provider === MEDIA_IMAGE_SIZE_PROVIDER
      ? MEDIA_IMAGE_SIZE_PIXELS.get(args.size)
      : undefined;
  const isVideo = args.kind === MediaKind.VIDEO;
  return {
    kind: args.kind,
    userId: turn.userId,
    prompt: args.prompt,
    provider: target.provider,
    model: target.model,
    threadId: turn.threadId,
    userMessageId: turn.userMessageId,
    width: pixels?.width,
    height: pixels?.height,
    durationSeconds: isVideo ? (args.durationSeconds ?? MEDIA_VIDEO_SECONDS.fallback) : undefined,
    aspectRatio: isVideo ? (args.aspectRatio ?? '16:9') : undefined,
    voice: args.voice,
    format: args.format,
    audioKind: args.kind === MediaKind.AUDIO ? (args.audioKind ?? 'SPEECH') : undefined,
  };
}
