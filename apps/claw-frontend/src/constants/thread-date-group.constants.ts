// Maps the four `ThreadDateGroup` enum values to the localized i18n keys used
// as section headers in the chat thread list. Lives here (not inline in the
// component) so the component file stays render-only per the ESLint
// no-module-const-in-tsx rule, and so the labels can be reused if we ever
// surface the same groups in a different context (e.g. the global search
// results dropdown).
import { ThreadDateGroup } from '@/enums';

export const THREAD_DATE_GROUP_LABEL_KEYS: Record<ThreadDateGroup, string> = {
  [ThreadDateGroup.TODAY]: 'chat.groups.today',
  [ThreadDateGroup.YESTERDAY]: 'chat.groups.yesterday',
  [ThreadDateGroup.THIS_WEEK]: 'chat.groups.thisWeek',
  [ThreadDateGroup.OLDER]: 'chat.groups.older',
};
