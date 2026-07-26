import type { AdSenseConfig, AdSenseSlots } from '@/types/adsense.types';

// AdSense client ids are `ca-pub-` followed by exactly 16 digits. Anything
// else is treated as unconfigured — we never emit a script or unit for a
// malformed id, and never ship a fake/placeholder id.
const ADSENSE_CLIENT_ID_PATTERN = /^ca-pub-\d{16}$/u;

// A `data-ad-slot` is a numeric id from the AdSense dashboard. Validating the
// shape means a copy-paste accident (a whole ad snippet pasted into the variable,
// a placeholder like `xxxx`, a trailing comment) resolves to null and renders no
// unit, instead of requesting an ad against a slot that does not exist.
const ADSENSE_SLOT_PATTERN = /^\d{6,20}$/u;

function readBooleanFlag(value: string | undefined): boolean {
  return value === 'true';
}

export function isValidAdSenseClientId(value: string | null | undefined): boolean {
  return typeof value === 'string' && ADSENSE_CLIENT_ID_PATTERN.test(value);
}

// Derives the `pub-XXXXXXXXXXXXXXXX` seller id used by ads.txt from the
// `ca-pub-...` client id. Returns null when the client id is missing/invalid.
export function deriveAdSensePublisherId(clientId: string | null | undefined): string | null {
  if (!isValidAdSenseClientId(clientId)) {
    return null;
  }
  // `ca-pub-1234...` -> `pub-1234...`
  return (clientId as string).slice('ca-'.length);
}

export function isValidAdSenseSlot(value: string | null | undefined): boolean {
  return typeof value === 'string' && ADSENSE_SLOT_PATTERN.test(value);
}

function readSlot(value: string | undefined): string | null {
  return isValidAdSenseSlot(value) ? (value as string) : null;
}

/**
 * The five placement slots.
 *
 * Every one is optional and defaults to null: an operator who has created only the
 * shared-chat units gets those and no others, rather than a broken unit wherever a
 * slot is missing. Local and test environments leave all five blank, which is why
 * no ad ever renders in a Playwright run even if a real client id leaks into the
 * environment.
 */
export function getAdSenseSlots(): AdSenseSlots {
  return {
    home: readSlot(process.env['NEXT_PUBLIC_ADSENSE_HOME_SLOT']),
    content: readSlot(process.env['NEXT_PUBLIC_ADSENSE_CONTENT_SLOT']),
    sharedChatTop: readSlot(process.env['NEXT_PUBLIC_ADSENSE_SHARED_CHAT_TOP_SLOT']),
    sharedChatInline: readSlot(process.env['NEXT_PUBLIC_ADSENSE_SHARED_CHAT_INLINE_SLOT']),
    sharedChatBottom: readSlot(process.env['NEXT_PUBLIC_ADSENSE_SHARED_CHAT_BOTTOM_SLOT']),
  };
}

export function getAdSenseConfig(): AdSenseConfig {
  const rawClientId = process.env['NEXT_PUBLIC_ADSENSE_CLIENT_ID'];
  const isConfigured = isValidAdSenseClientId(rawClientId);

  return {
    clientId: isConfigured ? (rawClientId as string) : null,
    isConfigured,
    servingEnabled: readBooleanFlag(process.env['NEXT_PUBLIC_ADSENSE_SERVING_ENABLED']),
    reviewMode: readBooleanFlag(process.env['NEXT_PUBLIC_ADSENSE_REVIEW_MODE']),
  };
}
