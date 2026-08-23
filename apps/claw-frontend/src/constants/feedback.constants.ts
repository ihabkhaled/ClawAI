import { FeedbackType } from '@claw/shared-types';

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
