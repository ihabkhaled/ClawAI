import {
  FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES,
  FEEDBACK_MAX_ATTACHMENTS,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES,
} from '@claw/shared-constants';
import { useCallback, useState } from 'react';

import { apiClient } from '@/services/shared/api-client';
import type { FeedbackAttachment } from '@/types';
import type { UseFeedbackAttachmentsReturn } from '@/types/feedback-hook.types';
import { readFileAsBase64, base64FromDataUrl } from '@/utilities/feedback-file.utility';

// Client-side validation here is convenience only — the server re-validates
// ownership, MIME and size on every attachment before a ticket is written.
export function useFeedbackAttachments(): UseFeedbackAttachmentsReturn {
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const validate = useCallback(
    (mimeType: string, sizeBytes: number, current: FeedbackAttachment[]): string | null => {
      if (current.length >= FEEDBACK_MAX_ATTACHMENTS) {
        return 'feedback.errors.tooManyFiles';
      }
      if (sizeBytes > FEEDBACK_MAX_ATTACHMENT_BYTES) {
        return 'feedback.errors.fileTooLarge';
      }
      if (!(FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
        return 'feedback.errors.unsupportedType';
      }
      const total = current.reduce((sum, item) => sum + item.sizeBytes, 0) + sizeBytes;
      if (total > FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES) {
        return 'feedback.errors.totalTooLarge';
      }
      return null;
    },
    [],
  );

  const upload = useCallback(
    async (
      filename: string,
      mimeType: string,
      sizeBytes: number,
      content: string,
      isScreenshot: boolean,
    ): Promise<void> => {
      setProgress((previous) => ({ ...previous, [filename]: 10 }));
      const response = await apiClient.post<{ id: string }>('/files/upload', {
        filename,
        mimeType,
        sizeBytes,
        content,
      });
      setProgress((previous) => ({ ...previous, [filename]: 100 }));
      setAttachments((previous) => [
        ...previous,
        { fileId: response.data.id, filename, mimeType, sizeBytes, isScreenshot },
      ]);
    },
    [],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      setUploadError(null);
      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          const problem = validate(file.type, file.size, attachments);
          if (problem !== null) {
            setUploadError(problem);
            continue;
          }
          try {
            const content = await readFileAsBase64(file);
            await upload(file.name, file.type, file.size, content, false);
          } catch {
            setUploadError('feedback.errors.uploadFailed');
          }
        }
      } finally {
        setIsUploading(false);
      }
    },
    [attachments, upload, validate],
  );

  const addDataUrl = useCallback(
    async (dataUrl: string, filename: string, isScreenshot: boolean): Promise<void> => {
      setUploadError(null);
      setIsUploading(true);
      try {
        const content = base64FromDataUrl(dataUrl);
        const sizeBytes = Math.ceil((content.length * 3) / 4);
        const problem = validate('image/png', sizeBytes, attachments);
        if (problem !== null) {
          setUploadError(problem);
          return;
        }
        await upload(filename, 'image/png', sizeBytes, content, isScreenshot);
      } catch {
        setUploadError('feedback.errors.uploadFailed');
      } finally {
        setIsUploading(false);
      }
    },
    [attachments, upload, validate],
  );

  const remove = useCallback((fileId: string): void => {
    setAttachments((previous) => previous.filter((item) => item.fileId !== fileId));
  }, []);

  const clear = useCallback((): void => {
    setAttachments([]);
    setProgress({});
    setUploadError(null);
  }, []);

  return { attachments, addFiles, addDataUrl, remove, clear, isUploading, uploadError, progress };
}
