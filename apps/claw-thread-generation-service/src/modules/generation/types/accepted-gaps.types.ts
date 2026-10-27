/** A review's blockers split by the owner's accepted evidence gaps (ADR-194). */
export type AcceptedGapSplit = { waived: string[]; remaining: string[] };

/** A Markdown section under a limitations heading: its heading level and its non-empty lines. */
export type MarkdownSection = { level: number; items: string[] };
