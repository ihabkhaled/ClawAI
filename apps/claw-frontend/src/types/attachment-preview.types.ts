import type { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';

import type { UploadedFile } from './file.types';
import type { TranslateFunction } from './i18n.types';

// ─── Hooks ───────────────────────────────────────────────────────────────────

export type UseAttachmentFileMetaReturn = {
  file: UploadedFile | undefined;
  isLoading: boolean;
  isError: boolean;
};

export type UseAuthenticatedFileBlobReturn = {
  blobUrl: string | null;
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

export type AttachmentMediaPreviewProps = {
  fileId: string;
  filename: string;
  kind: AttachmentPreviewKind.Audio | AttachmentPreviewKind.Video;
};

export type AttachmentFilePreviewProps = {
  fileId: string;
  filename: string;
  mimeType: string;
  kind: AttachmentPreviewKind.Pdf | AttachmentPreviewKind.Text | AttachmentPreviewKind.Generic;
};
