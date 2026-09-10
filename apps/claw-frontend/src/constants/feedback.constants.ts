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

// Sits just outside the launcher's own top-end corner. Deliberately not part
// of `FEEDBACK_LAUNCHER_CLASSES`: that string is `fixed`, and this handle only
// needs to be `absolute` against the launcher's own box.
//
// `icon-xs`'s own `touch:min-h-11 touch:min-w-11` (the 44px WCAG touch-target
// floor every other icon button wants) targets `min-height`/`min-width`, a
// different property than this string's `h-6 w-6`, so `cn()`'s dedup never
// sees them as conflicting and both apply — on any touch-capable viewport the
// min-size wins and blows the handle up to 44px, big enough to cover most of
// the launcher itself. `touch:min-h-0 touch:min-w-0` targets that same
// property under the same variant, so it's what actually overrides it.
export const FEEDBACK_LAUNCHER_COLLAPSE_HANDLE_CLASSES =
  'absolute -end-2 -top-2 h-6 w-6 touch:min-h-0 touch:min-w-0 rounded-full border border-border bg-background p-0 shadow-sm hover:bg-accent';

// The auto-clearance system (see floating-action.constants.ts) keeps the
// launcher off whatever it can measure, but it can't know every element a
// page author cares about. This is the manual escape hatch: tucked mostly off
// the edge of the screen, it stops covering anything, and a tap or an
// edge-inward drag brings it back. Same vertical slot as the full launcher —
// only the horizontal `end` value differs — so it can't be composed from
// `FLOATING_ACTION_RAIL_SLOT_TWO` (mixing two `end-*` utilities on one
// element makes the winner a stylesheet-order accident, not a source-order
// certainty). `end` rather than `right`: this has to mirror in Arabic and
// Persian same as the launcher itself.
export const FEEDBACK_LAUNCHER_EDGE_TAB_CLASSES =
  'fixed end-[-1.6rem] bottom-[calc(max(calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)),var(--rail-obstacle-clearance,0px))+5.5rem)] md:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] z-40 flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-s-full border border-border bg-background/90 p-0 opacity-70 shadow-sm backdrop-blur-sm transition-[inset-inline-end,opacity] duration-normal ease-quint-out hover:end-[-0.8rem] hover:opacity-100 active:cursor-grabbing';

// Beyond this many pixels of inward drag, the edge tab counts as "pulled out"
// and expands — the same outcome as tapping it, just reachable as a swipe.
export const FEEDBACK_LAUNCHER_DRAG_EXPAND_THRESHOLD_PX = 24;

// Whether the launcher is tucked away is a per-device preference, not
// per-session state — a reader who hides it on a page that covers something
// should not have to hide it again on the next page load.
export const FEEDBACK_LAUNCHER_COLLAPSED_STORAGE_KEY = 'claw.feedbackLauncher.collapsed';

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
