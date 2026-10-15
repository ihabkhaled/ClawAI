/** Owner-asked "Improve formatting with AI" preview of a Thread's article (ADR-189). */
export type ThreadFormatPreviewStatus = 'FORMATTED' | 'SKIPPED';

export type ThreadFormatPreview = {
  /** The revision whose text was typeset; the new text is saved as an edit of it. */
  revisionId: string;
  status: ThreadFormatPreviewStatus;
  /** A `FORMAT_*` machine code when SKIPPED (the text is unchanged); null when FORMATTED. */
  code: string | null;
  /** The Thread's own language, for direction and reading time of the preview. */
  contentLocale: string;
  /** The text of that revision as it is now: the "before" side of the comparison. */
  originalMarkdown: string;
  /** The typeset article, or the unchanged one when SKIPPED. */
  markdown: string;
  citations: Array<{ evidenceId: string; url: string }>;
  /** Passes this Thread may still run today. */
  remainingToday: number;
};
