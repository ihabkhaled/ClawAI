import type { ExtractionProfile } from '../enums/extraction-profile.enum';

export type ScrapeInput = {
  html: string;
  url: string;
  profile: ExtractionProfile;
};

/**
 * Structured output of one extraction pass. `text` is the plain-text
 * body the LLM can read; `structured` holds profile-specific details
 * (headings, tables, etc.) that a future UI can render.
 */
export type ScrapeOutput = {
  profile: ExtractionProfile;
  title: string | null;
  text: string;
  structured: Record<string, unknown>;
  warnings: string[];
};
