import { LiveCaptionsList } from '@/components/live/live-captions-list';
import { LiveFeedList } from '@/components/live/live-feed-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveFeedTab } from '@/enums/live.enum';
import type { LiveSidePanelProps } from '@/types/live.types';

/** Smart Feed, Captions and Highlights; only what playback has reached is passed in. */
export function LiveSidePanel({ modal }: LiveSidePanelProps): React.ReactElement {
  const { t, locale } = modal;
  const allowEnhance = !modal.isPlayerOnly;
  return (
    <Tabs value={modal.tab} onValueChange={modal.setTab} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value={LiveFeedTab.FEED}>{t('live.modal.tabFeed')}</TabsTrigger>
        <TabsTrigger value={LiveFeedTab.CAPTIONS}>{t('live.modal.tabCaptions')}</TabsTrigger>
        <TabsTrigger value={LiveFeedTab.HIGHLIGHTS}>{t('live.modal.tabHighlights')}</TabsTrigger>
      </TabsList>
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
    </Tabs>
  );
}
