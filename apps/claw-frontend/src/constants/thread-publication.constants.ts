import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type { ThreadReportReason } from '@/types/thread-publication.types';

export const THREAD_PUBLICATION_OPTIONS = [
  { value: 'article', translationKey: 'threadTypeArticle' },
  { value: 'research-article', translationKey: 'threadTypeResearchArticle' },
  { value: 'guide', translationKey: 'threadTypeGuide' },
  { value: 'technical-explanation', translationKey: 'threadTypeTechnicalExplanation' },
] as const;

export type ThreadPublicationType = (typeof THREAD_PUBLICATION_OPTIONS)[number]['value'];

export const THREAD_REPORT_REASONS: ThreadReportReason[] = Object.values(
  ThreadPublicationReportReason,
);
