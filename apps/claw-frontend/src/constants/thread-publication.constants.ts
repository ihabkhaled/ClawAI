import { ThreadPublicationType } from '@claw/shared-types';

import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type { ThreadReportReason } from '@/types/thread-publication.types';

export const THREAD_PUBLICATION_OPTIONS = [
  { value: ThreadPublicationType.ARTICLE, translationKey: 'threadTypeArticle' },
  { value: ThreadPublicationType.RESEARCH_ARTICLE, translationKey: 'threadTypeResearchArticle' },
  { value: ThreadPublicationType.GUIDE, translationKey: 'threadTypeGuide' },
  {
    value: ThreadPublicationType.TECHNICAL_EXPLANATION,
    translationKey: 'threadTypeTechnicalExplanation',
  },
] as const;

export type { ThreadPublicationType } from '@claw/shared-types';

export const THREAD_REPORT_REASONS: ThreadReportReason[] = Object.values(
  ThreadPublicationReportReason,
);
