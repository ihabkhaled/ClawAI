import { FeedbackStatus, FeedbackType } from '@claw/shared-types';

// The dictionary keys are camelCase but the API speaks the enum names, so
// interpolating the raw value produced keys like `feedback.type.SECURITY_CONCERN`
// which have no entry and rendered as the key itself in the admin table.
const TYPE_LABEL_KEYS: Readonly<Record<string, string>> = {
  [FeedbackType.BUG_REPORT]: 'feedback.types.bugReport',
  [FeedbackType.GENERAL_FEEDBACK]: 'feedback.types.generalFeedback',
  [FeedbackType.FEATURE_REQUEST]: 'feedback.types.featureRequest',
  [FeedbackType.UI_UX]: 'feedback.types.uiUx',
  [FeedbackType.PERFORMANCE]: 'feedback.types.performance',
  [FeedbackType.DATA_ISSUE]: 'feedback.types.dataIssue',
  [FeedbackType.INTEGRATION_ISSUE]: 'feedback.types.integrationIssue',
  [FeedbackType.DOCUMENTATION]: 'feedback.types.documentation',
  [FeedbackType.SECURITY_CONCERN]: 'feedback.types.securityConcern',
  [FeedbackType.OTHER]: 'feedback.types.other',
};

const STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  [FeedbackStatus.OPEN]: 'feedback.admin.status.open',
  [FeedbackStatus.IN_PROGRESS]: 'feedback.admin.status.inProgress',
  [FeedbackStatus.RESOLVED]: 'feedback.admin.status.resolved',
  [FeedbackStatus.CLOSED]: 'feedback.admin.status.closed',
  [FeedbackStatus.ARCHIVED]: 'feedback.admin.status.archived',
};

export function feedbackTypeLabelKey(type: string): string {
  return TYPE_LABEL_KEYS[type] ?? 'feedback.types.other';
}

export function feedbackStatusLabelKey(status: string): string {
  return STATUS_LABEL_KEYS[status] ?? 'feedback.admin.status.open';
}
