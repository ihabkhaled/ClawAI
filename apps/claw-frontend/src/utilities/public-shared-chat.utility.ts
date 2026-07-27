import type { Metadata } from 'next';

import {
  SHARE_CHAT_PATH_PREFIX,
  SHARED_CHAT_INLINE_AD_AFTER_MESSAGES,
} from '@/constants/chat-share.constants';
import { ROUTES } from '@/constants/routes.constants';
import { ChatShareVisibility } from '@/enums/chat-share.enum';
import type { Locale } from '@/enums/locale.enum';
import type { SharedChatViewModel } from '@/types/chat-share-page.types';
import type { PublicChatShare, PublicChatShareMessage } from '@/types/chat-share.types';
import type { TranslateFunction } from '@/types/i18n.types';
import { buildShareMetaDescription, formatPublicModelLabel } from '@/utilities/chat-share.utility';
import { getHtmlLanguage, getOpenGraphLocale, localisePath } from '@/utilities/locale.utility';

/** Canonical path for a share. One definition, used by metadata and the ad units. */
export function buildSharePath(publicShareId: string, contentLocale: Locale): string {
  return `/${contentLocale}${SHARE_CHAT_PATH_PREFIX}/${publicShareId}`;
}

/**
 * Where the inline ad goes, or null when there should not be one.
 *
 * Deterministic and derived from message count, never random: a placement that
 * moves between renders is a layout shift on every visit, and "an ad every N
 * messages" is the density rule the ad policy actually cares about.
 *
 * A conversation shorter than the threshold gets no inline unit at all — there is
 * nothing for it to sit between, and a top and bottom unit on a four-message page
 * is already the whole page.
 */
export function resolveInlineAdIndex(messageCount: number): number | null {
  return messageCount > SHARED_CHAT_INLINE_AD_AFTER_MESSAGES
    ? SHARED_CHAT_INLINE_AD_AFTER_MESSAGES
    : null;
}

/**
 * Metadata for a shared chat, including the robots directives.
 *
 * The three cases are distinct and none of them may leak into another:
 *
 * - **Unavailable** (private, revoked, never existed): `noindex, nofollow,
 *   noarchive` and a generic title. A 404 page that carries the real title would
 *   publish the thing the owner just unpublished.
 * - **PUBLIC_UNLISTED**: reachable by URL, `noindex, nofollow, noarchive`. The path
 *   is crawlable, so the page-level directive is the only thing keeping it out of
 *   an index.
 * - **PUBLIC_INDEXED**: `index, follow` with a canonical URL.
 *
 * The canonical always comes from the configured site origin, never from the
 * request host: a spoofed `X-Forwarded-Host` that became a canonical URL would let
 * an attacker point our canonical at their domain.
 */
export function buildSharedChatMetadata(
  share: PublicChatShare | null,
  siteUrl: string,
  t: TranslateFunction,
): Metadata {
  const noIndex = { index: false, follow: false, nosnippet: false, noarchive: true };

  if (share === null) {
    return {
      title: t('chatShare.public.unavailableTitle'),
      robots: noIndex,
    };
  }

  const canonical = `${siteUrl}${buildSharePath(share.publicShareId, share.contentLocale)}`;
  const isIndexed = share.visibility === ChatShareVisibility.PUBLIC_INDEXED && share.indexEligible;
  const description =
    buildShareMetaDescription(share.description) ?? t('chatShare.public.genericDescription');

  return {
    title: share.title,
    description,
    alternates: { canonical },
    robots: isIndexed ? { index: true, follow: true } : noIndex,
    openGraph: {
      type: 'article',
      siteName: 'ClawAI',
      title: share.title,
      description,
      url: canonical,
      publishedTime: share.publishedAt,
      modifiedTime: share.updatedAt,
      locale: getOpenGraphLocale(share.contentLocale),
    },
    twitter: {
      card: 'summary',
      title: share.title,
      description,
    },
    other: {
      // Header-level backstop for the page-level directive. A crawler that fetches
      // this URL and ignores meta robots still sees the instruction, and it keeps
      // unlisted shares out of an index even if a future refactor drops the
      // `robots` field above.
      ...(isIndexed ? {} : { 'x-robots-tag': 'noindex, nofollow, noarchive' }),
      // The publicShareId is deliberately absent from every other tag; only the
      // canonical URL carries it, because that is the URL the visitor already has.
    },
  };
}

/** Assembles every prop the page needs, with all labels resolved. */
export function buildSharedChatViewModel(
  share: PublicChatShare,
  siteUrl: string,
  t: TranslateFunction,
): SharedChatViewModel {
  const canonicalUrl = `${siteUrl}${buildSharePath(share.publicShareId, share.contentLocale)}`;

  return {
    headerProps: {
      title: share.title,
      publishedLabel: t('chatShare.public.published', {
        date: formatPublicDate(share.publishedAt),
      }),
      updatedLabel: t('chatShare.public.updated', { date: formatPublicDate(share.updatedAt) }),
      messageCountLabel: t('chatShare.public.messageCount', {
        count: String(share.messageCount),
      }),
      snapshotDisclaimer: t('chatShare.public.snapshotDisclaimer'),
    },
    messageListProps: {
      userRoleLabel: t('chatShare.public.roleUser'),
      assistantRoleLabel: t('chatShare.public.roleAssistant'),
      truncatedLabel: t('chatShare.public.truncated'),
      inlineAdAfterIndex: resolveInlineAdIndex(share.messages.length),
      formatTimestamp: formatPublicDate,
      formatModelLabel: (message: PublicChatShareMessage): string | null =>
        formatPublicModelLabel(message.providerLabel, message.modelLabel),
    },
    footerProps: {
      homeLabel: t('chatShare.public.backToHome'),
      homeHref: localisePath(ROUTES.HOME, share.contentLocale),
      reportLabel: t('chatShare.public.report'),
      reportHref: localisePath(ROUTES.CONTACT, share.contentLocale),
      disclaimer: t('chatShare.public.footerDisclaimer'),
    },
    jsonLd: {
      canonicalUrl,
      title: share.title,
      description: buildShareMetaDescription(share.description),
      publishedAt: share.publishedAt,
      updatedAt: share.updatedAt,
      contentLanguage: getHtmlLanguage(share.contentLocale),
    },
    pathname: buildSharePath(share.publicShareId, share.contentLocale),
    adLabel: t('chatShare.public.advertisement'),
  };
}

/**
 * Formats a timestamp for a public page.
 *
 * Deliberately date-only and locale-independent (ISO `YYYY-MM-DD`). A
 * locale-formatted time would differ between the server render and the client
 * hydration — the server has no timezone for an anonymous visitor — and that
 * mismatch is a hydration error on every page load. The exact minute of a
 * published message is not information a reader needs.
 */
export function formatPublicDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}
