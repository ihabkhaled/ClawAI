import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Ban, CheckCircle2, CloudUpload, Hourglass, Loader2 } from 'lucide-react';

import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';

/** Visible state word per chip. Exhaustive: a new state without copy fails typecheck. */
export const COMPOSER_ATTACHMENT_STATE_LABEL_KEYS: Readonly<
  Record<ComposerAttachmentState, string>
> = {
  [ComposerAttachmentState.Uploading]: 'mediaUi.attachmentState.uploading',
  [ComposerAttachmentState.Uploaded]: 'mediaUi.attachmentState.uploaded',
  [ComposerAttachmentState.Processing]: 'mediaUi.attachmentState.processing',
  [ComposerAttachmentState.Ready]: 'mediaUi.attachmentState.ready',
  [ComposerAttachmentState.Failed]: 'mediaUi.attachmentState.failed',
  [ComposerAttachmentState.Unsupported]: 'mediaUi.attachmentState.unsupported',
};

/**
 * A distinct glyph per state next to the state WORD — the chip is never read
 * by colour alone. Uploading spins; processing is an hourglass, deliberately
 * not a spinner, because it can take minutes and sending is still allowed.
 */
export const COMPOSER_ATTACHMENT_STATE_ICONS: Readonly<
  Record<ComposerAttachmentState, LucideIcon>
> = {
  [ComposerAttachmentState.Uploading]: Loader2,
  [ComposerAttachmentState.Uploaded]: CloudUpload,
  [ComposerAttachmentState.Processing]: Hourglass,
  [ComposerAttachmentState.Ready]: CheckCircle2,
  [ComposerAttachmentState.Failed]: AlertTriangle,
  [ComposerAttachmentState.Unsupported]: Ban,
};

/** States whose chip draws in the destructive tone (text + icon carry it too). */
export const COMPOSER_ATTACHMENT_PROBLEM_STATES: ReadonlySet<ComposerAttachmentState> = new Set([
  ComposerAttachmentState.Failed,
  ComposerAttachmentState.Unsupported,
]);

export const COMPOSER_ATTACHMENT_LIST_LABEL_KEY = 'mediaUi.attachmentState.listLabel';
export const COMPOSER_ATTACHMENT_REMOVE_KEY = 'mediaUi.attachmentState.remove';
export const COMPOSER_ATTACHMENT_PROCESSING_HINT_KEY = 'mediaUi.attachmentState.processingHint';
export const COMPOSER_ATTACHMENT_UPLOAD_FAILED_KEY = 'mediaUi.attachmentState.uploadFailedReason';
export const COMPOSER_ATTACHMENT_PROCESSING_FAILED_KEY =
  'mediaUi.attachmentState.processingFailedReason';
export const COMPOSER_ATTACHMENT_UNSUPPORTED_KEY = 'mediaUi.attachmentState.unsupportedReason';
export const COMPOSER_ATTACHMENT_UNNAMED_KEY = 'chat.attachedFile';
/** HTTP 415: the upload was refused for its type, not for a transient reason. */
export const COMPOSER_ATTACHMENT_UNSUPPORTED_STATUS = 415;
