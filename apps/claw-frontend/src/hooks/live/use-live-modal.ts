import { useEffect, useMemo, useState } from 'react';

import { LIVE_CREDIT_STATUSES, LIVE_SESSION_STATE_STATUS } from '@/constants/live.constants';
import { LiveCapability, LiveFeedTab } from '@/enums/live.enum';
import { useLiveCapture } from '@/hooks/live/use-live-capture';
import { useLiveEmbed } from '@/hooks/live/use-live-embed';
import { useLiveModalPlayback } from '@/hooks/live/use-live-modal-playback';
import { useLiveSession } from '@/hooks/live/use-live-session';
import { useLiveStream } from '@/hooks/live/use-live-stream';
import { useLiveUsage } from '@/hooks/live/use-live-usage';
import { useLiveWallClock } from '@/hooks/live/use-live-wall-clock';
import { useTranslation } from '@/lib/i18n';
import type { LiveCreateSessionInput, LiveUsage, UseLiveModalResult } from '@/types/live.types';
import { parseLiveFeedTab } from '@/utilities/live-request.utility';
import {
  isBehindLiveEdge,
  latestRevealedCaption,
  resolveLiveDisplayStatus,
  revealLiveEvents,
} from '@/utilities/live-reveal.utility';
import { liveSessionHlsSrc } from '@/utilities/live-session.utility';

/**
 * Controller for the live modal. Everything shown is filtered by playback time: only events with
 * `startAt <= playbackAt` are revealed, so pause freezes the feed and seeking back hides later ones.
 * A browser-capture or server-pull session (cross-origin player, no media clock) reveals at
 * `playbackAt = Date.now()`. Server pull has no capture panel: the server reads the stream, so the
 * viewer counts as playing while the modal is open (its heartbeats still bill per viewer).
 */
export function useLiveModal(input: LiveCreateSessionInput): UseLiveModalResult {
  const { t, locale } = useTranslation();
  const { session, isCreating, error } = useLiveSession(input);
  const isLinkOnly = session?.capability === LiveCapability.LINK_ONLY;
  const isCapture = session?.capability === LiveCapability.BROWSER_CAPTURE;
  const isServerPull = session?.capability === LiveCapability.SERVER_PULL;
  const isWallClock = isCapture || isServerPull;
  const isPlayerOnly = session?.capability === LiveCapability.PLAYER_ONLY || isLinkOnly;
  const aiEnabled = session !== null && !isPlayerOnly;
  const hlsSrc = liveSessionHlsSrc(session);
  const embed = useLiveEmbed(session);
  const initialStatus = session === null ? null : LIVE_SESSION_STATE_STATUS[session.state];
  const stream = useLiveStream(
    session?.sessionId ?? null,
    aiEnabled,
    input.language,
    initialStatus,
  );
  const { setStatus, setUsage } = stream;
  const capture = useLiveCapture({
    sessionId: session?.sessionId ?? null,
    enabled: isCapture,
    status: stream.feed.status,
  });
  const { player, heartbeatError } = useLiveModalPlayback(
    session?.sessionId ?? null,
    hlsSrc,
    aiEnabled,
    setStatus,
    setUsage,
    { isCapture: isWallClock, isCapturing: isServerPull || capture.isCapturing },
  );
  const wallClock = useLiveWallClock(isWallClock);
  const usageQuery = useLiveUsage();
  const [tab, setTab] = useState<LiveFeedTab>(LiveFeedTab.FEED);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    if (session !== null) {
      setStatus(LIVE_SESSION_STATE_STATUS[session.state]);
    }
  }, [session, setStatus]);
  const { isPaused: isPlayerPaused, liveEdgeAt } = player.snapshot;
  const playbackAt = isWallClock ? wallClock : player.snapshot.playbackAt;
  const isPaused = !isWallClock && isPlayerPaused;
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
  // A capture session that is not sharing audio reads as paused: nothing is analyzed or billed.
  // A server-pull session is never paused by the viewer; only a PAUSED status from the server shows it.
  const showPaused = isCapture ? !capture.isCapturing : isPaused && playbackAt > 0;
  const status = resolveLiveDisplayStatus(feed.status, showPaused, isPlayerOnly);
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
    isLinkOnly,
    isCapture,
    isServerPull,
    embed,
    capture,
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
