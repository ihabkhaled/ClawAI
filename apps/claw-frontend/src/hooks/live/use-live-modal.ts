import { useEffect, useMemo, useState } from 'react';

import { LIVE_CREDIT_STATUSES, LIVE_SESSION_STATE_STATUS } from '@/constants/live.constants';
import { LiveCapability, LiveFeedTab, LiveSourceKind } from '@/enums/live.enum';
import { useLiveModalPlayback } from '@/hooks/live/use-live-modal-playback';
import { useLiveSession } from '@/hooks/live/use-live-session';
import { useLiveStream } from '@/hooks/live/use-live-stream';
import { useLiveUsage } from '@/hooks/live/use-live-usage';
import { useTranslation } from '@/lib/i18n';
import type { LiveCreateSessionInput, LiveUsage, UseLiveModalResult } from '@/types/live.types';
import { parseLiveFeedTab } from '@/utilities/live-request.utility';
import {
  isBehindLiveEdge,
  latestRevealedCaption,
  resolveLiveDisplayStatus,
  revealLiveEvents,
} from '@/utilities/live-reveal.utility';
import { liveHlsUrl } from '@/utilities/live-session.utility';

/**
 * Controller for the live modal. Everything shown is filtered by playback time: only events with
 * `startAt <= playbackAt` are revealed, so pause freezes the feed and seeking back hides later ones.
 */
export function useLiveModal(input: LiveCreateSessionInput): UseLiveModalResult {
  const { t, locale } = useTranslation();
  const { session, isCreating, error } = useLiveSession(input);
  const isPlayerOnly = session?.capability === LiveCapability.PLAYER_ONLY;
  const aiEnabled = session !== null && !isPlayerOnly;
  const hlsSrc =
    session === null || session.sourceKind === LiveSourceKind.YOUTUBE
      ? null
      : liveHlsUrl(session.streamId);
  const initialStatus = session === null ? null : LIVE_SESSION_STATE_STATUS[session.state];
  const stream = useLiveStream(
    session?.sessionId ?? null,
    aiEnabled,
    input.language,
    initialStatus,
  );
  const { setStatus, setUsage } = stream;
  const { player, heartbeatError } = useLiveModalPlayback(
    session?.sessionId ?? null,
    hlsSrc,
    aiEnabled,
    setStatus,
    setUsage,
  );
  const usageQuery = useLiveUsage();
  const [tab, setTab] = useState<LiveFeedTab>(LiveFeedTab.FEED);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    if (session !== null) {
      setStatus(LIVE_SESSION_STATE_STATUS[session.state]);
    }
  }, [session, setStatus]);
  const { playbackAt, isPaused, liveEdgeAt } = player.snapshot;
  const { feed } = stream;
  const revealed = useMemo(
    () => ({
      cards: revealLiveEvents(feed.cards, playbackAt),
      highlights: revealLiveEvents(feed.highlights, playbackAt),
      captions: revealLiveEvents(feed.captions, playbackAt),
      caption: latestRevealedCaption(feed.captions, feed.captionTranslations, playbackAt),
    }),
    [feed.captionTranslations, feed.captions, feed.cards, feed.highlights, playbackAt],
  );
  const status = resolveLiveDisplayStatus(feed.status, isPaused && playbackAt > 0, isPlayerOnly);
  // Freshest first: the last heartbeat's month block, then the create response's, then GET /usage.
  const usage: LiveUsage | null =
    feed.usage?.month ?? session?.usage.month ?? usageQuery.usage ?? null;

  return {
    t,
    locale,
    session,
    sessionError: error,
    isCreating,
    isPlayerOnly,
    hlsSrc,
    player,
    status,
    showCreditsPanel: aiEnabled && LIVE_CREDIT_STATUSES.has(status),
    usage,
    isReconnecting: stream.isReconnecting || heartbeatError,
    isLost: stream.isLost,
    caption: revealed.caption,
    captions: revealed.captions,
    captionTranslations: feed.captionTranslations,
    cards: revealed.cards,
    highlights: revealed.highlights,
    isBehindLive: hlsSrc !== null && isBehindLiveEdge(playbackAt, liveEdgeAt),
    tab,
    setTab: (value) => setTab(parseLiveFeedTab(value) ?? LiveFeedTab.FEED),
    controlsOpen,
    toggleControls: () => setControlsOpen((open) => !open),
  };
}
