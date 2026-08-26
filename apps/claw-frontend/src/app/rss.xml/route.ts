import { buildGlobalRssResponse } from '@/lib/discovery/global-rss.service';

// Discovery depends on runtime SITE_URL and live public-share data.
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return buildGlobalRssResponse(request);
}
