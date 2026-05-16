import { FileViewerRenderKind } from '@/enums/file-viewer-render-kind.enum';

// v3 round 11 — maps a MIME type to how the file viewer modal should
// render it. Kept out of the hook/component per the FE no-inline-util
// rule.
export function resolveRenderKind(mimeType: string): FileViewerRenderKind {
  const lower = mimeType.toLowerCase();
  if (lower.includes('pdf')) {
    return FileViewerRenderKind.PDF;
  }
  if (lower.startsWith('image/')) {
    return FileViewerRenderKind.IMAGE;
  }
  if (
    lower.startsWith('text/') ||
    lower.includes('json') ||
    lower.includes('csv') ||
    lower.includes('xml') ||
    lower.includes('javascript')
  ) {
    return FileViewerRenderKind.TEXT;
  }
  return FileViewerRenderKind.UNSUPPORTED;
}

// Cap the inline text preview so a huge CSV/log doesn't lock the tab.
const TEXT_PREVIEW_MAX = 200_000;

export function clampTextPreview(raw: string): string {
  if (raw.length <= TEXT_PREVIEW_MAX) {
    return raw;
  }
  return `${raw.slice(0, TEXT_PREVIEW_MAX)}\n… [truncated]`;
}
