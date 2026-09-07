import { INDEXNOW_KEY } from '@/constants/indexnow.constants';
import { PLAIN_TEXT_CONTENT_TYPE } from '@/constants/seo-discovery.constants';
import { shouldNoIndexEverything } from '@/lib/site/site-config';

// The directory name IS the key, which is what makes the zero-config
// verification path work: IndexNow fetches `/<key>.txt` and compares the body
// to the key it was given. `indexnow-key-route.test.ts` asserts the directory
// and the constant still agree, because a rename that forgot the constant
// would serve a 403-shaped mismatch that nothing else notices.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  if (shouldNoIndexEverything()) {
    // A preview, a staging host or a misconfigured deployment must not claim
    // ownership of the canonical origin. Serving the key there would let that
    // host's URLs be submitted as if they were the real site — and those are
    // exactly the URLs the rest of the discovery layer refuses to publish.
    return new Response('Not found', { status: 404 });
  }

  // The body is the bare key: no trailing newline, no BOM, no whitespace. The
  // spec compares the file contents to the key, and a stray newline is the
  // classic reason verification returns 403 while the file "looks right".
  return new Response(INDEXNOW_KEY, {
    headers: {
      'Content-Type': PLAIN_TEXT_CONTENT_TYPE,
      // Ownership proof is fetched on demand by the search engine and must not
      // be answered from a stale edge cache after a key rotation.
      'Cache-Control': 'no-store',
    },
  });
}
