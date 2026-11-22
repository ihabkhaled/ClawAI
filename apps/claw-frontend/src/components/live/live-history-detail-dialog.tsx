import { LiveFeedCardItem } from '@/components/live/live-feed-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLiveHistoryDetail } from '@/hooks/live/use-live-history-detail';
import type { LiveHistoryDetailDialogProps } from '@/types/live.types';

/** A past session's feed, limited to what the viewer actually watched with analysis. */
export function LiveHistoryDetailDialog({
  sessionId,
  onClose,
}: LiveHistoryDetailDialogProps): React.ReactElement {
  const detail = useLiveHistoryDetail(sessionId);
  const { t } = detail;
  return (
    <Dialog open={sessionId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('live.history.detailTitle')}</DialogTitle>
          <DialogDescription>{t('live.history.detailDescription')}</DialogDescription>
        </DialogHeader>
        {detail.isLoading ? (
          <p className="text-muted-foreground text-sm">{t('live.history.loading')}</p>
        ) : null}
        {detail.isError ? (
          <p role="alert" className="text-destructive text-sm">
            {t('live.history.error')}
          </p>
        ) : null}
        {!detail.isLoading && !detail.isError && detail.events.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('live.history.detailEmpty')}</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {detail.events.map((card) => (
            <li key={card.eventId}>
              <LiveFeedCardItem card={card} t={t} locale={detail.locale} allowEnhance />
            </li>
          ))}
        </ul>
        {detail.hasMore ? (
          <Button variant="outline" onClick={detail.loadMore} className="self-center">
            {t('live.history.loadMore')}
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
