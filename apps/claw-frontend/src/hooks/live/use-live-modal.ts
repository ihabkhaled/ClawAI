import { useEffect, useMemo, useState } from 'react';

import {
  LIVE_CREDIT_STATUSES,
  LIVE_REVEAL_ALL_AT,
  LIVE_SESSION_STATE_STATUS,
} from '@/constants/live.constants';
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
  revealLiveCaptions,
  resolveLiveDisplayStatus,
  revealLiveEvents,
} from '@/utilities/live-reveal.utility';
import { liveSessionHlsSrc, liveStatusPresentation } from '@/utilities/live-session.utility';

/**
 * Controller for the live modal. Everything shown is filtered by playback time: only events with
 * `startAt <= playbackAt` are revealed, so pause freezes the feed and seeking back hides later ones.
 * A browser-capture or server-pull session (cross-origin player, no media clock) reveals at
 * `playbackAt = Date.now()`. Server pull has no capture panel: the server reads the stream, so the
 * viewer counts as playing while the modal is open (its heartbeats still bill per viewer). A
 * server-pull platform with no embeddable player (TikTok LIVE, Rumble, …) shows a "Watch on" link-out
 * in the player area and the full analysis feed beside it.
 */
export function useLiveModal(input: LiveCreateSessionInput): UseLiveModalResult {
  const { t, locale } = useTranslation();
  const { session, isCreating, error } = useLiveSession(input);
  const isLinkOnly = session?.capability === LiveCapability.LINK_ONLY;
  const isCapture = session?.capability === LiveCapability.BROWSER_CAPTURE;
  // A recorded video is read by the server too: same feed, no capture panel, wall-clock reveal.
  const isServerPull =
    session?.capability === LiveCapability.SERVER_PULL ||
    session?.capability === LiveCapability.RECORDED;
  const isWallClock = isCapture || isServerPull;
  const isPlayerOnly = session?.capability === LiveCapability.PLAYER_ONLY || isLinkOnly;
  const aiEnabled = session !== null && !isPlayerOnly;
  const hlsSrc = liveSessionHlsSrc(session);
  const embed = useLiveEmbed(session);
  // A server-pull stream on a platform with no embeddable player still gets the feed, beside a link-out.
  const isPlayerLinkOut = isLinkOnly || (isServerPull && embed.playerUrl === null);
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
  // A one-click summary is a report, not a playback: everything it has is shown at once.
  const isSummary = session?.summary === true;
  const followedAt = isWallClock ? wallClock : player.snapshot.playbackAt;
  const playbackAt = isSummary ? LIVE_REVEAL_ALL_AT : followedAt;
  const isPaused = !isWallClock && isPlayerPaused;
  const { feed } = stream;
  const revealed = useMemo(
    () => ({
      cards: revealLiveEvents(feed.cards, playbackAt),
      highlights: revealLiveEvents(feed.highlights, playbackAt),
      captions: revealLiveCaptions(
        feed.captions,
        feed.captionTranslations,
        input.language,
        playbackAt,
      ),
      caption: latestRevealedCaption(
        feed.captions,
        feed.captionTranslations,
        input.language,
        playbackAt,
      ),
    }),
    [
      feed.captionTranslations,
      feed.captions,
      feed.cards,
      feed.highlights,
      input.language,
      playbackAt,
    ],
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
    isSummary,
    clockOrigin: isSummary ? (session?.mediaStartAt ?? null) : null,
    statusPresentation: liveStatusPresentation(status, session),
    sessionError: error,
    isCreating,
    isPlayerOnly,
    isLinkOnly,
    isCapture,
    isServerPull,
    isPlayerLinkOut,
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
