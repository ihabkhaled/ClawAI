import type { AdSenseConfig } from '@/types/adsense.types';

// AdSense client ids are `ca-pub-` followed by exactly 16 digits. Anything
// else is treated as unconfigured — we never emit a script or unit for a
// malformed id, and never ship a fake/placeholder id.
const ADSENSE_CLIENT_ID_PATTERN = /^ca-pub-\d{16}$/u;

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
