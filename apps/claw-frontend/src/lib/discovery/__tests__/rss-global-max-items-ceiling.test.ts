import { describe, expect, it } from 'vitest';

import { RSS_GLOBAL_MAX_ITEMS } from '@/constants/seo-discovery.constants';
import { Locale } from '@/enums/locale.enum';
import { getFeedPagesForLocale } from '@/utilities/content-registry.utility';

// `buildGlobalRssResponse` places every feed-eligible page ahead of every chat
// before slicing to RSS_GLOBAL_MAX_ITEMS, so pages themselves are never
// truncated today — but the comment on RSS_GLOBAL_MAX_ITEMS documents the
// arithmetic going stale before (it said "16 pages" against a real surface of
// 28, then 28 against a real surface that has since grown again). A silently
// stale ceiling is only caught once truncation is observed in production.
//
// This is the tripwire instead: it fails a batch that grows the registry
// enough to approach the ceiling, well before pages actually start being
// dropped — "comfortably under" is deliberately a wide margin (half the
// ceiling), not the exact boundary, so this goes red while there is still
// plenty of runway to raise RSS_GLOBAL_MAX_ITEMS or reconsider what counts as
// feed-eligible, rather than after the feed has already started truncating.
describe('RSS_GLOBAL_MAX_ITEMS ceiling', () => {
  it('stays comfortably under the ceiling as the registry grows', () => {
    const feedPagesPerLocale = getFeedPagesForLocale(Locale.EN).length;
    const localeCount = Object.values(Locale).length;
    const totalFeedPages = feedPagesPerLocale * localeCount;

    // `/rss.xml` places pages ahead of chats, so this total is what actually
    // occupies feed slots before any chat is considered. Half the ceiling
    // leaves the same amount of room again for chats and future growth.
    expect(totalFeedPages).toBeLessThan(RSS_GLOBAL_MAX_ITEMS / 2);
  });
});
