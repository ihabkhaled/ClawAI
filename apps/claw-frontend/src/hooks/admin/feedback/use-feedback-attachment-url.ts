import { useEffect, useState } from 'react';

import { feedbackAdminRepository } from '@/repositories/feedback/feedback-admin.repository';

/**
 * Resolves a feedback attachment to a displayable object URL.
 *
 * The attachment endpoint is permission-gated, and a plain `<img src>` cannot
 * send the Bearer token — the browser issues that request with no Authorization
 * header, so it answered 401 and every thumbnail rendered as a broken image.
 * Fetching the bytes through the repository attaches the token; the blob then
 * becomes an object URL that the browser can display.
 *
 * The URL is revoked when the component unmounts or the attachment changes, so
 * opening a long triage session does not leak one blob per thumbnail.
 */
export function useFeedbackAttachmentUrl(ticketId: string, fileId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const blob = await feedbackAdminRepository.fetchAttachmentBlob(ticketId, fileId);
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        // A missing or unreadable attachment must not break the dialog; the
        // caller renders its fallback instead.
        if (!cancelled) {
          setUrl(null);
        }
      }
    };

    void load();

    return (): void => {
      cancelled = true;
      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, ticketId]);

  return url;
}
