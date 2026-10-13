// Live API smoke for the Threads Board. Read-only: publishes nothing.
//   BOARD_BASE=https://claw.local/api/v1 BOARD_INSECURE_TLS=1 \
//   BOARD_EMAIL=admin@claw.local BOARD_PASSWORD=<password> node scripts/qa/threads-board-smoke.mjs
const BASE = process.env.BOARD_BASE ?? 'https://claw.local/api/v1';
const EMAIL = process.env.BOARD_EMAIL ?? 'admin@claw.local';
const PASSWORD = process.env.BOARD_PASSWORD ?? 'ClawAdmin123!';
if (process.env.BOARD_INSECURE_TLS === '1') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const FORBIDDEN = /owner|author|hash|email|password|token/i;
const ITEM_KEYS = [
  'slug',
  'title',
  'excerpt',
  'contentLocale',
  'publicationType',
  'publishedAt',
  'readingMinutes',
  'sourceCount',
  'likeCount',
  'commentCount',
  'viewCount',
  'viewerReaction',
];
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -- ${detail}`}`);
}

function leakedKeys(value, found = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((v) => leakedKeys(v, found));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN.test(k)) found.add(k);
      leakedKeys(v, found);
    }
  }
  return found;
}

async function call(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, headers: res.headers, body };
}

async function main() {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.ok) throw new Error(`login failed ${login.status}`);
  const token = (await login.json()).tokens.accessToken;

  const anon = await call('/thread-publications/board');
  check('anonymous board list -> 401', anon.status === 401, `got ${anon.status}`);
  const anonSuggest = await call('/thread-publications/board/suggest?q=vector');
  check('anonymous suggest -> 401', anonSuggest.status === 401, `got ${anonSuggest.status}`);

  const list = await call('/thread-publications/board?limit=12&page=1', token);
  check('list 200', list.status === 200, `got ${list.status}`);
  const meta = list.body?.meta;
  check(
    'meta has total/page/limit/totalPages',
    Boolean(meta) &&
      ['total', 'page', 'limit', 'totalPages'].every((k) => Number.isInteger(meta[k])),
    JSON.stringify(meta),
  );
  check('items <= limit', Array.isArray(list.body?.items) && list.body.items.length <= 12);
  check(
    'totalPages consistent',
    Boolean(meta) && meta.totalPages === Math.ceil(meta.total / meta.limit),
    JSON.stringify(meta),
  );
  const expectedKeys = [...ITEM_KEYS].sort().join(',');
  const badItem = (list.body?.items ?? []).find(
    (i) => Object.keys(i).sort().join(',') !== expectedKeys,
  );
  check(
    'every item has exactly the BoardItem fields',
    !badItem,
    badItem ? Object.keys(badItem).join(',') : '',
  );
  check(
    'no leaked fields in list',
    leakedKeys(list.body).size === 0,
    [...leakedKeys(list.body)].join(','),
  );

  for (const limit of [24, 48]) {
    const r = await call(`/thread-publications/board?limit=${limit}`, token);
    check(
      `limit=${limit} accepted`,
      r.status === 200 && r.body?.meta?.limit === limit,
      `status ${r.status}`,
    );
  }
  const bigLimit = await call('/thread-publications/board?limit=500', token);
  check(
    'limit=500 rejected or clamped',
    bigLimit.status === 400 || (bigLimit.status === 200 && bigLimit.body.meta.limit <= 48),
    `status ${bigLimit.status}`,
  );

  if (meta && meta.totalPages >= 2) {
    const p2 = await call('/thread-publications/board?limit=12&page=2', token);
    const first = new Set(list.body.items.map((i) => i.slug));
    check(
      'page 2 has no overlap with page 1',
      p2.status === 200 && p2.body.items.every((i) => !first.has(i.slug)),
    );
  } else {
    console.log('SKIP  page 2 (fewer than 2 pages of data)');
  }

  for (const sort of ['latest', 'trending', 'discussed', 'liked']) {
    const r = await call(`/thread-publications/board?sort=${sort}`, token);
    check(`sort=${sort} -> 200`, r.status === 200, `got ${r.status}`);
    if (sort === 'latest' && r.body?.items?.length > 1) {
      const t = r.body.items.map((i) => Date.parse(i.publishedAt));
      check(
        'sort=latest is newest first',
        t.every((v, i) => i === 0 || t[i - 1] >= v),
      );
    }
    if (sort === 'liked' && r.body?.items?.length > 1) {
      const l = r.body.items.map((i) => i.likeCount);
      check(
        'sort=liked is descending',
        l.every((v, i) => i === 0 || l[i - 1] >= v),
      );
    }
  }
  const badSort = await call('/thread-publications/board?sort=nonsense', token);
  check('invalid sort -> 400', badSort.status === 400, `got ${badSort.status}`);

  const sug = await call('/thread-publications/board/suggest?q=vector', token);
  check('suggest 200', sug.status === 200, `got ${sug.status}`);
  const rows = sug.body?.suggestions ?? [];
  check('suggest <= 10 rows', rows.length <= 10, `got ${rows.length}`);
  check(
    'suggest total capped at 100',
    sug.body?.total <= 100 && typeof sug.body?.totalCapped === 'boolean',
  );
  check(
    'suggest match offsets are [start,end] within title',
    rows.every((r) =>
      r.match.every(
        ([a, b]) =>
          Number.isInteger(a) && Number.isInteger(b) && a >= 0 && a < b && b <= r.title.length,
      ),
    ),
  );
  check(
    'no leaked fields in suggest',
    leakedKeys(sug.body).size === 0,
    [...leakedKeys(sug.body)].join(','),
  );

  const typo = await call('/thread-publications/board/suggest?q=vectr', token);
  check(
    'misspelled word returns hits or didYouMean',
    typo.status === 200 &&
      ((typo.body.suggestions?.length ?? 0) > 0 || typeof typo.body.didYouMean === 'string'),
    JSON.stringify(typo.body),
  );
  const typoList = await call('/thread-publications/board?q=vectr', token);
  check(
    'misspelled list returns hits or didYouMean',
    typoList.status === 200 &&
      (typoList.body.items.length > 0 || typeof typoList.body.didYouMean === 'string'),
  );

  const empty = await call('/thread-publications/board?q=', token);
  check(
    'empty q behaves like unfiltered list',
    empty.status === 200 && empty.body.meta.total === meta?.total,
    `status ${empty.status}`,
  );
  const emptySuggest = await call('/thread-publications/board/suggest?q=', token);
  check(
    'empty q suggest -> 200 empty or 400',
    (emptySuggest.status === 200 && emptySuggest.body.suggestions.length === 0) ||
      emptySuggest.status === 400,
  );

  const ar = await call('/thread-publications/board?lang=ar', token);
  check(
    'lang=ar only returns ar',
    ar.status === 200 && ar.body.items.every((i) => i.contentLocale === 'ar'),
  );
  const allLang = await call('/thread-publications/board?lang=all', token);
  check('lang=all -> 200', allLang.status === 200);

  let limited = false;
  let sawHeader = false;
  for (let i = 0; i < 40 && !limited; i += 1) {
    const r = await call('/thread-publications/board/suggest?q=vector', token);
    if ([...r.headers.keys()].some((h) => /ratelimit|retry-after/i.test(h))) sawHeader = true;
    if (r.status === 429) limited = true;
  }
  check(
    'throttling headers present or 429 reached',
    limited || sawHeader,
    'no rate-limit signal in 40 calls',
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
