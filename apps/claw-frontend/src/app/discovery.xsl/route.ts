import { DISCOVERY_STYLESHEET_XSL } from '@/constants/discovery-stylesheet.constants';
import { DISCOVERY_CACHE_CONTROL, XSL_CONTENT_TYPE } from '@/constants/seo-discovery.constants';

// Served from a route rather than `public/` so the content type is stated
// outright. Every response here carries `X-Content-Type-Options: nosniff`, and a
// stylesheet delivered as anything but an XSL type is refused by the browser --
// which would leave the sitemaps looking exactly as broken as before.
export function GET(): Response {
  return new Response(DISCOVERY_STYLESHEET_XSL, {
    headers: {
      'Cache-Control': DISCOVERY_CACHE_CONTROL,
      'Content-Type': XSL_CONTENT_TYPE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
