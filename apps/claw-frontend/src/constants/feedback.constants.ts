import { FeedbackStatus, FeedbackType } from '@claw/shared-types';

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

export const FEEDBACK_ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

export const FEEDBACK_LAUNCHER_CLASSES =
  'fixed right-4 z-40 bottom-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] md:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]';

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
