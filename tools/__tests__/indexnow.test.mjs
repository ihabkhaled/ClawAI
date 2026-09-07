// IndexNow submission selection.
//
// The interesting behaviour is entirely in what gets selected, not in the POST:
// submitting the wrong set is how a site earns a 422 (a foreign URL poisons the
// whole batch) or a 429 (re-submitting unchanged URLs, which the protocol reads
// as spam). Those are the cases pinned here.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildPayload,
  extractLocations,
  extractUrlEntries,
  selectSubmittableUrls,
} from '../indexnow/index.mjs';

const NOW = new Date('2026-09-07T12:00:00.000Z');
const HOST = 'claw-ai.co';

function entry(url, lastModified) {
  return { url, lastModified };
}

test('reads child sitemap locations out of a sitemap index', () => {
  const xml =
    '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://claw-ai.co/sitemaps/en/pages-1.xml</loc></sitemap>' +
    '<sitemap><loc>https://claw-ai.co/sitemaps/ar/pages-1.xml</loc></sitemap></sitemapindex>';

  assert.deepEqual(extractLocations(xml), [
    'https://claw-ai.co/sitemaps/en/pages-1.xml',
    'https://claw-ai.co/sitemaps/ar/pages-1.xml',
  ]);
});

test('pairs each url with its lastmod, and keeps undated entries visible', () => {
  const xml =
    '<urlset><url><loc>https://claw-ai.co/en</loc><lastmod>2026-09-06</lastmod></url>' +
    '<url><loc>https://claw-ai.co/en/pricing</loc></url></urlset>';

  assert.deepEqual(extractUrlEntries(xml), [
    { url: 'https://claw-ai.co/en', lastModified: '2026-09-06' },
    // Reported as null rather than dropped: the caller decides what "no date"
    // means, and swallowing it here would hide a malformed sitemap.
    { url: 'https://claw-ai.co/en/pricing', lastModified: null },
  ]);
});

test('decodes XML entities so a query-string URL is submitted as it resolves', () => {
  const xml = '<urlset><url><loc>https://claw-ai.co/en?a=1&amp;b=2</loc><lastmod>2026-09-06</lastmod></url></urlset>';

  assert.equal(extractUrlEntries(xml)[0].url, 'https://claw-ai.co/en?a=1&b=2');
});

test('submits only URLs changed inside the window', () => {
  const selected = selectSubmittableUrls(
    [
      entry('https://claw-ai.co/en/fresh', '2026-09-06T00:00:00.000Z'),
      entry('https://claw-ai.co/en/stale', '2026-01-01T00:00:00.000Z'),
    ],
    { host: HOST, now: NOW, windowDays: 7 },
  );

  assert.deepEqual(selected, ['https://claw-ai.co/en/fresh']);
});

// A foreign URL makes IndexNow reject the ENTIRE batch with 422, so one stray
// absolute URL in a sitemap would silently cost every other URL in the run.
test('drops a URL belonging to another host rather than poisoning the batch', () => {
  const selected = selectSubmittableUrls(
    [
      entry('https://claw-ai.co/en/kept', '2026-09-06T00:00:00.000Z'),
      entry('https://example.com/en/foreign', '2026-09-06T00:00:00.000Z'),
      entry('https://staging.claw-ai.co/en/other', '2026-09-06T00:00:00.000Z'),
    ],
    { host: HOST, now: NOW, windowDays: 7 },
  );

  assert.deepEqual(selected, ['https://claw-ai.co/en/kept']);
});

test('skips an undated entry instead of submitting it on every deploy', () => {
  const selected = selectSubmittableUrls([entry('https://claw-ai.co/en/undated', null)], {
    host: HOST,
    now: NOW,
    windowDays: 7,
  });

  assert.deepEqual(selected, []);
});

test('skips an unparseable lastmod rather than treating it as fresh', () => {
  const selected = selectSubmittableUrls([entry('https://claw-ai.co/en/bad', 'not-a-date')], {
    host: HOST,
    now: NOW,
    windowDays: 7,
  });

  assert.deepEqual(selected, []);
});

test('deduplicates a URL listed in more than one sitemap chunk', () => {
  const selected = selectSubmittableUrls(
    [
      entry('https://claw-ai.co/en/twice', '2026-09-06T00:00:00.000Z'),
      entry('https://claw-ai.co/en/twice', '2026-09-05T00:00:00.000Z'),
    ],
    { host: HOST, now: NOW, windowDays: 7 },
  );

  assert.deepEqual(selected, ['https://claw-ai.co/en/twice']);
});

test('caps a batch at the protocol maximum', () => {
  const entries = Array.from({ length: 10_050 }, (_, index) =>
    entry(`https://claw-ai.co/en/page-${String(index)}`, '2026-09-06T00:00:00.000Z'),
  );

  assert.equal(selectSubmittableUrls(entries, { host: HOST, now: NOW }).length, 10_000);
});

test('names the key file location on every submission', () => {
  const payload = buildPayload({
    host: HOST,
    key: 'abc',
    keyLocation: 'https://claw-ai.co/abc.txt',
    urlList: ['https://claw-ai.co/en'],
  });

  assert.deepEqual(payload, {
    host: HOST,
    key: 'abc',
    keyLocation: 'https://claw-ai.co/abc.txt',
    urlList: ['https://claw-ai.co/en'],
  });
});
