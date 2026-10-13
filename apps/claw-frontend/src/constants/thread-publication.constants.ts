import { ThreadPublicationType } from '@claw/shared-types';

import type { BadgeProps } from '@/components/ui/badge';
import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
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

/**
 * Label key per report reason. A literal map, not a template string: `t()` returns the key itself
 * when it does not resolve, so a dropped `chat.` prefix shows up on screen as raw text. The
 * translation-keys test reads these literals.
 */
export const THREAD_REPORT_REASON_LABEL_KEYS: Readonly<Record<ThreadReportReason, string>> = {
  [ThreadPublicationReportReason.Spam]: 'chat.threadPublicReportSPAM',
  [ThreadPublicationReportReason.Abuse]: 'chat.threadPublicReportABUSE',
  [ThreadPublicationReportReason.PrivateInformation]: 'chat.threadPublicReportPRIVATE_INFORMATION',
  [ThreadPublicationReportReason.UnsafeContent]: 'chat.threadPublicReportUNSAFE_CONTENT',
  [ThreadPublicationReportReason.Other]: 'chat.threadPublicReportOTHER',
};

/** Label key per reader-suggestion status, for the same reason as the report reasons above. */
export const THREAD_CHANGE_REQUEST_STATUS_LABEL_KEYS: Readonly<
  Record<ThreadPublicationChangeRequestStatus, string>
> = {
  [ThreadPublicationChangeRequestStatus.Pending]: 'chat.threadChangeRequestPENDING',
  [ThreadPublicationChangeRequestStatus.Accepted]: 'chat.threadChangeRequestACCEPTED',
  [ThreadPublicationChangeRequestStatus.Rejected]: 'chat.threadChangeRequestREJECTED',
};

/**
 * Badge look per reader-suggestion status. The shared warning and success badges put the bright
 * status token on a pale tint (about 2:1 in the light theme), so these pair a dark shade with the
 * tint for light mode and keep the token pair for dark mode.
 */
export const THREAD_CHANGE_REQUEST_STATUS_BADGES: Readonly<
  Record<
    ThreadPublicationChangeRequestStatus,
    { variant: NonNullable<BadgeProps['variant']>; className: string }
  >
> = {
  [ThreadPublicationChangeRequestStatus.Pending]: {
    variant: 'outline',
    className:
      'border-amber-600/40 bg-amber-100 text-amber-900 dark:border-warning/40 dark:bg-warning-surface dark:text-warning',
  },
  [ThreadPublicationChangeRequestStatus.Accepted]: {
    variant: 'outline',
    className:
      'border-green-600/40 bg-green-100 text-green-900 dark:border-success/40 dark:bg-success-surface dark:text-success',
  },
  [ThreadPublicationChangeRequestStatus.Rejected]: { variant: 'secondary', className: '' },
};

/** Where this browser remembers a signed-in reader's own reaction, per user and Thread. */
export const THREAD_VIEWER_REACTION_STORAGE_PREFIX = 'claw.thread-reaction:';

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

/** Volunteer or best-effort providers: offered, but never chosen as a default or a fallback. */
export const THREAD_DEPRIORITIZED_PROVIDERS = ['AI_HORDE'];

/** Backup models each role may fall back to when its own model fails. */
export const THREAD_FALLBACKS_PER_ROLE = 2;

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
