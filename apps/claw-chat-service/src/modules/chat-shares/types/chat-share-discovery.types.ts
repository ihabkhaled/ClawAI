import type { Locale } from '@claw/shared-types';

export type SitemapCursor = {
  updatedAt: Date;
  id: string;
};

export type PublicChatDiscoveryRow = {
  id: string;
  publicShareId: string;
  contentLocale: string;
  title: string;
  description: string | null;
  publishedAt: Date;
  updatedAt: Date;
};

export type PublicChatSitemapEntry = {
  publicShareId: string;
  contentLocale: Locale;
  updatedAt: string;
};

export type PublicChatSitemapPage = {
  items: PublicChatSitemapEntry[];
  nextCursor: string | null;
};

export type PublicChatSitemapCount = {
  locale: Locale;
  count: number;
};

export type PublicChatRssEntry = {
  publicShareId: string;
  contentLocale: Locale;
  title: string;
  description: string | null;
  publishedAt: string;
  updatedAt: string;
};
