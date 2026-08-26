import { FeedbackStatus, FeedbackType } from '@claw/shared-types';

import {
  FLOATING_ACTION_DESKTOP_BOTTOM,
  FLOATING_ACTION_RAIL_SLOT_TWO,
} from '@/constants/floating-action.constants';
import { ScreenCaptureStatus } from '@/enums';

export const FEEDBACK_TYPE_OPTIONS: readonly { value: FeedbackType; labelKey: string }[] = [
  { value: FeedbackType.BUG_REPORT, labelKey: 'feedback.types.bugReport' },
  { value: FeedbackType.GENERAL_FEEDBACK, labelKey: 'feedback.types.generalFeedback' },
  { value: FeedbackType.FEATURE_REQUEST, labelKey: 'feedback.types.featureRequest' },
  { value: FeedbackType.UI_UX, labelKey: 'feedback.types.uiUx' },
  { value: FeedbackType.PERFORMANCE, labelKey: 'feedback.types.performance' },
  { value: FeedbackType.DATA_ISSUE, labelKey: 'feedback.types.dataIssue' },
  { value: FeedbackType.INTEGRATION_ISSUE, labelKey: 'feedback.types.integrationIssue' },
  { value: FeedbackType.DOCUMENTATION, labelKey: 'feedback.types.documentation' },
  { value: FeedbackType.SECURITY_CONCERN, labelKey: 'feedback.types.securityConcern' },
  { value: FeedbackType.OTHER, labelKey: 'feedback.types.other' },
] as const;

// Below this, an attachment rendered at its natural size reads as a blank
// panel rather than as an image, so the viewer scales it up instead.
export const TINY_IMAGE_PIXEL_THRESHOLD = 64;

/**
 * How long to wait for the shared surface to paint its first frame.
 *
 * `loadedmetadata` only means the dimensions are known; drawing at that moment
 * captures a blank frame. The capture waits for real pixels instead, and this
 * bound is what stops it waiting forever when they never arrive.
 */
export const SCREEN_CAPTURE_FRAME_TIMEOUT_MS = 5000;

export const FEEDBACK_ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

// Slot two on the mobile rail. Slot one belongs to whatever action the page
// itself pins to that corner — on the chats page that is the "new thread" FAB,
// which this launcher used to cover exactly.
export const FEEDBACK_LAUNCHER_CLASSES = `${FLOATING_ACTION_RAIL_SLOT_TWO} z-40 ${FLOATING_ACTION_DESKTOP_BOTTOM}`;

// The API reports per-status counts keyed by the FeedbackStatus enum name, and
// the status filter is sent back the same way. The tabs used lowercase labels
// as their values, so every tab filtered on a status the server did not know
// and the counts rendered empty.
export const FEEDBACK_STATUS_TABS: readonly { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'feedback.admin.status.all' },
  { value: FeedbackStatus.OPEN, labelKey: 'feedback.admin.status.open' },
  { value: FeedbackStatus.IN_PROGRESS, labelKey: 'feedback.admin.status.inProgress' },
  { value: FeedbackStatus.RESOLVED, labelKey: 'feedback.admin.status.resolved' },
  { value: FeedbackStatus.CLOSED, labelKey: 'feedback.admin.status.closed' },
  { value: FeedbackStatus.ARCHIVED, labelKey: 'feedback.admin.status.archived' },
];

/**
 * Message key per capture outcome.
 *
 * Cancelling the picker maps to null on purpose: the user chose to stop, and
 * answering their own decision with "capture unavailable" is both wrong and
 * alarming. Only a genuinely broken or unsupported capture says anything.
 */
export const SCREEN_CAPTURE_ERROR_KEYS: Readonly<Record<ScreenCaptureStatus, string | null>> = {
  [ScreenCaptureStatus.CAPTURED]: null,
  [ScreenCaptureStatus.CANCELLED]: null,
  [ScreenCaptureStatus.UNSUPPORTED]: 'feedback.screenshot.unsupported',
  [ScreenCaptureStatus.FAILED]: 'feedback.screenshot.failed',
};
