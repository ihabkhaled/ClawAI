import type { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';

import type { UploadedFile, VideoMediaSummary } from './file.types';
import type { TranslateFunction } from './i18n.types';

// ─── Hooks ───────────────────────────────────────────────────────────────────

export type UseAttachmentFileMetaReturn = {
  file: UploadedFile | undefined;
  isLoading: boolean;
  isError: boolean;
};

export type UseAuthenticatedFileBlobReturn = {
  blobUrl: string | null;
  /** The fetched bytes. Read text with `blob.text()` — never `fetch(blobUrl)`,
   * which is a connect-src request the CSP does not (and should not) allow. */
  blob: Blob | null;
  isLoading: boolean;
  error: Error | null;
  load: () => void;
};

export type UseAttachmentMediaPreviewReturn = {
  t: TranslateFunction;
  blobUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  hasStarted: boolean;
  play: () => void;
  /** Saves the loaded note under its real name and extension. */
  download: () => void;
  /** `data:` URL of the video's stored thumbnail; null when absent or unsafe. */
  posterSrc: string | null;
  /** Localized length label ("Length 00:42"); null when the duration is unknown. */
  durationLabel: string | null;
  /** Localized alt text for the poster. */
  posterAlt: string;
};

export type UseAttachmentThumbnailReturn = {
  t: TranslateFunction;
  blobUrl: string | null;
  /** The download failed (404 past retention, 401, network) or the bytes did not decode. */
  isUnavailable: boolean;
  handleImageError: () => void;
};

export type UseAttachmentFilePreviewReturn = {
  t: TranslateFunction;
  isLoading: boolean;
  error: Error | null;
  previewText: string | null;
  isPreviewTruncated: boolean;
  view: () => void;
  download: () => void;
};

// ─── Components ──────────────────────────────────────────────────────────────

export type AttachmentUnavailableCardProps = {
  /** Display name; the generic "Attached file" label when metadata is gone too. */
  label: string;
  unavailableLabel: string;
};

export type AttachmentMediaPreviewProps = {
  fileId: string;
  filename: string;
  mimeType?: string;
  kind: AttachmentPreviewKind.Audio | AttachmentPreviewKind.Video;
  /** A processed video's probe facts; drives the poster thumbnail + length label. */
  media?: VideoMediaSummary | null;
};

export type AttachmentFilePreviewProps = {
  fileId: string;
  filename: string;
  mimeType: string;
  kind: AttachmentPreviewKind.Pdf | AttachmentPreviewKind.Text | AttachmentPreviewKind.Generic;
};
