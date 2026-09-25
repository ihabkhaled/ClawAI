import {
  FILE_DELIVERY_BADGE_SPECS,
  FILE_DELIVERY_EMPTY_COUNTS,
  FILE_DELIVERY_MODE_COUNT_KEYS,
  FILE_DELIVERY_MODE_LABEL_KEYS,
  FILE_DELIVERY_MODES,
} from '@/constants';
import {
  FILE_DELIVERY_REASON_FALLBACK_KEY,
  FILE_DELIVERY_REASON_LABEL_KEYS,
} from '@/constants/file-delivery-reason.constants';
import type { FileDeliveryMode } from '@/enums';
import type {
  ChatMessage,
  FileDeliveryBadge,
  FileDeliveryCounts,
  FileDeliveryEntry,
  FileDeliveryTranslator,
} from '@/types';

import { formatMediaClock } from './format-duration.utility';

// Type guard over the single FILE_DELIVERY_MODES allow-list. Both the
// metadata reader and the file-delivery repository narrow through this, so a
// wire value the FE does not know is dropped in one place, not two.
export function isFileDeliveryMode(value: unknown): value is FileDeliveryMode {
  return typeof value === 'string' && FILE_DELIVERY_MODES.has(value);
}

// Group a flat FileDeliveryEntry[] by delivery mode so the chip can render
// one badge per non-zero count. Pure function — no i18n, no React.
export function countFileDeliveriesByMode(delivery: FileDeliveryEntry[]): FileDeliveryCounts {
  const counts: FileDeliveryCounts = { ...FILE_DELIVERY_EMPTY_COUNTS };
  for (const entry of delivery) {
    counts[FILE_DELIVERY_MODE_COUNT_KEYS[entry.mode]]++;
  }
  return counts;
}

// Resolve the i18n-translated mode label for a single delivery entry. The
// label map is exhaustive over FileDeliveryMode — no fall-through default.
export function getFileDeliveryModeLabel(
  mode: FileDeliveryMode,
  t: FileDeliveryTranslator,
): string {
  return t(FILE_DELIVERY_MODE_LABEL_KEYS[mode]);
}

// Resolve the chip's non-zero badges, in render order, each with its
// localized text label so no badge relies on color or icon alone.
export function buildFileDeliveryBadges(
  counts: FileDeliveryCounts,
  t: FileDeliveryTranslator,
): FileDeliveryBadge[] {
  const badges: FileDeliveryBadge[] = [];
  for (const spec of FILE_DELIVERY_BADGE_SPECS) {
    const count = counts[spec.countKey];
    if (count > 0) {
      badges.push({
        countKey: spec.countKey,
        icon: spec.icon,
        label: getFileDeliveryModeLabel(spec.mode, t),
        count,
      });
    }
  }
  return badges;
}

// The localized sentence for a backend `file_delivery.reason.*` key. A reason
// this build does not know (a newer chat-service) gets the generic fallback —
// the raw key never reaches the user.
export function getFileDeliveryReasonLabel(reason: string, t: FileDeliveryTranslator): string {
  return t(FILE_DELIVERY_REASON_LABEL_KEYS.get(reason) ?? FILE_DELIVERY_REASON_FALLBACK_KEY);
}

// Build the multi-line `title` tooltip text for the chip strip: first line is
// the localised header, subsequent lines list each file with its mode label
// and optional reason. Returns a single newline-joined string suitable for
// the native HTML `title` attribute.
export function buildFileDeliveryTooltip(
  delivery: FileDeliveryEntry[],
  t: FileDeliveryTranslator,
): string {
  const header = t('compare.delivery.tooltip');
  const lines = delivery.map((entry) => {
    const modeLabel = getFileDeliveryModeLabel(entry.mode, t);
    const reasonSuffix =
      entry.reason !== undefined && entry.reason.length > 0
        ? ` — ${getFileDeliveryReasonLabel(entry.reason, t)}`
        : '';
    const helperSuffix =
      entry.helperProvider !== undefined && entry.helperModel !== undefined
        ? ` — ${entry.helperProvider}/${entry.helperModel}`
        : '';
    const frames = entry.frameTimestampsMs ?? [];
    const framesSuffix =
      frames.length > 0
        ? ` — ${t('compare.delivery.videoFramesAt', { times: frames.map(formatMediaClock).join(', ') })}`
        : '';
    return `${entry.filename} (${modeLabel})${framesSuffix}${helperSuffix}${reasonSuffix}`;
  });
  return [header, ...lines].join('\n');
}

// Narrowing helper for polled `ChatMessage.metadata.fileDelivery`. Returns the
// FileDeliveryEntry[] when the metadata holds a valid array of records, else
// undefined so the FE chip simply does not render. Validates each entry's
// mode against the FileDeliveryMode enum so unknown values never reach the UI.
export function readFileDeliveryFromMetadata(
  metadata: Record<string, unknown> | null,
): FileDeliveryEntry[] | undefined {
  if (metadata === null) {
    return undefined;
  }
  const raw = metadata['fileDelivery'];
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const entries: FileDeliveryEntry[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const candidate = item as Record<string, unknown>;
    const mode = candidate['mode'];
    if (!isFileDeliveryMode(mode)) {
      continue;
    }
    const fileId = candidate['fileId'];
    const filename = candidate['filename'];
    const mimeType = candidate['mimeType'];
    const provider = candidate['provider'];
    const model = candidate['model'];
    const reason = candidate['reason'];
    const helperProvider = candidate['helperProvider'];
    const helperModel = candidate['helperModel'];
    const frameTimestampsMs = readTimestamps(candidate['frameTimestampsMs']);
    if (
      typeof fileId !== 'string' ||
      typeof filename !== 'string' ||
      typeof mimeType !== 'string' ||
      typeof provider !== 'string' ||
      typeof model !== 'string'
    ) {
      continue;
    }
    entries.push({
      fileId,
      filename,
      mimeType,
      provider,
      model,
      mode,
      ...(typeof reason === 'string' ? { reason } : {}),
      ...(typeof helperProvider === 'string' && typeof helperModel === 'string'
        ? { helperProvider, helperModel }
        : {}),
      ...(frameTimestampsMs.length > 0 ? { frameTimestampsMs } : {}),
    });
  }
  return entries.length > 0 ? entries : undefined;
}

// Non-negative integer timestamps only; anything else on the wire is dropped.
function readTimestamps(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is number => typeof item === 'number' && Number.isInteger(item) && item >= 0,
      )
    : [];
}

// Inline-metadata first-step of the dual-read file-delivery resolution path.
// Reads `message.metadata.fileDelivery` (the JSON the parallel orchestrator
// mirrors onto the assistant message at completion). Returns [] when missing
// or malformed so callers can OR-coalesce against the API-backed read from
// `useFileDelivery` without branching on undefined. The "fresh" / authoritative
// read happens at the component layer via the hook; this function is the
// always-available fallback that works pre-completion and offline.
export function resolveFileDelivery(message: ChatMessage): FileDeliveryEntry[] {
  const meta = message.metadata as Record<string, unknown> | null;
  const entries = readFileDeliveryFromMetadata(meta);
  return entries ?? [];
}

// Derive the "files provided" count for the judge/critic informational chip.
// Prefers `metadata.fileDelivery.length` (authoritative per-lane record), then
// falls back to `metadata.fileIds.length` (set on the USER message + mirrored
// onto each parallel lane's ASSISTANT metadata). Returns 0 when neither is
// usable so the chip renders nothing.
export function getMessageFilesProvidedCount(message: ChatMessage): number {
  const meta = message.metadata as Record<string, unknown> | null;
  if (meta === null) {
    return 0;
  }
  const delivery = readFileDeliveryFromMetadata(meta);
  if (delivery !== undefined) {
    return delivery.length;
  }
  const rawFileIds = meta['fileIds'];
  if (Array.isArray(rawFileIds)) {
    let count = 0;
    for (const item of rawFileIds) {
      if (typeof item === 'string' && item.length > 0) {
        count++;
      }
    }
    return count;
  }
  return 0;
}
