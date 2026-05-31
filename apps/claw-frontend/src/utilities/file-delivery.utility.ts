import { FileDeliveryMode } from '@/enums';
import type {
  ChatMessage,
  FileDeliveryCounts,
  FileDeliveryEntry,
  FileDeliveryTranslator,
} from '@/types';

// Group a flat FileDeliveryEntry[] by delivery mode so the chip can render
// one badge per non-zero count. Pure function — no i18n, no React.
export function countFileDeliveriesByMode(delivery: FileDeliveryEntry[]): FileDeliveryCounts {
  const counts: FileDeliveryCounts = {
    extracted: 0,
    image: 0,
    skipped: 0,
    unsupported: 0,
    truncated: 0,
  };
  for (const entry of delivery) {
    if (entry.mode === FileDeliveryMode.EXTRACTED_TEXT) {
      counts.extracted++;
    } else if (entry.mode === FileDeliveryMode.NATIVE_IMAGE) {
      counts.image++;
    } else if (entry.mode === FileDeliveryMode.OMITTED_NO_VISION) {
      counts.skipped++;
    } else if (entry.mode === FileDeliveryMode.OMITTED_UNSUPPORTED) {
      counts.unsupported++;
    } else if (entry.mode === FileDeliveryMode.TRUNCATED_TEXT) {
      counts.truncated++;
    }
  }
  return counts;
}

// Resolve the i18n-translated mode label for a single delivery entry.
export function getFileDeliveryModeLabel(
  mode: FileDeliveryMode,
  t: FileDeliveryTranslator,
): string {
  if (mode === FileDeliveryMode.EXTRACTED_TEXT) {
    return t('compare.delivery.extractedText');
  }
  if (mode === FileDeliveryMode.NATIVE_IMAGE) {
    return t('compare.delivery.nativeImage');
  }
  if (mode === FileDeliveryMode.OMITTED_NO_VISION) {
    return t('compare.delivery.omittedNoVision');
  }
  if (mode === FileDeliveryMode.OMITTED_UNSUPPORTED) {
    return t('compare.delivery.omittedUnsupported');
  }
  return t('compare.delivery.truncatedText');
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
    const reasonSuffix = entry.reason && entry.reason.length > 0 ? ` — ${entry.reason}` : '';
    return `${entry.filename} (${modeLabel})${reasonSuffix}`;
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
    if (
      mode !== FileDeliveryMode.EXTRACTED_TEXT &&
      mode !== FileDeliveryMode.NATIVE_IMAGE &&
      mode !== FileDeliveryMode.OMITTED_NO_VISION &&
      mode !== FileDeliveryMode.OMITTED_UNSUPPORTED &&
      mode !== FileDeliveryMode.TRUNCATED_TEXT
    ) {
      continue;
    }
    const fileId = candidate['fileId'];
    const filename = candidate['filename'];
    const mimeType = candidate['mimeType'];
    const provider = candidate['provider'];
    const model = candidate['model'];
    const reason = candidate['reason'];
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
    });
  }
  return entries.length > 0 ? entries : undefined;
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
