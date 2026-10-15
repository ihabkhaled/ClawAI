import type { Locale } from '@claw/shared-types';

import type { FormatViolation as FormatViolationCodes } from '../constants/format-violation.constants';

export type FormatViolation = (typeof FormatViolationCodes)[keyof typeof FormatViolationCodes];

export type FormatGuardInput = {
  before: string;
  after: string;
  /** Evidence ids of the article's citations; their `[id]` markers must all survive. */
  evidenceIds: readonly string[];
  /** The article's citation urls: the only urls the formatted text may add. */
  citationUrls: readonly string[];
  locale: Locale;
};

export type MarkdownHeading = { level: number; text: string };
