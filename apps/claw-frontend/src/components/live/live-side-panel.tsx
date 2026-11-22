import { LiveCaptionsList } from '@/components/live/live-captions-list';
import { LiveChatLink } from '@/components/live/live-chat-link';
import { LiveChatPanel } from '@/components/live/live-chat-panel';
import { LiveFeedList } from '@/components/live/live-feed-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveFeedTab } from '@/enums/live.enum';
import type { LiveSidePanelProps } from '@/types/live.types';
import { cn } from '@/utilities';

/**
 * Smart Feed, Captions and Highlights (only what playback has reached is passed in), plus the
 * platform's Live chat tab when it offers a chat embed; otherwise an "Open chat on" link.
 */
export function LiveSidePanel({ modal }: LiveSidePanelProps): React.ReactElement {
  const { t, locale, embed } = modal;
  const allowEnhance = !modal.isPlayerOnly;
  const hasChat = embed.chatUrl !== null;
  return (
    <Tabs value={modal.tab} onValueChange={modal.setTab} className="flex min-h-0 flex-1 flex-col">
      <TabsList className={cn('grid w-full', hasChat ? 'grid-cols-4' : 'grid-cols-3')}>
        <TabsTrigger value={LiveFeedTab.FEED}>{t('live.modal.tabFeed')}</TabsTrigger>
        <TabsTrigger value={LiveFeedTab.CAPTIONS}>{t('live.modal.tabCaptions')}</TabsTrigger>
        <TabsTrigger value={LiveFeedTab.HIGHLIGHTS}>{t('live.modal.tabHighlights')}</TabsTrigger>
        {hasChat ? (
          <TabsTrigger value={LiveFeedTab.CHAT}>{t('live.platform.tabChat')}</TabsTrigger>
        ) : null}
      </TabsList>
      {hasChat ? null : (
        <div className="pt-2">
          <LiveChatLink embed={embed} t={t} />
        </div>
      )}
      <TabsContent value={LiveFeedTab.FEED} className="flex min-h-0 flex-1 flex-col">
        <LiveFeedList
          cards={modal.cards}
          t={t}
          locale={locale}
          allowEnhance={allowEnhance}
          emptyLabel={t('live.modal.feedEmpty')}
        />
      </TabsContent>
      <TabsContent value={LiveFeedTab.CAPTIONS} className="flex min-h-0 flex-1 flex-col">
        <LiveCaptionsList
          captions={modal.captions}
          translations={modal.captionTranslations}
          t={t}
          locale={locale}
        />
      </TabsContent>
      <TabsContent value={LiveFeedTab.HIGHLIGHTS} className="flex min-h-0 flex-1 flex-col">
        <LiveFeedList
          cards={modal.highlights}
          t={t}
          locale={locale}
          allowEnhance={allowEnhance}
          emptyLabel={t('live.modal.highlightsEmpty')}
        />
      </TabsContent>
      {hasChat ? (
        <TabsContent value={LiveFeedTab.CHAT} className="flex min-h-0 flex-1 flex-col">
          <LiveChatPanel embed={embed} t={t} />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
