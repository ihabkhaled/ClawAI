import { Captions, MessagesSquare, Sparkles, Star } from 'lucide-react';

import { LiveCaptionsList } from '@/components/live/live-captions-list';
import { LiveChatLink } from '@/components/live/live-chat-link';
import { LiveChatPanel } from '@/components/live/live-chat-panel';
import { LiveFeedList } from '@/components/live/live-feed-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LIVE_PANEL_TAB_CLASS } from '@/constants/live.constants';
import { LiveFeedTab } from '@/enums/live.enum';
import type { LiveSidePanelProps } from '@/types/live.types';
import { cn } from '@/utilities';

/**
 * The "AI Analysis" panel: Smart Feed, Captions and Highlights (only what playback has reached is
 * passed in), plus the platform's Live chat tab when it offers a chat embed; otherwise an "Open chat
 * on" link. The tab strip never wraps: on a phone each tab is an icon over a short label.
 */
export function LiveSidePanel({ modal }: LiveSidePanelProps): React.ReactElement {
  const { t, locale, embed } = modal;
  const allowEnhance = !modal.isPlayerOnly;
  const hasChat = embed.chatUrl !== null;
  return (
    <section
      aria-label={t('live.modal.analysisTitle')}
      className="border-border bg-card/40 flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border p-3 shadow-sm backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <span className="bg-primary h-4 w-1 rounded-full" aria-hidden="true" />
          {t('live.modal.analysisTitle')}
        </h2>
        {hasChat ? null : <LiveChatLink embed={embed} t={t} />}
      </div>
      <Tabs value={modal.tab} onValueChange={modal.setTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList
          className={cn(
            'touch:grid touch:flex-nowrap grid h-auto w-full gap-1',
            hasChat ? 'grid-cols-4' : 'grid-cols-3',
          )}
        >
          <TabsTrigger value={LiveFeedTab.FEED} className={LIVE_PANEL_TAB_CLASS}>
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('live.modal.tabFeed')}
          </TabsTrigger>
          <TabsTrigger value={LiveFeedTab.CAPTIONS} className={LIVE_PANEL_TAB_CLASS}>
            <Captions className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('live.modal.tabCaptions')}
          </TabsTrigger>
          <TabsTrigger value={LiveFeedTab.HIGHLIGHTS} className={LIVE_PANEL_TAB_CLASS}>
            <Star className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('live.modal.tabHighlights')}
          </TabsTrigger>
          {hasChat ? (
            <TabsTrigger value={LiveFeedTab.CHAT} className={LIVE_PANEL_TAB_CLASS}>
              <MessagesSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('live.platform.tabChat')}
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value={LiveFeedTab.FEED} className="mt-3 flex min-h-0 flex-1 flex-col">
          <LiveFeedList
            cards={modal.cards}
            t={t}
            locale={locale}
            allowEnhance={allowEnhance}
            emptyLabel={t(modal.isSummary ? 'live.summary.feedEmpty' : 'live.modal.feedEmpty')}
            clockOrigin={modal.clockOrigin}
          />
        </TabsContent>
        <TabsContent value={LiveFeedTab.CAPTIONS} className="mt-3 flex min-h-0 flex-1 flex-col">
          <LiveCaptionsList
            captions={modal.captions}
            t={t}
            locale={locale}
            clockOrigin={modal.clockOrigin}
          />
        </TabsContent>
        <TabsContent value={LiveFeedTab.HIGHLIGHTS} className="mt-3 flex min-h-0 flex-1 flex-col">
          <LiveFeedList
            cards={modal.highlights}
            t={t}
            locale={locale}
            allowEnhance={allowEnhance}
            emptyLabel={t('live.modal.highlightsEmpty')}
            clockOrigin={modal.clockOrigin}
          />
        </TabsContent>
        {hasChat ? (
          <TabsContent value={LiveFeedTab.CHAT} className="mt-3 flex min-h-0 flex-1 flex-col">
            <LiveChatPanel embed={embed} t={t} />
          </TabsContent>
        ) : null}
      </Tabs>
    </section>
  );
}
