import { YOUTUBE_WATCH_HOSTS } from '../constants/embedded-content.constants';
import { asRecord, asText, listScriptBlocks, readAssignedJson } from './script-blocks.utility';
import type { SiteAdapterText } from '../types/embedded-content.types';

/** A YouTube watch page (`youtube.com/watch?v=…`). */
export function isYoutubeWatchUrl(url: URL): boolean {
  return YOUTUBE_WATCH_HOSTS.has(url.hostname.toLowerCase()) && url.pathname === '/watch';
}

/**
 * Title, channel and description of a public video, from the
 * `ytInitialPlayerResponse` the watch page ships. Null when absent (consent
 * interstitial, removed video), so ordinary extraction runs instead.
 */
export function extractYoutubeWatch(html: string): SiteAdapterText | null {
  const details = asRecord(asRecord(playerResponseOf(html))?.['videoDetails']);
  const title = asText(details?.['title']);
  if (details === null || title === null) {
    return null;
  }
  const lines = [`# ${title}`];
  const author = asText(details['author']);
  if (author !== null) {
    lines.push(`Channel: ${author}`);
  }
  const description = asText(details['shortDescription']);
  if (description !== null) {
    lines.push('', description);
  }
  return { title, text: lines.join('\n') };
}

function playerResponseOf(html: string): unknown {
  const marker = 'ytInitialPlayerResponse';
  for (const block of listScriptBlocks(html)) {
    const at = block.body.indexOf(marker);
    if (at !== -1) {
      return readAssignedJson(block.body, at + marker.length);
    }
  }
  return undefined;
}
