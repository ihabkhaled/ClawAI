import { useCallback, useEffect, useRef, useState } from 'react';

import { FileViewerRenderKind } from '@/enums/file-viewer-render-kind.enum';
import { fetchWorkspaceObjectContent } from '@/repositories/workspace/workspace-object-content.repository';
import type { UseFileViewerResult, WorkspaceObjectContent } from '@/types/file-viewer.types';
import { clampTextPreview, resolveRenderKind } from '@/utilities/file-viewer.utility';

// v3 round 11 (2026-05-14) — Prompt 08: controller hook for the file
// viewer modal. Lazily fetches the blob when an object is opened,
// resolves how to render it, and revokes the object URL on close /
// unmount so blob memory isn't leaked.
export function useFileViewer(): UseFileViewerResult {
  const [openObjectId, setOpenObjectId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<WorkspaceObjectContent | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const lastBlobUrl = useRef<string | null>(null);

  const revoke = useCallback((): void => {
    if (lastBlobUrl.current !== null) {
      URL.revokeObjectURL(lastBlobUrl.current);
      lastBlobUrl.current = null;
    }
  }, []);

  const close = useCallback((): void => {
    revoke();
    setOpenObjectId(null);
    setContent(null);
    setTextPreview(null);
    setError(null);
    setIsLoading(false);
  }, [revoke]);

  const open = useCallback(
    (objectId: string, objectTitle: string): void => {
      revoke();
      setOpenObjectId(objectId);
      setTitle(objectTitle);
      setContent(null);
      setTextPreview(null);
      setError(null);
      setIsLoading(true);
      void fetchWorkspaceObjectContent(objectId)
        .then(async (fetched) => {
          lastBlobUrl.current = fetched.blobUrl;
          setContent(fetched);
          if (resolveRenderKind(fetched.mimeType) === FileViewerRenderKind.TEXT) {
            const raw = await fetch(fetched.blobUrl).then((r) => r.text());
            setTextPreview(clampTextPreview(raw));
          }
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e : new Error('File download failed'));
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [revoke],
  );

  // Revoke any outstanding object URL when the component unmounts.
  useEffect(() => revoke, [revoke]);

  return {
    openObjectId,
    open,
    close,
    title,
    content,
    textPreview,
    renderKind:
      content === null
        ? FileViewerRenderKind.UNSUPPORTED
        : resolveRenderKind(content.mimeType),
    isLoading,
    error,
  };
}
