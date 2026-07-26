import type {
  PublicSharedChatFooterProps,
  PublicSharedChatHeaderProps,
  PublicSharedMessageListPresentation,
} from '@/types/component.types';

/** Route params for the public shared-chat page. Next 16 delivers them async. */
export type PublicSharedChatPageParams = {
  params: Promise<{ publicShareId: string }>;
};

/** Input to the shared-chat JSON-LD builder. */
export type SharedChatJsonLdInput = {
  canonicalUrl: string;
  title: string;
  description: string | null;
  publishedAt: string;
  updatedAt: string;
};

/**
 * Everything the page renders, assembled once on the server.
 *
 * Built as a single view model rather than computed inline so the page component
 * stays pure render, and so the label/format decisions are unit-testable without
 * mounting a page.
 */
export type SharedChatViewModel = {
  headerProps: PublicSharedChatHeaderProps;
  messageListProps: PublicSharedMessageListPresentation;
  footerProps: PublicSharedChatFooterProps;
  jsonLd: SharedChatJsonLdInput;
  /** Canonical path of this share, passed to the ad units. */
  pathname: string;
  /** Accessible label for every ad container on the page. */
  adLabel: string;
};
