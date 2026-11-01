import { HttpStatus, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  MEDIA_GENERATE_SEGMENT,
  MEDIA_READ_MAX_CONSECUTIVE_FAILURES,
  MEDIA_READ_TIMEOUT_MS,
  MEDIA_SERVICE_PATH,
  MEDIA_START_TIMEOUT_MS,
  MEDIA_STATUS_TERMINAL,
  MEDIA_SUPERSEDED_MAX_HOPS,
} from '../constants/media-tools.constants';
import { PLAN_FEATURE_DISABLED_CODE } from '../constants/plan-feature-refusal.constants';
import { MediaKind } from '../enums/media-kind.enum';
import type {
  MediaAwaitOptions,
  MediaAwaitOutcome,
  MediaSnapshot,
  MediaStartOutcome,
  MediaStartRequest,
  MediaStatus,
} from '../types/media-tools.types';

const logger = new Logger('MediaGateway');

/**
 * THE one file that knows the three media services (image, video, audio). Everything else
 * (the tool loop, the executor) speaks `MediaStartRequest` and `MediaSnapshot` and never a
 * URL, a route or a payload shape. Plan gate and metering stay in the media service itself:
 * this only dispatches, reads, and waits (bounded) for a terminal status.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function baseUrl(kind: MediaKind): string {
  return `${AppConfig.get().IMAGE_SERVICE_URL}${MEDIA_SERVICE_PATH.get(kind) ?? ''}`;
}

/** The body each service's generate route takes. */
function buildStartBody(request: MediaStartRequest): Record<string, unknown> {
  const common = {
    prompt: request.prompt,
    provider: request.provider,
    userId: request.userId,
    ...(request.model === undefined ? {} : { model: request.model }),
    ...(request.threadId === undefined ? {} : { threadId: request.threadId }),
    ...(request.userMessageId === undefined ? {} : { userMessageId: request.userMessageId }),
  };
  switch (request.kind) {
    case MediaKind.IMAGE: {
      return {
        ...common,
        model: request.model ?? '',
        // Not AUTO: no successor chain. A credit or plan refusal must reach the chat model, not
        // fall through to a local sdxl/sd provider the user never asked for.
        isAutoMode: false,
        ...(request.width === undefined ? {} : { width: request.width }),
        ...(request.height === undefined ? {} : { height: request.height }),
      };
    }
    case MediaKind.VIDEO: {
      return {
        ...common,
        model: request.model ?? '',
        isAutoMode: false,
        durationSeconds: request.durationSeconds,
        aspectRatio: request.aspectRatio,
      };
    }
    case MediaKind.AUDIO: {
      // The audio contract names the turn `messageId`, not `userMessageId`.
      const { userMessageId: _userMessageId, ...audioCommon } = common;
      return {
        ...audioCommon,
        ...(request.userMessageId === undefined ? {} : { messageId: request.userMessageId }),
        kind: request.audioKind ?? 'SPEECH',
        ...(request.workspaceId === undefined ? {} : { workspaceId: request.workspaceId }),
        ...(request.voice === undefined ? {} : { voice: request.voice }),
        ...(request.format === undefined ? {} : { format: request.format }),
      };
    }
  }
}

/** Starts a generation. Never throws: a refusal or an outage is an outcome the caller reports. */
export async function startMedia(
  request: MediaStartRequest,
  signal?: AbortSignal,
): Promise<MediaStartOutcome> {
  try {
    const response = await httpRequest<unknown>({
      url: `${baseUrl(request.kind)}${MEDIA_GENERATE_SEGMENT}`,
      method: 'POST',
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: buildStartBody(request),
      timeoutMs: MEDIA_START_TIMEOUT_MS,
      ...(signal === undefined ? {} : { signal }),
    });
    const data = isRecord(response.data) ? response.data : {};
    if (!response.ok) {
      logger.warn(`startMedia: kind=${request.kind} refused status=${String(response.status)}`);
      if (response.status === Number(HttpStatus.PAYMENT_REQUIRED)) {
        return { ok: false, reason: 'PAYMENT', status: response.status };
      }
      if (
        response.status === Number(HttpStatus.FORBIDDEN) &&
        data['code'] === PLAN_FEATURE_DISABLED_CODE
      ) {
        return { ok: false, reason: 'PLAN', status: response.status };
      }
      return {
        ok: false,
        reason: response.status >= 500 ? 'UNAVAILABLE' : 'REJECTED',
        status: response.status,
      };
    }
    const id = text(data['generationId']) ?? text(data['id']);
    if (id === undefined) {
      logger.warn(`startMedia: kind=${request.kind} answered without an id`);
      return { ok: false, reason: 'UNAVAILABLE', status: response.status };
    }
    return {
      ok: true,
      id,
      provider: text(data['provider']) ?? request.provider,
      model: text(data['model']) ?? request.model ?? '',
    };
  } catch (error: unknown) {
    logger.warn(
      `startMedia: kind=${request.kind} unreachable - ${error instanceof Error ? error.name : 'error'}`,
    );
    return { ok: false, reason: 'UNAVAILABLE', status: 0 };
  }
}

/** The asset of an image or video row: `assets[0]` (raw row) or `asset` (view). */
function readAsset(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const assets = data['assets'];
  if (Array.isArray(assets) && isRecord(assets[0])) return assets[0];
  return isRecord(data['asset']) ? data['asset'] : undefined;
}

function toSnapshot(id: string, data: Record<string, unknown>): MediaSnapshot | undefined {
  const status = text(data['status']);
  if (status === undefined) return undefined;
  const asset = readAsset(data);
  return {
    id: text(data['id']) ?? text(data['generationId']) ?? id,
    status: status as MediaStatus,
    provider: text(data['provider']),
    model: text(data['model']),
    assetUrl: text(data['assetUrl']) ?? text(asset?.['url']),
    mimeType: text(data['mimeType']) ?? text(asset?.['mimeType']),
    durationSec: num(data['durationSec']),
    errorCode: text(data['errorCode']),
    errorMessage: text(data['errorMessage']) ?? text(data['error']),
    supersededById: text(data['supersededById']),
  };
}

/** One read of a generation, or undefined when it cannot be read right now. */
export async function readMedia(
  kind: MediaKind,
  id: string,
  signal?: AbortSignal,
): Promise<MediaSnapshot | undefined> {
  try {
    const response = await httpRequest<unknown>({
      url: `${baseUrl(kind)}/${encodeURIComponent(id)}`,
      method: 'GET',
      headers: { Authorization: buildInterServiceAuthHeader() },
      timeoutMs: MEDIA_READ_TIMEOUT_MS,
      ...(signal === undefined ? {} : { signal }),
    });
    return response.ok && isRecord(response.data) ? toSnapshot(id, response.data) : undefined;
  } catch {
    return undefined;
  }
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Waits for a terminal status. Bounded twice: `maxPolls` reads at `pollMs`, and three failed
 * reads in a row. An AUTO image or video that failed and was replaced by a fallback is followed
 * (at most a few hops). A timeout is not a failure: the generation keeps running and its card
 * fills in by itself.
 */
export async function awaitMedia(
  kind: MediaKind,
  startId: string,
  options: MediaAwaitOptions,
): Promise<MediaAwaitOutcome> {
  const sleep = options.sleep ?? defaultSleep;
  let id = startId;
  let hops = 0;
  let last: MediaSnapshot | undefined;
  let unreadable = 0;
  for (let poll = 0; poll < options.maxPolls; poll += 1) {
    if (isAborted(options.signal)) return { state: 'cancelled', snapshot: last };
    await sleep(options.pollMs);
    if (isAborted(options.signal)) return { state: 'cancelled', snapshot: last };
    const snapshot = await readMedia(kind, id, options.signal);
    if (snapshot === undefined) {
      unreadable += 1;
      if (unreadable >= MEDIA_READ_MAX_CONSECUTIVE_FAILURES) {
        return { state: 'timeout', snapshot: last };
      }
      continue;
    }
    unreadable = 0;
    last = snapshot;
    if (!MEDIA_STATUS_TERMINAL.has(snapshot.status)) continue;
    if (snapshot.status === 'COMPLETED') return { state: 'completed', snapshot };
    if (
      snapshot.supersededById !== undefined &&
      snapshot.supersededById !== id &&
      hops < MEDIA_SUPERSEDED_MAX_HOPS
    ) {
      id = snapshot.supersededById;
      hops += 1;
      continue;
    }
    return { state: snapshot.status === 'CANCELLED' ? 'cancelled' : 'failed', snapshot };
  }
  return { state: 'timeout', snapshot: last };
}

/**
 * Best-effort cancel of a generation the user stopped waiting for, so no row is left RUNNING
 * (and its provider spend stops where the service can). Never throws.
 */
export async function cancelMedia(kind: MediaKind, id: string, userId: string): Promise<boolean> {
  try {
    const response = await httpRequest<unknown>({
      url: `${baseUrl(kind)}/${encodeURIComponent(id)}/cancel`,
      method: 'POST',
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: { userId },
      timeoutMs: MEDIA_READ_TIMEOUT_MS,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Tells the media service which assistant message shows a generation's card (image, video and
 * audio all have the internal route). Never throws.
 */
export async function linkMedia(
  kind: MediaKind,
  id: string,
  userId: string,
  assistantMessageId: string,
): Promise<boolean> {
  try {
    const response = await httpRequest<unknown>({
      url: `${baseUrl(kind)}/${encodeURIComponent(id)}/assistant-message`,
      method: 'POST',
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: { userId, assistantMessageId },
      timeoutMs: MEDIA_READ_TIMEOUT_MS,
    });
    return response.ok;
  } catch {
    return false;
  }
}
