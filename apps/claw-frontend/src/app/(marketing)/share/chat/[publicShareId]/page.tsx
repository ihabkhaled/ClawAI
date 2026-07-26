import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';

import { AdUnit } from '@/components/adsense/ad-unit';
import { PublicSharedChatFooter } from '@/components/chat-shares/public-shared-chat-footer';
import { PublicSharedChatHeader } from '@/components/chat-shares/public-shared-chat-header';
import { PublicSharedMessageList } from '@/components/chat-shares/public-shared-message-list';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { PUBLIC_SHARE_MAX_RENDERED_MESSAGES } from '@/constants/public-share-render.constants';
import { SHARED_CHAT_AD_RESERVED_HEIGHT } from '@/constants/shared-chat-ads.constants';
import { getAdSenseSlots } from '@/lib/adsense/adsense-config';
import { getPublicChatShare } from '@/lib/chat-shares/public-chat-share.service';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { createServerTranslator } from '@/lib/i18n/server-locale';
import { getSiteUrl } from '@/lib/site/site-config';
import type { PublicSharedChatPageParams } from '@/types/chat-share-page.types';
import {
  buildSharedChatMetadata,
  buildSharedChatViewModel,
} from '@/utilities/public-shared-chat.utility';
import { buildSharedChatJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

// Rendered per request, never cached. When an owner makes a chat private the page
// must stop resolving NOW — a statically cached success would keep serving a
// conversation that has been taken back, and no revalidation window is short
// enough to make that acceptable.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PublicSharedChatPageParams): Promise<Metadata> {
  const { publicShareId } = await params;
  const share = await getPublicChatShare(publicShareId);
  const t = createServerTranslator(share?.contentLocale ?? DEFAULT_LOCALE);
  return buildSharedChatMetadata(share, getSiteUrl(), t);
}

/**
 * The public read-only shared chat.
 *
 * Server-rendered on purpose: a crawler and a screen reader both have to receive
 * the actual transcript in the HTML response. A client-fetched shell would be
 * indexed as an empty page, which would make the whole indexing feature pointless.
 * That is also why the locale comes from `Accept-Language` here rather than from
 * the client-side locale store — localStorage does not exist at render time.
 *
 * `notFound()` covers private, revoked, deleted, never-existed, malformed, and
 * backend-unavailable with one identical 404, so the response cannot be used to
 * learn whether an identifier was ever real.
 *
 * Ad eligibility comes from the SERVER's `adsEligible` field, never from the URL:
 * `/share/chat/<anything>` matches this route, and treating that as an ad surface
 * would put units on revoked and safety-flagged pages.
 */
export default async function PublicSharedChatPage({
  params,
}: PublicSharedChatPageParams): Promise<React.ReactElement> {
  const { publicShareId } = await params;
  const [share, requestHeaders] = await Promise.all([getPublicChatShare(publicShareId), headers()]);

  if (share === null) {
    notFound();
  }

  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  if (requestedLocale !== share.contentLocale) {
    permanentRedirect(`/${share.contentLocale}/share/chat/${share.publicShareId}`);
  }

  const t = createServerTranslator(share.contentLocale);
  const view = buildSharedChatViewModel(share, getSiteUrl(), t);
  const slots = getAdSenseSlots();
  const messages = share.messages.slice(0, PUBLIC_SHARE_MAX_RENDERED_MESSAGES);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Values here are user content; serializeJsonLd escapes `<` so a chat
          titled "</script>…" cannot break out of the block. */}
      <script type="application/ld+json">
        {serializeJsonLd(buildSharedChatJsonLd(view.jsonLd))}
      </script>

      <PublicSharedChatHeader {...view.headerProps} />

      {/* Above the transcript, below the title — separated from conversation
          content, never inside it. */}
      <AdUnit
        slot={slots.sharedChatTop}
        reservedHeight={SHARED_CHAT_AD_RESERVED_HEIGHT}
        pathname={view.pathname}
        serverEligibility={share.adsEligible}
        label={view.adLabel}
        className="my-6"
      />

      <PublicSharedMessageList
        {...view.messageListProps}
        messages={messages}
        inlineAd={
          <AdUnit
            slot={slots.sharedChatInline}
            reservedHeight={SHARED_CHAT_AD_RESERVED_HEIGHT}
            pathname={view.pathname}
            serverEligibility={share.adsEligible}
            label={view.adLabel}
          />
        }
      />

      <AdUnit
        slot={slots.sharedChatBottom}
        reservedHeight={SHARED_CHAT_AD_RESERVED_HEIGHT}
        pathname={view.pathname}
        serverEligibility={share.adsEligible}
        label={view.adLabel}
        className="my-6"
      />

      <PublicSharedChatFooter {...view.footerProps} />
    </div>
  );
}
