import { extractChatGptShare, isChatGptShareUrl } from '../utilities/chatgpt-share.utility';
import { extractYoutubeWatch, isYoutubeWatchUrl } from '../utilities/youtube-watch.utility';
import type { SiteAdapter } from '../types/embedded-content.types';

/**
 * The one table of site adapters (public pages whose content ships as
 * structured data). An adapter reads only the HTML the fetch chain already
 * obtained through robots, SSRF and the escalation policy; it never fetches,
 * never sends a credential, and returns null to fall back to ordinary
 * extraction. Everything not listed here goes through the generic
 * embedded-state extractor. Add a site by adding a row.
 */
export const SITE_ADAPTERS: readonly SiteAdapter[] = [
  { name: 'chatgpt-share', matches: isChatGptShareUrl, extract: extractChatGptShare },
  { name: 'youtube-watch', matches: isYoutubeWatchUrl, extract: extractYoutubeWatch },
];
