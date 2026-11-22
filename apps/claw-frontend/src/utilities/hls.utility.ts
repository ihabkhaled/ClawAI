import { LIVE_HLS_MIME_TYPE, LIVE_MS_PER_SECOND } from '@/constants/live.constants';
import type { LiveHlsAttachOptions, LiveHlsPlayerHandle } from '@/types/live.types';

/**
 * The only module that touches hls.js (library wrapping rule). It is loaded with a dynamic
 * `import()`, so the ~400 KB library is a separate chunk fetched only when the live player
 * mounts (rule 47) — never from a barrel, never on another page.
 *
 * hls.js is preferred over native HLS because it can send the Authorization header the
 * same-origin proxy needs; native playback (iOS Safari, no MSE) is the fallback.
 */
export async function attachHlsPlayer(options: LiveHlsAttachOptions): Promise<LiveHlsPlayerHandle> {
  const { default: Hls } = await import('hls.js');
  const { video, src, getToken, onFatalError } = options;
  if (Hls.isSupported()) {
    const hls = new Hls({
      xhrSetup: (xhr: XMLHttpRequest): void => {
        const bearer = getToken();
        if (bearer !== null) {
          xhr.setRequestHeader('Authorization', `Bearer ${bearer}`);
        }
      },
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        onFatalError(new Error(data.details));
      }
    });
    hls.loadSource(src);
    hls.attachMedia(video);
    return {
      getPlayingDateMs: () => hls.playingDate?.getTime() ?? null,
      getLatencyMs: () => (Number.isFinite(hls.latency) ? hls.latency * LIVE_MS_PER_SECOND : null),
      getLiveSyncPosition: () => hls.liveSyncPosition ?? null,
      destroy: () => hls.destroy(),
    };
  }
  if (video.canPlayType(LIVE_HLS_MIME_TYPE) !== '') {
    video.src = src;
    return {
      getPlayingDateMs: () => null,
      getLatencyMs: () => null,
      getLiveSyncPosition: () => null,
      destroy: () => {
        video.removeAttribute('src');
        video.load();
      },
    };
  }
  throw new Error('HLS playback is not supported in this browser');
}
