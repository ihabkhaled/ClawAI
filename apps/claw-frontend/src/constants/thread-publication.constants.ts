import { ThreadPublicationType } from '@claw/shared-types';

import { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type { ThreadExportOption } from '@/types/thread-export.types';
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

/** Revision review states after which the owner can edit or publish again. */
export const THREAD_REVISION_TERMINAL_STATUSES: string[] = [
  'FAILED',
  'CANCELLED',
  'STALE',
  'REVIEW_REQUIRED',
];

/** The type of the ZIP archive that carries several exported formats at once. */
export const THREAD_ZIP_MIME = 'application/zip';

/** File type and extension for each owner export. */
export const THREAD_EXPORT_FILES = {
  markdown: { mime: 'text/markdown;charset=utf-8', extension: 'md' },
  json: { mime: 'application/json;charset=utf-8', extension: 'json' },
  toon: { mime: 'text/plain;charset=utf-8', extension: 'toon' },
  html: { mime: 'text/html;charset=utf-8', extension: 'html' },
  text: { mime: 'text/plain;charset=utf-8', extension: 'txt' },
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

/** What the owner can download: the service's own formats plus two built in the browser. */
export const THREAD_OWNER_EXPORT_OPTIONS: readonly ThreadExportOption[] = [
  { format: ThreadPublicationExportFormat.Markdown, labelKey: 'chat.threadExportMarkdown' },
  { format: ThreadPublicationExportFormat.Json, labelKey: 'chat.threadExportJson' },
  { format: ThreadPublicationExportFormat.Toon, labelKey: 'chat.threadExportToon' },
  { format: ThreadPublicationExportFormat.Html, labelKey: 'chat.threadExportHtml' },
  { format: ThreadPublicationExportFormat.Text, labelKey: 'chat.threadExportText' },
];

/** What a reader can download from a public Thread. Everything is built from the page itself. */
export const THREAD_PUBLIC_EXPORT_OPTIONS: readonly ThreadExportOption[] = [
  { format: ThreadPublicationExportFormat.Markdown, labelKey: 'chat.threadExportMarkdown' },
  { format: ThreadPublicationExportFormat.Json, labelKey: 'chat.threadExportJson' },
  { format: ThreadPublicationExportFormat.Html, labelKey: 'chat.threadExportHtml' },
  { format: ThreadPublicationExportFormat.Text, labelKey: 'chat.threadExportText' },
];
