import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import {
  PLATFORM_IDENTITY_AGENT_LINES,
  PLATFORM_IDENTITY_LINES,
  PLATFORM_ORIGIN_LINE_PREFIX,
  SELF_INSPECT_PATTERNS,
} from '../constants/platform-identity.constants';

/**
 * The hidden self-awareness block for one request.
 *
 * The origin is read from configuration at request time, never written into the
 * text of the product, so a changed domain or address changes what every model
 * is told on the next message with no edit here.
 */
export function buildPlatformIdentityBlock(
  origin: string | undefined,
  surface?: ChatSurface,
): string {
  const lines = [...PLATFORM_IDENTITY_LINES];
  // A coding-agent turn is not in the web app: swap the two lines that say so.
  if (surface === ChatSurface.AGENT) lines.splice(3, 2, ...PLATFORM_IDENTITY_AGENT_LINES);
  if (origin !== undefined && origin.trim().length > 0) {
    lines.splice(3, 0, `${PLATFORM_ORIGIN_LINE_PREFIX}${origin.trim().replace(/\/+$/u, '')}`);
  }
  return lines.join('\n');
}

/** Whether the message asks about the app the user is in. */
export function asksAboutThisPlatform(message: string): boolean {
  return SELF_INSPECT_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * The intent to run a crawl of the platform's own site for, or null.
 *
 * "crawl <origin>" makes `classifyResearchWorkflow` pick a site crawl, and the
 * user's own words ride along so the crawl ranks the pages that answer them.
 */
export function buildSelfInspectIntent(message: string, origin: string): string | null {
  return !asksAboutThisPlatform(message) || origin.trim().length === 0
    ? null
    : `${message.trim()}\ncrawl ${origin.trim().replace(/\/+$/u, '')}`;
}
