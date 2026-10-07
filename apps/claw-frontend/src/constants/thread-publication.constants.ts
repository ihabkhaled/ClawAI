import { ThreadPublicationType } from '@claw/shared-types';

import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type { ThreadReportReason } from '@/types/thread-publication.types';

export const THREAD_PUBLICATION_OPTIONS = [
  { value: ThreadPublicationType.ARTICLE, translationKey: 'chat.threadTypeArticle' },
  {
    value: ThreadPublicationType.RESEARCH_ARTICLE,
    translationKey: 'chat.threadTypeResearchArticle',
  },
  { value: ThreadPublicationType.GUIDE, translationKey: 'chat.threadTypeGuide' },
  {
    value: ThreadPublicationType.TECHNICAL_EXPLANATION,
    translationKey: 'chat.threadTypeTechnicalExplanation',
  },
] as const;

export type { ThreadPublicationType } from '@claw/shared-types';

export const THREAD_REPORT_REASONS: ThreadReportReason[] = Object.values(
  ThreadPublicationReportReason,
);

/** File type and extension for each owner export. */
export const THREAD_EXPORT_FILES = {
  markdown: { mime: 'text/markdown;charset=utf-8', extension: 'md' },
  json: { mime: 'application/json;charset=utf-8', extension: 'json' },
  toon: { mime: 'text/plain;charset=utf-8', extension: 'toon' },
} as const;

/** Stable React keys for the three authors, the Judge and the Critic. */
export const THREAD_GENERATION_ROLE_KEYS = ['author-1', 'author-2', 'author-3', 'judge', 'critic'];

/** Providers tried first when choosing default Thread models, for provider diversity. */
export const THREAD_PREFERRED_PROVIDERS = [
  'ANTHROPIC',
  'OPENAI',
  'GEMINI',
  'GROK',
  'OLLAMA',
  'OPENROUTER',
];

/** Three authors, one Judge and one Critic. */
export const THREAD_GENERATION_MODEL_COUNT = 5;
