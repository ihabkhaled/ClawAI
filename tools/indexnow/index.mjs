#!/usr/bin/env node
// Push recently changed URLs to IndexNow (Bing, Yandex, Seznam, Naver).
//
// Why this exists at all: the SEO architecture deferred IndexNow (F7) on the
// grounds that Bing Webmaster manual submission covered the same ground. It
// does, but only when a human remembers. This runs after a production deploy,
// so a page that changed at 14:00 is submitted at 14:00 rather than whenever
// someone next opens the console.
//
// What it submits is deliberately NOT "every URL on the site". IndexNow answers
// repeated submission of unchanged URLs with 429 and treats it as spam, and the
// sitemap already publishes `lastmod` for every entry. So the URL list is
// "everything whose lastmod falls inside the window", which is the protocol's
// own definition of what is worth sending, derived from data the site already
// serves rather than from a guess about what the deploy touched.
//
// It reads the LIVE sitemap rather than importing the content registry. That
// costs a few HTTP requests and buys a real check: if the deployed site is not
// serving what we think it is, the submission is wrong in the same way and we
// find out here rather than in Bing's console a week later.
//
// A failure here NEVER fails the caller. Search-engine notification is not part
// of the deploy's contract, and a 429 from a third party must not turn a
// healthy release red.

const DEFAULT_ENDPOINT = 'https://api.indexnow.org/IndexNow';
// The protocol's per-request ceiling.
const MAX_URLS_PER_REQUEST = 10_000;
// How far back a `lastmod` still counts as "changed". Seven days covers a quiet
// week without re-submitting the whole site, and comfortably spans a weekend of
// no deploys.
const DEFAULT_WINDOW_DAYS = 7;
const REQUEST_TIMEOUT_MS = 20_000;

/** Every `<loc>` in a sitemap or sitemap index, in document order. */
export function extractLocations(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gu)].map((match) => decodeXml(match[1].trim()));
}

/**
 * `<url>` entries paired with their `<lastmod>`.
 *
 * Entries without a `lastmod` are returned with `lastModified: null` rather
 * than dropped. "No date" is not "not changed" — the caller decides, and
 * silently discarding them here would make an undated page permanently
 * unsubmittable.
 */
export function extractUrlEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gu)].map((match) => {
    const block = match[1];
    const loc = /<loc>([\s\S]*?)<\/loc>/u.exec(block);
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/u.exec(block);
    return {
      url: loc === null ? '' : decodeXml(loc[1].trim()),
      lastModified: lastmod === null ? null : decodeXml(lastmod[1].trim()),
    };
  });
}

function decodeXml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

/**
 * The URLs worth submitting: same host, changed inside the window, deduped.
 *
 * Host matching is exact, and it is the security-relevant check rather than a
 * tidiness one. IndexNow answers a submission containing a foreign URL with 422
 * for the WHOLE batch, so one stray absolute URL in the sitemap would silently
 * cost every other URL in the run.
 */
export function selectSubmittableUrls(entries, { host, now, windowDays = DEFAULT_WINDOW_DAYS }) {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const seen = new Set();
  const selected = [];

  for (const entry of entries) {
    if (entry.url === '' || seen.has(entry.url)) {
      continue;
    }
    let parsed;
    try {
      parsed = new URL(entry.url);
    } catch {
      continue;
    }
    if (parsed.host !== host) {
      continue;
    }
    // An undated entry is skipped, not submitted. Every page this site
    // publishes carries a lastmod, so a missing one means the sitemap is not
    // what we think — and submitting the whole undated remainder on every
    // deploy is precisely the spam pattern the window exists to avoid.
    if (entry.lastModified === null) {
      continue;
    }
    const changedAt = Date.parse(entry.lastModified);
    if (Number.isNaN(changedAt) || changedAt < cutoff) {
      continue;
    }
    seen.add(entry.url);
    selected.push(entry.url);
    if (selected.length >= MAX_URLS_PER_REQUEST) {
      break;
    }
  }
  return selected;
}

export function buildPayload({ host, key, keyLocation, urlList }) {
  return { host, key, keyLocation, urlList };
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: 'application/xml' },
  });
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`);
  }
  return response.text();
}

/**
 * Collect every URL entry the site publishes, following the sitemap index.
 *
 * `/sitemap.xml` here is an INDEX of per-locale children, so a single fetch
 * returns child sitemap locations and no page URLs at all. Following one level
 * is enough for this site's shape and is deliberately not recursive: an
 * accidental cycle would otherwise walk forever inside a deploy step.
 */
async function collectEntries(siteUrl) {
  const indexXml = await fetchText(`${siteUrl}/sitemap.xml`);
  const children = extractLocations(indexXml);
  if (children.length === 0) {
    return [];
  }

  const entries = [];
  for (const child of children) {
    try {
      entries.push(...extractUrlEntries(await fetchText(child)));
    } catch (error) {
      // One unreadable child must not discard the others: a partial submission
      // is strictly better than none.
      process.stderr.write(`[indexnow] skipped ${child}: ${String(error)}\n`);
    }
  }
  return entries;
}

async function main() {
  const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/u, '');
  const key = process.env.INDEXNOW_KEY ?? '';
  const endpoint = process.env.INDEXNOW_ENDPOINT ?? DEFAULT_ENDPOINT;
  const windowDays = Number(process.env.INDEXNOW_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);

  if (siteUrl === '' || key === '') {
    process.stdout.write('[indexnow] SITE_URL or INDEXNOW_KEY not set — nothing submitted\n');
    return;
  }

  const host = new URL(siteUrl).host;
  const entries = await collectEntries(siteUrl);
  const urlList = selectSubmittableUrls(entries, { host, now: new Date(), windowDays });

  if (urlList.length === 0) {
    process.stdout.write(
      `[indexnow] no URL changed in the last ${String(windowDays)} days — nothing submitted\n`,
    );
    return;
  }

  const payload = buildPayload({
    host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  process.stdout.write(
    `[indexnow] submitted ${String(urlList.length)} URL(s) -> ${String(response.status)}\n`,
  );
  // 200 and 202 are both success. Everything else is reported and swallowed:
  // 403 means the key file is not being served, 422 that a URL did not belong
  // to the host, 429 that we submitted too often. All are worth seeing in the
  // log and none is worth failing a healthy deploy over.
  if (!response.ok) {
    process.stderr.write(`[indexnow] endpoint refused the batch: ${await response.text()}\n`);
  }
}

// Executed directly (not imported by a test): never propagate a failure.
if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].replace(/\\/gu, '/'))) {
  main().catch((error) => {
    process.stderr.write(`[indexnow] submission failed, continuing: ${String(error)}\n`);
  });
}
