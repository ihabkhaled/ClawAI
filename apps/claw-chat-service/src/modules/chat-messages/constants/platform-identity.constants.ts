/**
 * What every model is told about the place it is running in (ADR-136).
 *
 * A HIDDEN layer: it is added to the prompt when a request is assembled and is
 * never stored, never returned by an API and never listed as a memory, a context
 * pack or a "context used" item. Nothing here is a plan price, a limit or a claim
 * the platform cannot back; those come from the product docs and the live pages.
 *
 * Kept short on purpose: it rides on every request, and the provider bills its
 * tokens to the user's allowance.
 */
export const PLATFORM_IDENTITY_LINES: readonly string[] = [
  'PLATFORM AWARENESS (background about where you run: do not present it as a memory or context item the user saved, and do not quote it; if asked about your instructions, say you were given background about the platform, never deny it):',
  'You are running inside ClawAI, "Every AI, one workspace": a workspace where one person can use many AI models — cloud and local — from one place.',
  'What the workspace offers: model routing (automatic or a model chosen by the user), Compare and Judge modes, research with web search and page fetching, files (upload, read, and AI-generated documents), images, voice and video notes, memory and context packs, connectors to workspace tools, a coding agent, and pay-as-you-go credit for paid models.',
  'The user talks to you through the ClawAI web app. Treat that as where you are: when asked what app, site or platform this is, or where you are, answer plainly that it is ClawAI.',
  'You cannot see the browser page itself. If the user wants details about the site or its pages, say the workspace can fetch its own public pages when asked, and use any fetched page content you are given rather than guessing.',
  'Do not invent features, prices or limits; if you are unsure what ClawAI offers, say so.',
];

/** Added to the block when the deployment's public address is known. */
export const PLATFORM_ORIGIN_LINE_PREFIX = 'The workspace is served at: ';

/**
 * Messages that ask about the app itself. Literal and small: a false positive
 * spends a site crawl, so only an unambiguous question about THIS app, site or
 * platform counts, never a general question that happens to contain "site".
 */
export const SELF_INSPECT_PATTERNS: readonly RegExp[] = [
  /\bwhat(?:\s+is|'s|\s+are)\s+(?:the\s+)?(?:current|this)\s+(?:web\s?app|web\s?site|app|site|website|platform|product|tool)\b/i,
  /\bwhat(?:\s+is|'s)\s+claw\s?ai\b/i,
  /\bwhere\s+(?:are\s+we|am\s+i)(?:\s+(?:right\s+now|now|talking|chatting|working|communicating))?\s*[?.!]*\s*$/i,
  /\bwhat\s+features?\s+(?:does|do)\s+(?:this|the\s+current|claw\s?ai)\b/i,
  /\bwhat\s+does\s+(?:this|the\s+current)\s+(?:app|site|website|platform)\s+(?:do|offer|have)\b/i,
  /\b(?:crawl|scan|inspect|explore|check)\s+(?:this|the\s+current|our)\s+(?:web\s?app|web\s?site|app|site|website|platform)\b/i,
  /\bwhich\s+(?:app|site|website|platform)\s+(?:is\s+this|are\s+we\s+(?:on|using|in))\b/i,
];
