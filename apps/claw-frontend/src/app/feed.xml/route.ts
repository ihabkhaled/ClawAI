import { RssFeedKind } from '@/enums/rss-feed-kind.enum';
import { buildLocalizedRssResponse } from '@/lib/discovery/rss.service';

export async function GET(request: Request): Promise<Response> {
  return buildLocalizedRssResponse(request, RssFeedKind.COMBINED);
}
