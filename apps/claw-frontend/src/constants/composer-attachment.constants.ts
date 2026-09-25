import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleStop,
  CloudUpload,
  Hourglass,
  Loader2,
} from 'lucide-react';

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
  [ComposerAttachmentState.Cancelled]: 'mediaUi.attachmentState.cancelled',
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
  [ComposerAttachmentState.Cancelled]: CircleStop,
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
/** The note under a video whose processing the owner stopped. */
export const COMPOSER_ATTACHMENT_CANCELLED_HINT_KEY = 'mediaUi.attachmentState.cancelledHint';
/** The visible "Stop processing" action on a video still processing (pack §72). */
export const COMPOSER_ATTACHMENT_CANCEL_PROCESSING_KEY = 'mediaUi.attachmentState.cancelProcessing';
/** Its accessible name, naming the file. */
export const COMPOSER_ATTACHMENT_CANCEL_PROCESSING_ARIA_KEY =
  'mediaUi.attachmentState.cancelProcessingAria';
/** While the stop request is in flight. */
export const COMPOSER_ATTACHMENT_CANCELLING_KEY = 'mediaUi.attachmentState.cancelling';
/** Only a video's processing can be stopped (audio transcription is one short call). */
export const COMPOSER_CANCELLABLE_MIME_PREFIX = 'video/';
/** HTTP 415: the upload was refused for its type, not for a transient reason. */
export const COMPOSER_ATTACHMENT_UNSUPPORTED_STATUS = 415;

/**
 * The most files one message may carry.
 *
 * The same number chat-service enforces as `MAX_ATTACHMENTS_PER_REQUEST`
 * (`apps/claw-chat-service/.../constants/attachment.constants.ts`). The
 * composer used to accept 13 and let the server answer the eleventh with a
 * bare "Validation failed"; now the eleventh is refused here, with a message
 * a user can act on. Pinned to the server's value by
 * `constants/__tests__/composer-attachment.constants.test.ts`.
 */
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

/** The drop handler of a surface with no composer: the zone is inert. */
export const NOOP_FILE_INGEST = (): void => undefined;
