import { useCallback, useEffect, useRef, useState } from 'react';

import { ATTACHMENT_TEXT_PREVIEW_MAX_CHARS } from '@/constants/attachment-preview.constants';
import { AttachmentPendingAction } from '@/enums/attachment-pending-action.enum';
import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import { useAuthenticatedFileBlob } from '@/hooks/chat/use-authenticated-file-blob';
import { useTranslation } from '@/lib/i18n';
import type { UseAttachmentFilePreviewReturn } from '@/types/attachment-preview.types';
import { openBlobInNewTab, triggerBrowserDownload } from '@/utilities/download-blob.utility';

/**
 * A PDF, a text-like file, or anything else with no in-app viewer, under a
 * sent message. Nothing downloads until the user asks: a PDF opens in the
 * browser's native viewer, a text-like file additionally gets a truncated
 * inline preview, everything else is a plain download — never a broken
 * placeholder pretending to be an image.
 */
export function useAttachmentFilePreview(
  fileId: string,
  filename: string,
  kind: AttachmentPreviewKind.Pdf | AttachmentPreviewKind.Text | AttachmentPreviewKind.Generic,
  mimeType?: string,
): UseAttachmentFilePreviewReturn {
  const { t } = useTranslation();
  const { blobUrl, isLoading, error, load } = useAuthenticatedFileBlob(
    `/api/v1/files/download/${fileId}`,
    false,
  );
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isPreviewTruncated, setIsPreviewTruncated] = useState(false);
  const pendingActionRef = useRef<AttachmentPendingAction | null>(null);

  useEffect(() => {
    if (kind !== AttachmentPreviewKind.Text || blobUrl === null) {
      return;
    }
    let cancelled = false;
    void fetch(blobUrl)
      .then((response) => response.text())
      .then((text) => {
        if (cancelled) {
          return;
        }
        setIsPreviewTruncated(text.length > ATTACHMENT_TEXT_PREVIEW_MAX_CHARS);
        setPreviewText(text.slice(0, ATTACHMENT_TEXT_PREVIEW_MAX_CHARS));
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewText(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [blobUrl, kind]);

  useEffect(() => {
    if (blobUrl === null || pendingActionRef.current === null) {
      return;
    }
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action === AttachmentPendingAction.View) {
      openBlobInNewTab(blobUrl);
    } else {
      triggerBrowserDownload(blobUrl, filename, mimeType);
    }
  }, [blobUrl, filename, mimeType]);

  const view = useCallback((): void => {
    if (blobUrl !== null) {
      openBlobInNewTab(blobUrl);
      return;
    }
    pendingActionRef.current = AttachmentPendingAction.View;
    load();
  }, [blobUrl, load]);

  const download = useCallback((): void => {
    if (blobUrl !== null) {
      triggerBrowserDownload(blobUrl, filename, mimeType);
      return;
    }
    pendingActionRef.current = AttachmentPendingAction.Download;
    load();
  }, [blobUrl, filename, mimeType, load]);

  return { t, isLoading, error, previewText, isPreviewTruncated, view, download };
}
