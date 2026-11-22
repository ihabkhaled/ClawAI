import { useMemo } from 'react';

import { LIVE_EMPTY_EMBED_VIEW } from '@/constants/live.constants';
import type { LiveEmbedView, LiveSession } from '@/types/live.types';
import { buildLiveEmbedView } from '@/utilities/live-embed.utility';

/** The session's player, chat and watch links, with this page's hostname as Twitch `parent` / YouTube `embed_domain`. */
export function useLiveEmbed(session: LiveSession | null): LiveEmbedView {
  return useMemo(() => {
    if (session === null) {
      return LIVE_EMPTY_EMBED_VIEW;
    }
    const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
    return buildLiveEmbedView(session, hostname);
  }, [session]);
}
