import { deriveAdSensePublisherId } from '@/lib/adsense/adsense-config';

// Google's fixed AdSense certification-authority id — identical for every
// AdSense publisher, so the full ads.txt record is derivable from the
// publisher id alone.
const GOOGLE_ADSENSE_CERTIFICATION_ID = 'f08c47fec0942fa0';

// Serves /ads.txt as plain text. The authorized-seller record is generated
// from the configured AdSense publisher id — ADSENSE_PUBLISHER_ID if set,
// otherwise derived from NEXT_PUBLIC_ADSENSE_CLIENT_ID (ca-pub-... ->
// pub-...). When no valid publisher id is configured we return 404 rather
// than an empty or fake record, so preview/misconfigured deployments never
// publish inventory records.
export function GET(): Response {
  const explicitPublisherId = process.env['ADSENSE_PUBLISHER_ID'];
  const publisherId =
    explicitPublisherId && /^pub-\d{16}$/u.test(explicitPublisherId)
      ? explicitPublisherId
      : deriveAdSensePublisherId(process.env['NEXT_PUBLIC_ADSENSE_CLIENT_ID']);

  if (publisherId === null) {
    return new Response('Not found', { status: 404 });
  }

  const record = `google.com, ${publisherId}, DIRECT, ${GOOGLE_ADSENSE_CERTIFICATION_ID}`;

  return new Response(record, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
