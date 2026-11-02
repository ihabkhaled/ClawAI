import type { Locale } from '@claw/shared-types';

export type TranslationModelStyle = 'OPENAI_COMPAT' | 'OLLAMA_NATIVE';

export type TranslationModelRef = {
  /** The connector provider the key and base URL come from. */
  connector: string;
  style: TranslationModelStyle;
  model: string;
};

/** One (publication, language) pair that has no current translation. */
export type TranslationTarget = {
  publicationId: string;
  locale: Locale;
  sourceLocale: Locale;
  revision: number;
};

/** The served revision as readers see it: citation markers already resolved. */
export type TranslationSource = { title: string; markdown: string };

export type TranslatedThread = { title: string; markdown: string; model: string };

export type ReadyTranslation = { title: string; markdown: string };

export type TranslatedSitemapItem = { slug: string; translatedAt: Date };

/** One row of the due query before its strings become typed values. */
export type DueTranslationRow = {
  publicationId: string;
  locale: string;
  sourceLocale: string;
  revision: number;
};

export type TranslationPassCounts = { claimed: number; ready: number; failed: number };
