// v3 round 11 (2026-05-14) — Prompt 08: file viewer modal types.

import type { FileViewerRenderKind } from '@/enums/file-viewer-render-kind.enum';

export type WorkspaceObjectContent = {
  blobUrl: string;
  mimeType: string;
  filename: string;
  sizeBytes: number;
};

export type UseFileViewerResult = {
  // The object currently being viewed; null when the modal is closed.
  openObjectId: string | null;
  open: (objectId: string, title: string) => void;
  close: () => void;

  title: string;
  content: WorkspaceObjectContent | null;
  textPreview: string | null;
  renderKind: FileViewerRenderKind;
  isLoading: boolean;
  error: Error | null;
};

export type FileViewerModalProps = {
  openObjectId: string | null;
  title: string;
  content: WorkspaceObjectContent | null;
  textPreview: string | null;
  renderKind: FileViewerRenderKind;
  isLoading: boolean;
  error: Error | null;
  onClose: () => void;
  labels: {
    loading: string;
    error: string;
    unsupported: string;
    download: string;
    close: string;
  };
};
