import { RoutingMode } from '../../../generated/prisma';
import type { FileContentResponse } from '../types/context.types';

// Routing modes that MUST NOT exfiltrate image attachments to a cloud provider.
// In these modes, image files are only allowed when a local vision-capable
// model is installed (so the multimodal request can be served locally).
const LOCAL_OR_PRIVACY_MODES: ReadonlySet<RoutingMode> = new Set([
  RoutingMode.LOCAL_ONLY,
  RoutingMode.PRIVACY_FIRST,
]);

const IMAGE_MIME_PREFIX = 'image/';

// Returns whether the caller is permitted to use ANY attachments at all under
// the supplied routingMode. Today the only mode-driven veto is image-specific
// (see filterImagesForLocalOnly); text attachments are always permitted. We
// expose this as a separate signal so future modes (e.g. a hypothetical
// AIR_GAP mode) can short-circuit before reaching the per-file classifier.
//
// `hasLocalVisionModel` is the result of LocalModelSelectionService
// .hasLocalVisionModel(); `allowOverride` is the operator escape hatch wired
// from AppConfig.ALLOW_LOCAL_ONLY_ATTACHMENTS_WITHOUT_VISION.
export function canUseAttachments(
  routingMode: RoutingMode,
  hasLocalVisionModel: boolean,
  allowOverride: boolean,
): boolean {
  if (!LOCAL_OR_PRIVACY_MODES.has(routingMode)) {
    return true;
  }
  if (allowOverride) {
    return true;
  }
  return hasLocalVisionModel;
}

// Splits the supplied fileContents into `kept` (passed through) and `dropped`
// (filtered out because the routing mode forbids cloud delivery of images AND
// no local vision model is installed AND the operator override is off). Only
// image/* mime types are ever dropped; text-like content always survives.
//
// Callers should emit a user-visible warning when `dropped` is non-empty so
// the FE can surface a chip explaining why images were stripped.
export function filterImagesForLocalOnly(
  files: FileContentResponse[],
  routingMode: RoutingMode,
  hasLocalVisionModel: boolean,
  allowOverride: boolean,
): { kept: FileContentResponse[]; dropped: FileContentResponse[] } {
  if (!LOCAL_OR_PRIVACY_MODES.has(routingMode)) {
    return { kept: files, dropped: [] };
  }
  if (hasLocalVisionModel || allowOverride) {
    return { kept: files, dropped: [] };
  }

  const kept: FileContentResponse[] = [];
  const dropped: FileContentResponse[] = [];
  for (const file of files) {
    const mime = (file.mimeType ?? '').toLowerCase();
    if (mime.startsWith(IMAGE_MIME_PREFIX)) {
      dropped.push(file);
    } else {
      kept.push(file);
    }
  }
  return { kept, dropped };
}
