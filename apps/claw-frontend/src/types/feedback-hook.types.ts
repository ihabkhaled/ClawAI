import type { UseFormReturn } from 'react-hook-form';

import type { FeedbackFormValues } from '@/lib/validation/feedback.schema';
import type {
  FeedbackAttachment,
  FeedbackPageContext,
  FeedbackTicket,
} from '@/types/feedback.types';

export type UseFeedbackAttachmentsReturn = {
  attachments: FeedbackAttachment[];
  addFiles: (files: FileList | File[]) => Promise<void>;
  addDataUrl: (dataUrl: string, filename: string, isScreenshot: boolean) => Promise<void>;
  remove: (fileId: string) => void;
  clear: () => void;
  isUploading: boolean;
  uploadError: string | null;
  progress: Record<string, number>;
};

export type UseScreenshotCaptureReturn = {
  capture: () => Promise<void>;
  screenshot: string | null;
  clear: () => void;
  isCapturing: boolean;
  error: string | null;
};

export type UseFeedbackFormReturn = {
  form: UseFormReturn<FeedbackFormValues>;
  submit: (attachments: FeedbackAttachment[], pageContext: FeedbackPageContext) => void;
  isSubmitting: boolean;
  submitError: string | null;
};

export type UseAdminFeedbackDetailReturn = {
  ticket: FeedbackTicket | null;
  isLoading: boolean;
  changeStatus: (status: string, note?: string) => void;
  isChanging: boolean;
  changeError: string | null;
};
