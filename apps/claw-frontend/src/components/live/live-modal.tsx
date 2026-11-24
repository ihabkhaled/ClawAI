import { ChevronDown, Radio, Server } from 'lucide-react';

import { LiveCapturePanel } from '@/components/live/live-capture-panel';
import { LiveCreditsPanel } from '@/components/live/live-credits-panel';
import { LiveNoAiPanel } from '@/components/live/live-no-ai-panel';
import { LivePlayer } from '@/components/live/live-player';
import { LiveSidePanel } from '@/components/live/live-side-panel';
import { LiveStatusBanner } from '@/components/live/live-status-banner';
import { LiveTimeline } from '@/components/live/live-timeline';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLiveModal } from '@/hooks/live/use-live-modal';
import type { LiveModalProps } from '@/types/live.types';
import { cn } from '@/utilities';

/**
 * The live modal: video left (~60 %) and the feed panel right on desktop; video on top and feed below
 * on a phone, with the secondary controls (timeline, jump to live) collapsible.
 */
export function LiveModal({ input, onClose }: LiveModalProps): React.ReactElement {
  const modal = useLiveModal(input);
  const { t, session } = modal;
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-none flex-col gap-3 overflow-hidden rounded-none p-3 sm:h-[92dvh] sm:max-w-7xl sm:rounded-2xl sm:p-5">
        <DialogHeader className="pe-8">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Radio className="text-primary h-4 w-4" aria-hidden="true" />
            <span className="truncate">{modal.embed.platformName ?? t('live.modal.title')}</span>
            {session ? (
              <span className="border-destructive/40 bg-destructive/10 text-destructive inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide">
                <span
                  className="bg-destructive h-1.5 w-1.5 animate-pulse rounded-full"
                  aria-hidden="true"
                />
                {t('live.modal.liveBadge')}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('live.modal.description')}</DialogDescription>
        </DialogHeader>
        {modal.isCreating ? (
          <p className="text-muted-foreground text-sm">{t('live.modal.starting')}</p>
        ) : null}
        {modal.sessionError ? (
          <p role="alert" className="text-destructive text-sm">
            {modal.sessionError}
          </p>
        ) : null}
        {session ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-5">
            <div className="flex max-h-[48dvh] min-w-0 shrink-0 flex-col gap-3 overflow-y-auto md:max-h-none md:w-3/5 md:shrink">
              <LivePlayer
                embed={modal.embed}
                isLinkOnly={modal.isPlayerLinkOut}
                hlsSrc={modal.hlsSrc}
                player={modal.player}
                caption={modal.caption}
                t={t}
              />
              {modal.isCapture ? <LiveCapturePanel capture={modal.capture} t={t} /> : null}
              {modal.isServerPull ? (
                <p
                  role="status"
                  className="text-muted-foreground hidden items-center gap-2 text-xs sm:flex"
                  data-testid="live-server-pull"
                >
                  <Server className="text-primary h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {t('live.serverPull.analyzing')}
                </p>
              ) : null}
              <LiveStatusBanner
                status={modal.status}
                isReconnecting={modal.isReconnecting}
                isLost={modal.isLost}
                t={t}
              />
              {modal.showCreditsPanel ? (
                <LiveCreditsPanel
                  sessionId={session.sessionId}
                  usage={modal.usage}
                  t={t}
                  locale={modal.locale}
                />
              ) : null}
              {modal.hlsSrc ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start md:hidden"
                    aria-expanded={modal.controlsOpen}
                    aria-controls="live-secondary-controls"
                    onClick={modal.toggleControls}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        modal.controlsOpen && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                    {modal.controlsOpen
                      ? t('live.modal.fewerControls')
                      : t('live.modal.moreControls')}
                  </Button>
                  <div
                    id="live-secondary-controls"
                    className={cn('flex-col gap-2 md:flex', modal.controlsOpen ? 'flex' : 'hidden')}
                  >
                    <LiveTimeline
                      highlights={modal.highlights}
                      seekable={modal.player.snapshot.seekable}
                      playbackAt={modal.player.snapshot.playbackAt}
                      t={t}
                      locale={modal.locale}
                      onSeek={modal.player.seekTo}
                    />
                    {modal.isBehindLive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="self-start"
                        onClick={modal.player.jumpToLive}
                      >
                        {t('live.modal.jumpToLive')}
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col md:w-2/5">
              {modal.isPlayerOnly ? (
                <LiveNoAiPanel embed={modal.embed} isLinkOnly={modal.isLinkOnly} t={t} />
              ) : (
                <LiveSidePanel modal={modal} />
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
