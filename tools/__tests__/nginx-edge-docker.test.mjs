import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { after, before, describe, test } from 'node:test';

import { parseRangesConf } from '../crawlers/ranges.mjs';
import { repoPath } from '../lib/repo.mjs';
import { docker, dockerSkipReason, uniqueName } from './helpers/docker.mjs';
import { counts } from './helpers/fail2ban-filters.mjs';

// ADR-232 behaviour, proved against the REAL nginx.conf, locations.conf and ranges.conf in throwaway containers:
// the config parses, a fake Googlebot is refused, a verified one is welcome, scanners get a tiny 404, the limits
// let a page load through and stop a flood, TLS 1.2 is AEAD only, and a Server-Sent Events stream still streams.
//
// The test config differs from nginx.conf in ONE way: `real_ip_header X-Test-Client-IP`, so a test can choose the
// client address (inside Docker every client would be a private address, which the policy never judges).
//
// Runs with CLAW_DOCKER_TESTS=1. Image: CLAW_NGINX_TEST_IMAGE (default nginx:alpine, what production
// runs); the SSE upstream is CLAW_NODE_TEST_IMAGE (default node:24-bookworm-slim).

const skip = dockerSkipReason();
const NGINX_IMAGE = process.env.CLAW_NGINX_TEST_IMAGE ?? 'nginx:alpine';
const NODE_IMAGE = process.env.CLAW_NODE_TEST_IMAGE ?? 'node:24-bookworm-slim';

const EDGE = uniqueName('edge');
const FRONTEND = uniqueName('frontend');
const CHAT = uniqueName('chat');
const NETWORK = uniqueName('net');

const BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BINGBOT = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';

/** Host-side paths are handed to Docker as they are (Windows drive paths work with Docker Desktop). */
const hostPath = (relative) => repoPath(relative);

let work;

/** A Google IPv4 address from the committed ranges: network + offset, so each test uses its own client. */
function googleAddress(offset) {
  const ranges = parseRangesConf(
    fs.readFileSync(hostPath('infra/nginx/verified-crawlers/ranges.conf'), 'utf8'),
  );
  const cidr = ranges.get('google/googlebot').prefixes.filter((prefix) => !prefix.includes(':'))[
    offset
  ];
  const [network] = cidr.split('/');
  const parts = network.split('.').map(Number);
  parts[3] += 1;
  return parts.join('.');
}

/** curl inside the edge container. Returns { status, body, output }. */
function request({ ip = '198.51.100.20', agent = BROWSER, url = '/', extra = [] }) {
  const result = docker([
    'exec',
    EDGE,
    'curl',
    '-s',
    '--path-as-is',
    '--max-time',
    '20',
    '--cacert',
    '/etc/nginx/certs/claw.crt',
    '--resolve',
    'claw.local:443:127.0.0.1',
    '-H',
    `X-Test-Client-IP: ${ip}`,
    '-A',
    agent,
    '-w',
    '\n%{http_code}',
    ...extra,
    `https://claw.local${url}`,
  ]);
  const lines = result.stdout.split('\n');
  const status = Number(lines.pop());
  return { status, body: lines.join('\n'), output: result.output };
}

/**
 * `count` parallel requests from one address. Returns the status counts, the Retry-After values and the headers of
 * the 429s; with `keepBodies` also the body of one 429 (a refused request cannot be re-sent: a sequential client
 * is slower than the refill, so the refusals must be captured inside the flood itself).
 */
function flood({ ip, agent = BROWSER, url, count, keepBodies = false }) {
  if (keepBodies) docker(['exec', EDGE, 'sh', '-c', 'rm -rf /tmp/fb && mkdir -p /tmp/fb']);
  const result = docker([
    'exec',
    EDGE,
    'curl',
    '-s',
    '-Z',
    '--parallel-max',
    '60',
    '-o',
    keepBodies ? '/tmp/fb/#1' : '/dev/null',
    '--cacert',
    '/etc/nginx/certs/claw.crt',
    '--resolve',
    'claw.local:443:127.0.0.1',
    '-H',
    `X-Test-Client-IP: ${ip}`,
    '-A',
    agent,
    '-w',
    '%{http_code}|%header{retry-after}|%header{content-type}|%header{cache-control}|%header{x-content-type-options}\n',
    `https://claw.local${url}?[1-${count}]`,
  ]);
  const codes = {};
  const retryAfter = new Set();
  const refusedHeaders = [];
  for (const line of result.stdout.split('\n').filter(Boolean)) {
    const [code, after, type, cache, sniff] = line.split('|');
    codes[code] = (codes[code] ?? 0) + 1;
    if (code === '429') {
      retryAfter.add(after);
      refusedHeaders.push({ type, cache, sniff });
    }
  }
  let body = '';
  if (keepBodies) {
    body = docker([
      'exec',
      EDGE,
      'sh',
      '-c',
      'for f in /tmp/fb/*; do if grep -q EDGE_RATE_LIMITED "$f"; then cat "$f"; break; fi; done',
    ]).stdout;
  }
  return {
    codes,
    retryAfter,
    refusedHeaders,
    body,
    total: Object.values(codes).reduce((sum, value) => sum + value, 0),
  };
}

describe('nginx edge policy in throwaway containers (ADR-232)', { skip }, () => {
  before(() => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-edge-'));
    for (const name of ['certs', 'sse']) fs.mkdirSync(path.join(work, name));

    // A throwaway certificate for claw.local and for the SSE upstream's name (nginx verifies upstream certificates).
    const cert = docker([
      'run',
      '--rm',
      '-v',
      `${path.join(work, 'certs')}:/out`,
      NGINX_IMAGE,
      'sh',
      '-c',
      'command -v openssl >/dev/null || apk add --no-cache openssl >/dev/null; ' +
        'openssl req -x509 -newkey rsa:2048 -nodes -keyout /out/claw.key -out /out/claw.crt -days 2 -subj /CN=claw.local ' +
        '-addext subjectAltName=DNS:claw.local,DNS:chat-service >/dev/null 2>&1 && cp /out/claw.crt /out/rootCA.pem && chmod 644 /out/*',
    ]);
    assert.equal(cert.status, 0, cert.output);

    // The test nginx.conf: the repository file plus one real_ip line.
    const conf = fs
      .readFileSync(hostPath('infra/nginx/nginx.conf'), 'utf8')
      .replaceAll('\r\n', '\n');
    assert.ok(conf.includes('\nhttp {\n'));
    fs.writeFileSync(
      path.join(work, 'nginx.test.conf'),
      conf.replace(
        '\nhttp {\n',
        '\nhttp {\n    set_real_ip_from 0.0.0.0/0;\n    real_ip_header X-Test-Client-IP;\n',
      ),
    );
    fs.writeFileSync(
      path.join(work, 'frontend.conf'),
      'events {}\nhttp { server { listen 3000; location / { default_type text/plain; return 200 "frontend-ok"; } } }\n',
    );
    fs.writeFileSync(
      path.join(work, 'sse', 'server.mjs'),
      [
        "import fs from 'node:fs';",
        "import https from 'node:https';",
        "https.createServer({ key: fs.readFileSync('/certs/claw.key'), cert: fs.readFileSync('/certs/claw.crt') }, (req, res) => {",
        "  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });",
        "  res.write('data: first\\n\\n');",
        '  let step = 0;',
        '  const timer = setInterval(() => {',
        '    step += 1;',
        "    if (step === 3) { clearInterval(timer); res.end('data: last\\n\\n'); } else res.write(`data: tick${step}\\n\\n`);",
        '  }, 1200);',
        '}).listen(4002);',
        '',
      ].join('\n'),
    );

    assert.equal(docker(['network', 'create', NETWORK]).status, 0);
    const frontend = docker([
      // The stub also answers to connector-service (nothing listens on its 4003): API routes fail FAST with 502, so a
      // flood is measured by the limiter and not by how long an unreachable upstream takes to time out.
      'run',
      '-d',
      '--name',
      FRONTEND,
      '--network',
      NETWORK,
      '--network-alias',
      'claw-frontend',
      '--network-alias',
      'connector-service',
      '-v',
      `${path.join(work, 'frontend.conf')}:/etc/nginx/nginx.conf:ro`,
      NGINX_IMAGE,
    ]);
    assert.equal(frontend.status, 0, frontend.output);
    const chat = docker([
      'run',
      '-d',
      '--name',
      CHAT,
      '--network',
      NETWORK,
      '--network-alias',
      'chat-service',
      '-v',
      `${path.join(work, 'sse')}:/app:ro`,
      '-v',
      `${path.join(work, 'certs')}:/certs:ro`,
      NODE_IMAGE,
      'node',
      '/app/server.mjs',
    ]);
    assert.equal(chat.status, 0, chat.output);
    const edge = docker([
      'run',
      '-d',
      '--name',
      EDGE,
      '--network',
      NETWORK,
      '-v',
      `${path.join(work, 'nginx.test.conf')}:/etc/nginx/nginx.conf:ro`,
      '-v',
      `${hostPath('infra/nginx/locations.conf')}:/etc/nginx/claw/locations.conf:ro`,
      '-v',
      `${hostPath('infra/nginx/verified-crawlers')}:/etc/nginx/claw/verified-crawlers:ro`,
      '-v',
      `${path.join(work, 'certs')}:/etc/nginx/certs:ro`,
      '--entrypoint',
      'sh',
      NGINX_IMAGE,
      '-c',
      'mkdir -p /etc/nginx/claw/public-tls; command -v openssl >/dev/null || apk add --no-cache openssl >/dev/null 2>&1; exec nginx -g "daemon off;"',
    ]);
    assert.equal(edge.status, 0, edge.output);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (request({ url: '/robots.txt' }).status === 200) return;
      docker(['exec', EDGE, 'sleep', '0.5']);
    }
    assert.fail(`the edge never answered: ${docker(['logs', EDGE]).output}`);
  });

  after(() => {
    docker(['rm', '-f', EDGE, FRONTEND, CHAT]);
    docker(['network', 'rm', NETWORK]);
    if (work) fs.rmSync(work, { recursive: true, force: true });
  });

  test('nginx -t passes on the repository configuration', () => {
    const result = docker(['exec', EDGE, 'nginx', '-t']);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /test is successful/u);
  });

  test('the distributed template renders through envsubst and passes nginx -t too', () => {
    const template = fs.readFileSync(
      hostPath('infra/nginx/nginx.distributed.conf.template'),
      'utf8',
    );
    const variables = [
      ...new Set([...template.matchAll(/\$\{(CLAW_[A-Z_]+)\}/gu)].map((match) => match[1])),
    ];
    assert.ok(variables.length > 20);
    const environment = variables.flatMap((name) => ['-e', `${name}=example.invalid`]);
    const result = docker([
      'run',
      '--rm',
      ...environment,
      '-e',
      'CLAW_DNS_RESOLVER=1.1.1.1',
      '-e',
      'CLAW_TLS_CERT_PATH=/etc/nginx/certs/claw.crt',
      '-e',
      'CLAW_TLS_KEY_PATH=/etc/nginx/certs/claw.key',
      '-e',
      'NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx',
      '-v',
      `${hostPath('infra/nginx/nginx.distributed.conf.template')}:/etc/nginx/templates/nginx.conf.template:ro`,
      '-v',
      `${hostPath('infra/nginx/verified-crawlers')}:/etc/nginx/claw/verified-crawlers:ro`,
      '-v',
      `${path.join(work, 'certs')}:/etc/nginx/certs:ro`,
      '--entrypoint',
      'sh',
      NGINX_IMAGE,
      '-c',
      '/docker-entrypoint.d/20-envsubst-on-templates.sh >/dev/null 2>&1; nginx -t 2>&1',
    ]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /test is successful/u);
  });

  test('a VERIFIED Googlebot is welcome, a FAKE one is refused with 403, whatever page it asks for', () => {
    const real = googleAddress(0);
    assert.equal(request({ ip: real, agent: GOOGLEBOT, url: '/' }).status, 200);
    assert.equal(
      request({ ip: real, agent: GOOGLEBOT, url: '/learn/anything' }).body,
      'frontend-ok',
    );
    for (const url of ['/', '/robots.txt', '/api/v1/models']) {
      assert.equal(
        request({ ip: '203.0.113.50', agent: GOOGLEBOT, url }).status,
        403,
        `fake Googlebot on ${url}`,
      );
    }
    assert.equal(
      request({ ip: real, agent: BINGBOT, url: '/' }).status,
      403,
      'a Google address does not prove Bingbot',
    );
    assert.equal(request({ ip: '203.0.113.51', agent: 'CCBot/2.0', url: '/' }).status, 403);
  });

  test('ordinary visitors, reverse-DNS-only bots and private sources are never refused for a crawler claim', () => {
    assert.equal(request({ ip: '203.0.113.52', agent: BROWSER }).status, 200);
    assert.equal(
      request({
        ip: '203.0.113.52',
        agent: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
      }).status,
      200,
    );
    assert.equal(
      request({ ip: '203.0.113.52', agent: 'Mozilla/5.0 (compatible; Baiduspider/2.0)' }).status,
      200,
    );
    assert.equal(request({ ip: '203.0.113.52', agent: 'Mozilla/5.0 xccbotx' }).status, 200);
    // IPv6 clients behind docker-proxy arrive as a private bridge address: unverifiable, so never judged.
    assert.equal(request({ ip: '172.18.0.1', agent: GOOGLEBOT }).status, 200);
  });

  test('robots.txt, sitemaps, feeds, llms.txt and /.well-known stay reachable', () => {
    for (const url of [
      '/robots.txt',
      '/sitemap.xml',
      '/sitemaps/en.xml',
      '/feed.xml',
      '/rss.xml',
      '/feeds/topics.xml',
      '/llms.txt',
      '/ads.txt',
      '/f97f50a25a734944bee9b54602a6ad0a.txt',
      '/.well-known/security.txt',
      '/manifest.webmanifest',
      '/favicon.ico',
    ]) {
      for (const [ip, agent] of [
        ['203.0.113.60', BROWSER],
        [googleAddress(1), GOOGLEBOT],
      ]) {
        const answer = request({ ip, agent, url });
        assert.equal(answer.status, 200, `${url} for ${agent.slice(0, 30)}`);
        assert.equal(answer.body, 'frontend-ok', `${url} must reach the site`);
      }
    }
  });

  test("scanner probes get nginx's own tiny 404 and never reach the site", () => {
    for (const url of [
      '/.env',
      '/.git/config',
      '/docker-compose.yml',
      '/package.json',
      '/swagger.json',
      '/wp-login.php',
      '/x.php?a=1',
      '/.aws/credentials',
      '/backup.sql',
      '/api/.env',
      '/phpmyadmin/',
      '/actuator/health',
    ]) {
      const answer = request({ ip: '203.0.113.61', url });
      assert.equal(answer.status, 404, url);
      assert.ok(
        answer.body.length < 2048,
        `${url}: a ${answer.body.length} byte body is not a tiny 404 (Next.js sends ~470000)`,
      );
      assert.notEqual(answer.body, 'frontend-ok', url);
    }
    // nginx refuses a path that climbs out of the root before any rule runs; the answer is 400 and also tiny.
    for (const url of ['/a/../../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd']) {
      const answer = request({ ip: '203.0.113.61', url });
      assert.ok([400, 404].includes(answer.status), `${url}: ${answer.status}`);
      assert.ok(answer.body.length < 2048);
    }
    // A traversal that stays inside the root is caught by the map.
    assert.equal(request({ ip: '203.0.113.61', url: '/a/..%2f.env' }).status, 404);
    // Legitimate look-alikes are served.
    for (const url of [
      '/api/v1/files/1/download/package.json',
      '/learn/ssl-vs-tls',
      '/threads/node.js-tips',
      '/?next=/.git/config',
    ]) {
      assert.notEqual(
        request({ ip: '203.0.113.62', url }).status,
        404,
        url === '/threads/node.js-tips' ? 'the site 404 is the frontend, not the map' : url,
      );
    }
  });

  test('a real page load plus its API calls never hits a limit, and a flood is stopped with 429 + Retry-After', () => {
    const pageLoad = flood({ ip: '198.51.100.31', url: '/api/pricing', count: 200 });
    assert.equal(pageLoad.codes['200'], 200, JSON.stringify(pageLoad.codes));
    assert.equal(pageLoad.codes['429'], undefined);

    const burst = flood({ ip: '198.51.100.32', url: '/api/pricing', count: 1500 });
    assert.equal(burst.total, 1500);
    assert.ok(
      burst.codes['200'] >= 400,
      `the budget lets at least the burst through: ${JSON.stringify(burst.codes)}`,
    );
    assert.ok(
      (burst.codes['429'] ?? 0) >= 50,
      `a flood is stopped: ${JSON.stringify(burst.codes)}`,
    );
    assert.deepEqual([...burst.retryAfter], ['10'], 'every nginx 429 carries Retry-After');

    // An API route (not the frontend location) refuses the same way, before any service is asked.
    const api = flood({
      ip: '198.51.100.34',
      url: '/api/v1/models',
      count: 1500,
      keepBodies: true,
    });
    assert.ok((api.codes['429'] ?? 0) >= 50, JSON.stringify(api.codes));
    assert.match(api.body, /"code":"EDGE_RATE_LIMITED"/u);

    // The refusal itself: JSON, never cached, nosniff, Retry-After.
    const refused = flood({
      ip: '198.51.100.33',
      url: '/api/pricing',
      count: 700,
      keepBodies: true,
    });
    assert.ok((refused.codes['429'] ?? 0) >= 50);
    assert.match(refused.body, /"code":"EDGE_RATE_LIMITED"/u);
    for (const headers of refused.refusedHeaders) {
      assert.equal(headers.type, 'application/json');
      assert.equal(headers.cache, 'no-store');
      assert.equal(headers.sniff, 'nosniff');
    }
  });

  test('immutable static assets have their own, larger budget and never spend the dynamic one', () => {
    const assets = flood({ ip: '198.51.100.41', url: '/_next/static/chunks/main.js', count: 900 });
    assert.equal(assets.codes['200'], 900, JSON.stringify(assets.codes));
    const afterwards = flood({ ip: '198.51.100.41', url: '/api/pricing', count: 300 });
    assert.equal(
      afterwards.codes['200'],
      300,
      'the dynamic budget is untouched by a page of assets',
    );
    const storm = flood({ ip: '198.51.100.42', url: '/_next/static/chunks/main.js', count: 3000 });
    assert.ok((storm.codes['429'] ?? 0) >= 50, JSON.stringify(storm.codes));
  });

  test('a verified crawler has its own generous limit: 429 and a longer Retry-After only when it floods', () => {
    const gentle = flood({ ip: googleAddress(2), agent: GOOGLEBOT, url: '/learn/x', count: 120 });
    assert.equal(gentle.codes['200'], 120, JSON.stringify(gentle.codes));
    const abusive = flood({ ip: googleAddress(3), agent: GOOGLEBOT, url: '/learn/y', count: 900 });
    assert.ok((abusive.codes['429'] ?? 0) >= 100, JSON.stringify(abusive.codes));
    assert.deepEqual([...abusive.retryAfter], ['120']);
    // It never spent a human's budget: the same address as a browser would not be verified, but a verified
    // crawler's requests are counted nowhere but claw_crawler.
    const log = docker(['logs', EDGE]).output;
    assert.match(
      log,
      new RegExp(
        `^${googleAddress(3).replaceAll('.', '\\.')} .* 429 .* crawler=google verdict=verified$`,
        'mu',
      ),
    );
  });

  test('the access log ends with the verdict, and the fail2ban filters read exactly what nginx wrote', () => {
    request({ ip: '203.0.113.70', agent: GOOGLEBOT, url: '/' });
    request({ ip: '203.0.113.71', url: '/.env' });
    request({ ip: googleAddress(4), agent: GOOGLEBOT, url: '/wp-login.php' });
    const lines = docker(['logs', EDGE]).output.split('\n');
    const find = (needle) => lines.find((line) => line.includes(needle));
    const fake = find('203.0.113.70 ');
    assert.match(
      fake,
      /"GET \/ HTTP\/2\.0" 403 \d+ "-" ".*Googlebot.*" crawler=google verdict=fake$/u,
    );
    assert.ok(counts('claw-nginx-fakebot', fake));
    const probe = find('203.0.113.71 ');
    assert.match(probe, / 404 /u);
    assert.ok(
      counts('claw-nginx-scan', probe),
      'the scan jail still sees the probe nginx answered itself',
    );
    const verifiedProbe = find(`${googleAddress(4)} - - `);
    assert.match(verifiedProbe, /crawler=google verdict=verified$/u);
    assert.ok(
      !counts('claw-nginx-scan', verifiedProbe),
      'a verified crawler is never banned for a stale URL',
    );
    assert.ok(lines.some((line) => /verdict=none$/u.test(line)));
  });

  test('TLS 1.2 offers AEAD suites only; CBC and RSA key exchange are refused; TLS 1.3 works', () => {
    const handshake = (args) =>
      docker([
        'exec',
        EDGE,
        'sh',
        '-c',
        `echo | openssl s_client -connect 127.0.0.1:443 -servername claw.local ${args} 2>&1`,
      ]).stdout;
    for (const suite of [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-CHACHA20-POLY1305',
    ]) {
      assert.match(
        handshake(`-tls1_2 -cipher ${suite}`),
        new RegExp(`Cipher is ${suite}|Cipher\\s*:\\s*${suite}`, 'u'),
        suite,
      );
    }
    for (const suite of [
      'AES128-SHA',
      'AES256-SHA',
      'ECDHE-RSA-AES128-SHA',
      'ECDHE-RSA-AES256-SHA',
      'AES128-GCM-SHA256',
      'DHE-RSA-AES128-SHA',
    ]) {
      assert.match(
        handshake(`-tls1_2 -cipher ${suite}`),
        /Cipher is \(NONE\)|no ciphers available|handshake failure/u,
        `${suite} must be refused`,
      );
    }
    assert.match(handshake('-tls1_3'), /Protocol\s*:?\s*TLSv1\.3|TLSv1\.3/u);
  });

  test('a Server-Sent Events stream through the chat route is delivered as it is produced, not buffered', () => {
    const script =
      'curl -sN --max-time 15 --cacert /etc/nginx/certs/claw.crt --resolve claw.local:443:127.0.0.1 ' +
      '-H "X-Test-Client-IP: 198.51.100.90" -A "Mozilla/5.0" -X POST -H "content-type: application/json" -d "{}" ' +
      'https://claw.local/api/v1/chat-messages/stream > /tmp/sse.out & sleep 0.6; echo MID; cat /tmp/sse.out; echo ENDMID; wait; echo FINAL; cat /tmp/sse.out';
    const out = docker(['exec', EDGE, 'sh', '-c', script], { timeout: 60_000 }).stdout;
    const middle = out.slice(out.indexOf('MID\n'), out.indexOf('ENDMID'));
    assert.match(middle, /data: first/u, 'the first event arrives while the stream is still open');
    assert.doesNotMatch(middle, /data: last/u, 'the last event has not been produced yet');
    const final = out.slice(out.indexOf('FINAL'));
    for (const event of ['first', 'tick1', 'tick2', 'last'])
      assert.match(final, new RegExp(`data: ${event}`, 'u'));
  });

  test('a large chat or upload body is still accepted at the edge (the global 75m cap), a login body is capped', () => {
    const post = (url, size) =>
      docker([
        'exec',
        EDGE,
        'sh',
        '-c',
        `head -c ${size} /dev/zero | tr '\\0' 'a' | curl -s -o /dev/null -w '%{http_code}' --cacert /etc/nginx/certs/claw.crt --resolve claw.local:443:127.0.0.1 ` +
          `-H 'X-Test-Client-IP: 198.51.100.95' -A Mozilla/5.0 -X POST -H 'content-type: text/plain' --data-binary @- https://claw.local${url}`,
      ]).stdout.trim();
    // 3 MiB to chat and Threads: nginx lets it through (the upstream is not there, so 502/504, never 413).
    for (const url of [
      '/api/v1/chat-messages',
      '/api/v1/chat-threads',
      '/api/v1/thread-publications',
      '/api/v1/files',
    ]) {
      assert.notEqual(post(url, 3 * 1024 * 1024), '413', url);
    }
    assert.equal(post('/api/v1/auth/login', 70 * 1024), '413', 'a login body is capped at 64k');
  });
});
