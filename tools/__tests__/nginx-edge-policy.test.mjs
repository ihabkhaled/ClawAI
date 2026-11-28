import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { test } from 'node:test';

import { parse } from 'yaml';

import { CRAWLER_OPERATORS } from '../crawlers/crawler-sources.mjs';
import { repoPath } from '../lib/repo.mjs';
import { counts, readIni } from './helpers/fail2ban-filters.mjs';

// ADR-232: verified crawlers, smart edge rate limits, scanner probes, AEAD-only TLS and fail2ban. The behaviour is
// proved in a throwaway container by nginx-edge-docker.test.mjs; these tests pin the structure that behaviour
// depends on, run everywhere (no Docker) and read the SAME regular expressions nginx runs.

const read = (relative) => fs.readFileSync(repoPath(relative), 'utf8').replaceAll('\r\n', '\n');
const NGINX_CONF = read('infra/nginx/nginx.conf');
const TEMPLATE = read('infra/nginx/nginx.distributed.conf.template');
const LOCATIONS = read('infra/nginx/locations.conf');

/** The text between the policy markers. */
function policyBlock(text) {
  const start = text.indexOf('# BEGIN claw-edge-policy');
  const end = text.indexOf('# END claw-edge-policy');
  assert.ok(start >= 0 && end > start, 'the claw-edge-policy markers are missing');
  return text.slice(start, end);
}

/** Every `{ ... }` block with its head and its OWN lines (nested blocks excluded). */
function blocks(text) {
  const result = [];
  const stack = [];
  for (const line of text.split('\n')) {
    const code = line.replace(/#.*$/u, '');
    if (/\{\s*$/u.test(code)) stack.push({ head: code.trim().replace(/\s*\{$/u, ''), lines: [] });
    else if (/^\s*\}/u.test(code)) result.push(stack.pop());
    else if (stack.length > 0) stack.at(-1).lines.push(code);
  }
  return result.filter(Boolean);
}

/** The `key value;` pairs of one `map` block, in order. Regex keys keep their `~` / `~*` marker. */
function mapEntries(text, variable) {
  const block = blocks(policyBlock(text)).find((candidate) =>
    new RegExp(String.raw`^map\s+.*\s\$${variable}$`, 'u').test(candidate.head),
  );
  assert.ok(block, `map $${variable} is missing`);
  return block.lines
    .map((line) => /^\s*(?:"((?:[^"\\]|\\.)*)"|(\S+))\s+(.+?);\s*$/u.exec(line))
    .filter(Boolean)
    .map((match) => ({ key: match[1] ?? match[2], value: match[3].replaceAll('"', '') }));
}

/** nginx's `map` over a value: the first regex line that matches wins, then `default`. Exact keys compare equal. */
function resolveMap(entries, input) {
  for (const { key, value } of entries) {
    if (key === 'default') continue;
    if (key.startsWith('~')) {
      const insensitive = key.startsWith('~*');
      if (new RegExp(key.slice(insensitive ? 2 : 1), insensitive ? 'iu' : 'u').test(input))
        return value;
    } else if (key === input) return value;
  }
  return entries.find((entry) => entry.key === 'default')?.value ?? '';
}

// --- one policy, two files ------------------------------------------------------------------------------------
test('the edge policy block is byte-identical in nginx.conf and the distributed template', () => {
  assert.equal(policyBlock(NGINX_CONF), policyBlock(TEMPLATE));
});

test('the distributed template documents the ranges directory it needs', () => {
  assert.match(TEMPLATE, /verified-crawlers:\/etc\/nginx\/claw\/verified-crawlers:ro/u);
});

// --- crawler claim, address proof, verdict ---------------------------------------------------------------------
const CLAIMED = mapEntries(NGINX_CONF, 'claw_crawler_claimed');

test('every operator in the range sources is claimed by a User-Agent pattern, and nothing else is', () => {
  const claimed = new Set(
    CLAIMED.filter((entry) => entry.key !== 'default').map((entry) => entry.value),
  );
  assert.deepEqual([...claimed].sort(), [...CRAWLER_OPERATORS].sort());
});

test('real crawler User-Agents claim their operator; browsers and reverse-DNS-only bots claim nothing', () => {
  const claims = [
    ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'google'],
    ['Googlebot-Image/1.0', 'google'],
    ['AdsBot-Google (+http://www.google.com/adsbot.html)', 'google'],
    [
      'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'google',
    ],
    ['Mozilla/5.0 (compatible; Google-InspectionTool/1.0)', 'google'],
    ['Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'bing'],
    [
      'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
      'apple',
    ],
    ['DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)', 'duckduckgo'],
    [
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot',
      'openai',
    ],
    [
      'Mozilla/5.0 AppleWebKit/537.36 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
      'openai',
    ],
    [
      'Mozilla/5.0 AppleWebKit/537.36 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
      'openai',
    ],
    [
      'Mozilla/5.0 AppleWebKit/537.36 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
      'perplexity',
    ],
    [
      'Mozilla/5.0 AppleWebKit/537.36 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
      'perplexity',
    ],
    [
      'Mozilla/5.0 AppleWebKit/537.36 (compatible; MistralAI-User/1.0; +https://docs.mistral.ai/robots)',
      'mistral',
    ],
    ['CCBot/2.0 (https://commoncrawl.org/faq/)', 'commoncrawl'],
    ['Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)', 'ahrefs'],
    ['GOOGLEBOT', 'google'],
    // Nothing claimed: people, bots that publish no ranges, and look-alikes.
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      '',
    ],
    ['Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)', ''],
    ['Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)', ''],
    ['Mozilla/5.0 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)', ''],
    ['Mozilla/5.0 (compatible; SeznamBot/4.0)', ''],
    ['Mozilla/5.0 AppleWebKit/537.36 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', ''],
    [
      'Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)',
      '',
    ],
    ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', ''],
    ['Mozilla/5.0 xccbotx', ''],
    ['notgooglebot', ''],
    ['Mozilla/5.0 Chrome-Lighthouse', ''],
    ['', ''],
  ];
  for (const [agent, expected] of claims) {
    assert.equal(resolveMap(CLAIMED, agent), expected, JSON.stringify(agent));
  }
});

test('the verdict is verified only for the SAME operator, fake otherwise, and never judged on a private address', () => {
  const verdict = mapEntries(NGINX_CONF, 'claw_crawler_verdict');
  const cases = [
    ['google|google|0', 'verified'],
    ['bing|bing|0', 'verified'],
    ['google||0', 'fake'],
    ['google|bing|0', 'fake'],
    ['openai|google|0', 'fake'],
    ['||0', 'none'],
    ['|google|0', 'none'],
    ['||1', 'none'],
    ['google||1', 'unchecked'],
    ['bing|bing|1', 'unchecked'],
  ];
  for (const [key, expected] of cases) assert.equal(resolveMap(verdict, key), expected, key);
});

test('private and docker source addresses are recognised, public ones are not', () => {
  const privateMap = mapEntries(NGINX_CONF, 'claw_addr_private');
  for (const address of [
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.18.0.1',
    '172.31.255.1',
    '192.168.1.5',
    '169.254.1.1',
    '100.64.0.1',
    '100.127.0.1',
    '::1',
    'fd12:3456::1',
    'fe80::1',
  ]) {
    assert.equal(resolveMap(privateMap, address), '1', address);
  }
  for (const address of [
    '8.8.8.8',
    '66.249.64.1',
    '172.15.0.1',
    '172.32.0.1',
    '100.63.0.1',
    '100.128.0.1',
    '2001:4860:4801:10::1',
    '2a00:1450:4001::1',
  ]) {
    assert.equal(resolveMap(privateMap, address), '0', address);
  }
});

test('static assets are recognised, dynamic routes and API paths are not', () => {
  const staticMap = mapEntries(NGINX_CONF, 'claw_static_asset');
  for (const uri of [
    '/_next/static/chunks/main-abc.js',
    '/_next/static/media/font.woff2',
    '/claw-logo.png',
    '/favicon.ico',
    '/sw.js',
    '/marketing/app/a.webp',
    '/fonts/x.woff2',
  ]) {
    assert.equal(resolveMap(staticMap, uri), '1', uri);
  }
  for (const uri of [
    '/',
    '/learn/foo',
    '/api/v1/files/1/download.png',
    '/api/pricing',
    '/_next/image',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/feed.xml',
    '/manifest.webmanifest',
    '/threads/a.png/b',
  ]) {
    assert.equal(resolveMap(staticMap, uri), '0', uri);
  }
});

// --- scanner probes --------------------------------------------------------------------------------------------
const SCANNER = mapEntries(NGINX_CONF, 'claw_scanner_probe');

test('scanner probes are answered with a tiny 404, and nothing the site serves is mistaken for one', () => {
  const probes = [
    '/.env',
    '/.env.production',
    '/.git/config',
    '/.git/HEAD',
    '/.aws/credentials',
    '/.ssh/id_rsa',
    '/.htaccess',
    '/.DS_Store',
    '/a/.env',
    '/api/.env',
    '/%2e%2e/%2e%2e/etc/passwd',
    '/a/../../etc/passwd',
    '/a/..%2f..%2fetc/passwd',
    '/x?file=../../etc/passwd',
    '/docker-compose.yml',
    '/docker-compose.prod.yaml',
    '/Dockerfile',
    '/package.json',
    '/package-lock.json',
    '/composer.json',
    '/composer.lock',
    '/yarn.lock',
    '/tsconfig.json',
    '/swagger.json',
    '/swagger-ui/',
    '/swagger/v1/swagger.json',
    '/openapi.json',
    '/v2/api-docs',
    '/appsettings.json',
    '/config.json',
    '/web.config',
    '/phpinfo.php',
    '/index.php',
    '/x.php?a=1',
    '/wp-login.php',
    '/wp-admin/install.php',
    '/wp-content/plugins/x',
    '/xmlrpc.php',
    '/phpmyadmin/',
    '/pma/',
    '/actuator/health',
    '/cgi-bin/test.cgi',
    '/server-status',
    '/@id/__vite-browser-external',
    '/@fs/etc/passwd',
    '/vendor/phpunit/src/Util/PHP/eval-stdin.php',
    '/backup.sql',
    '/db.sql.gz',
    '/site.zip',
    '/www.tar.gz',
    '/dump.sql',
    '/server.key',
    '/id_rsa.pem',
    '/settings.yml',
    '/x.asp',
    '/x.aspx',
    '/x.jsp',
  ];
  for (const uri of probes)
    assert.equal(resolveMap(SCANNER, uri), '1', `${uri} must be answered by nginx`);

  const served = [
    '/',
    '/robots.txt',
    '/sitemap.xml',
    '/sitemaps/en.xml',
    '/feed.xml',
    '/rss.xml',
    '/feeds/topics.xml',
    '/llms.txt',
    '/ads.txt',
    '/f97f50a25a734944bee9b54602a6ad0a.txt',
    '/discovery.xsl',
    '/favicon.ico',
    '/manifest.webmanifest',
    '/.well-known/security.txt',
    '/.well-known/acme-challenge/token',
    '/.well-known/assetlinks.json',
    '/.well-known',
    '/learn/model-context',
    '/pricing?plan=pro.v2',
    '/threads/how-to-use-redis',
    '/api/pricing',
    '/api/version',
    '/api/contact',
    '/api/v1/auth/login',
    '/api/v1/health',
    '/api/v1/files/42/download/package.json',
    '/api/v1/files/42/download/docker-compose.yml',
    '/api/v1/files/42/download/export.zip',
    '/api/v1/public/artifacts/abc',
    '/_next/static/chunks/app/layout-1a2b.js',
    '/_next/image?url=%2Fclaw-logo.png&w=64&q=75',
    '/_next/data/build/en/index.json',
    '/share/abc123',
    '/claw-logo.png',
    '/marketing/app/home.webp',
    '/search?q=.env',
    '/?next=/.git/config',
    '/threads/node.js-tips',
    '/learn/ssl-vs-tls',
  ];
  for (const uri of served)
    assert.equal(resolveMap(SCANNER, uri), '0', `${uri} must reach the site`);
});

// --- rate limits -------------------------------------------------------------------------------------------------
test('every location with its own limit_req repeats the general and the crawler budget', () => {
  for (const [name, text] of [
    ['locations.conf', LOCATIONS],
    ['the distributed template', TEMPLATE],
  ]) {
    for (const block of blocks(text)) {
      if (!block.head.startsWith('location')) continue;
      const lines = block.lines.join('\n');
      if (!/limit_req\s+zone=/u.test(lines)) continue;
      assert.match(
        lines,
        /limit_req\s+zone=claw_general\s+burst=400\s+nodelay;/u,
        `${name}: "${block.head}" lacks claw_general`,
      );
      assert.match(
        lines,
        /limit_req\s+zone=claw_crawler\s+burst=150\s+nodelay;/u,
        `${name}: "${block.head}" lacks claw_crawler`,
      );
    }
  }
});

test('the server level carries the verdict checks, the three budgets and the 429 answer, in both files', () => {
  for (const [name, text] of [
    ['locations.conf', LOCATIONS],
    ['the distributed template', TEMPLATE],
  ]) {
    assert.match(text, /if \(\$claw_crawler_verdict = fake\) \{ return 403; \}/u, name);
    assert.match(text, /if \(\$claw_scanner_probe\) \{ return 404; \}/u, name);
    for (const zone of [
      'claw_general burst=400',
      'claw_static burst=1000',
      'claw_crawler burst=150',
    ]) {
      assert.ok(text.includes(`limit_req zone=${zone} nodelay;`), `${name}: ${zone}`);
    }
    assert.match(text, /error_page 429 @claw_429;/u, name);
    const named = blocks(text).find((block) => block.head === 'location @claw_429');
    assert.ok(named, `${name}: location @claw_429 is missing`);
    const body = named.lines.join('\n');
    assert.match(body, /add_header Retry-After \$claw_retry_after always;/u);
    assert.match(body, /return 429 /u);
  }
  // The frontend location replaces error pages, so it must name the 429 one itself.
  const frontend = blocks(LOCATIONS).find((block) => block.head === 'location /');
  assert.match(frontend.lines.join('\n'), /error_page 429 @claw_429;/u);
});

test('the zones and numbers are the ones ADR-232 states', () => {
  const policy = policyBlock(NGINX_CONF);
  assert.match(policy, /limit_req_zone \$claw_general_key zone=claw_general:20m rate=30r\/s;/u);
  assert.match(policy, /limit_req_zone \$claw_static_key\s+zone=claw_static:10m\s+rate=100r\/s;/u);
  assert.match(policy, /limit_req_zone \$claw_crawler_key zone=claw_crawler:10m rate=15r\/s;/u);
  // The existing per-route zones are untouched.
  for (const zone of [
    'payment_writes:10m rate=20r/m',
    'payment_webhooks:10m rate=120r/m',
    'display_currency:10m rate=120r/m',
    'public_feedback:10m rate=20r/m',
    'auth_routes:10m rate=60r/m',
    'auth_signup:10m rate=2r/m',
    'auth_login:10m rate=12r/m',
    'auth_bot_check:10m rate=20r/m',
    'client_logs:10m rate=60r/m',
    'agent_api:10m rate=300r/m',
  ]) {
    assert.ok(NGINX_CONF.includes(`zone=${zone}`), zone);
  }
  assert.match(NGINX_CONF, /limit_req_status 429;/u);
  assert.match(NGINX_CONF, /limit_conn_status 429;/u);
});

// --- slow clients and body sizes ---------------------------------------------------------------------------------------
test('slow-client protection is set, and the multi-MB chat, Threads and upload bodies are still allowed', () => {
  const policy = policyBlock(NGINX_CONF);
  for (const directive of [
    'client_header_timeout 15s;',
    'client_body_timeout 30s;',
    'send_timeout 30s;',
    'keepalive_timeout 30s;',
    'reset_timedout_connection on;',
    'large_client_header_buffers 4 16k;',
  ]) {
    assert.ok(policy.includes(directive), directive);
  }
  for (const [name, text] of [
    ['nginx.conf', NGINX_CONF],
    ['the template', TEMPLATE],
  ]) {
    assert.match(
      text,
      /^\s*client_max_body_size 75m;/mu,
      `${name}: the global body cap must stay 75m`,
    );
  }
  assert.doesNotMatch(
    policy.replaceAll(/#.*$/gmu, ''),
    /client_max_body_size/u,
    'the policy block must not set a global body cap',
  );
  // Chat takes 1 MiB, Threads 8 MiB, thread generation 16 MiB, files 75 MiB: none of their locations may lower it.
  for (const [name, text] of [
    ['locations.conf', LOCATIONS],
    ['the template', TEMPLATE],
  ]) {
    for (const block of blocks(text)) {
      if (
        !/^location\s+(?:~\s+)?\S*(?:\/chat-messages|\/chat-threads|\/threads|\/messages|\/thread-publications|\/files|\/images|\/file-generations|\/workspace|\/memor|\/context|\/research|\/live|\/plugins)/u.test(
          block.head,
        )
      )
        continue;
      assert.doesNotMatch(
        block.lines.join('\n'),
        /client_max_body_size/u,
        `${name}: "${block.head}" must inherit the 75m cap`,
      );
    }
  }
  // Only the routes that take tiny JSON have caps, and they sit above what their services accept.
  assert.match(
    blocks(LOCATIONS)
      .find((block) => block.head === 'location = /api/v1/auth/login')
      .lines.join('\n'),
    /client_max_body_size 64k;/u,
  );
  assert.match(
    blocks(LOCATIONS)
      .find((block) => block.head === 'location /api/v1/auth')
      .lines.join('\n'),
    /client_max_body_size 256k;/u,
  );
  assert.match(
    blocks(LOCATIONS)
      .find((block) => block.head === 'location /api/v1/files')
      .lines.join('\n'),
    /client_body_timeout 120s;/u,
  );
});

test('every streaming route keeps buffering off, so Server-Sent Events still stream', () => {
  const streams = [
    String.raw`location /api/v1/chat-messages/stream`,
    String.raw`location ~ ^/api/v1/thread-publications/[^/]+/generation-progress/stream$`,
    String.raw`location ~ ^/api/v1/live/sessions/[^/]+/stream$`,
    String.raw`location ~ ^/api/v1/live/streams/[^/]+/hls/`,
    String.raw`location ~ ^/api/v1/agent/commands/[^/]+/stream$`,
    String.raw`location ~ ^/api/v1/ollama/pull-jobs/[^/]+/progress$`,
    String.raw`location ~ ^/api/v1/llamacpp/pull-jobs/[^/]+/progress$`,
    String.raw`location /api/v1/llamacpp/v1/`,
    String.raw`location /api/v1/images/`,
    String.raw`location /api/v1/file-generations/`,
  ];
  for (const head of streams) {
    const block = blocks(LOCATIONS).find((candidate) => candidate.head === head);
    assert.ok(block, `${head} is missing`);
    const body = block.lines.join('\n');
    assert.match(body, /proxy_buffering off;/u, head);
    assert.match(body, /proxy_http_version 1\.1;/u, head);
    assert.match(body, /proxy_set_header Connection "";/u, head);
    assert.doesNotMatch(
      body,
      /limit_req\s/u,
      `${head}: a stream is one request and must not be rate limited per chunk`,
    );
  }
});

// --- TLS ----------------------------------------------------------------------------------------------------------------------
test('TLS 1.2 is limited to forward-secret AEAD suites in both files', () => {
  for (const [name, text] of [
    ['nginx.conf', NGINX_CONF],
    ['the template', TEMPLATE],
  ]) {
    const line = /^\s*ssl_ciphers\s+(\S+);/mu.exec(text);
    assert.ok(line, `${name}: ssl_ciphers is missing`);
    const suites = line[1].split(':');
    assert.ok(suites.length >= 4);
    for (const suite of suites) {
      assert.match(
        suite,
        /^ECDHE-(?:ECDSA|RSA)-(?:AES(?:128|256)-GCM-SHA(?:256|384)|CHACHA20-POLY1305)$/u,
        `${name}: ${suite}`,
      );
    }
    assert.match(text, /ssl_protocols\s+TLSv1\.2 TLSv1\.3;/u, name);
  }
});

// --- mounts: a DIRECTORY, in every compose file that runs nginx ----------------------------------------------------------------
test('every compose file that runs nginx mounts the crawler ranges as a directory, never as a single file', () => {
  const expected =
    '${NGINX_CRAWLER_RANGES_DIR:-../infra/nginx/verified-crawlers}:/etc/nginx/claw/verified-crawlers:ro';
  const composeFiles = fs
    .readdirSync(repoPath('docker'))
    .filter((name) => /^docker-compose.*\.yml$/u.test(name))
    .map((name) => `docker/${name}`);
  let nginxFiles = 0;
  for (const relative of composeFiles) {
    const compose = parse(read(relative));
    const volumes = compose.services?.nginx?.volumes;
    if (volumes === undefined) continue;
    nginxFiles += 1;
    assert.ok(volumes.includes(expected), `${relative} does not mount the ranges directory`);
    assert.ok(
      !volumes.some((volume) => /ranges\.conf/u.test(volume)),
      `${relative} mounts ranges.conf as a single file`,
    );
  }
  assert.ok(nginxFiles >= 2, 'both the dev and the prod services file run nginx');
  assert.ok(NGINX_CONF.includes('include /etc/nginx/claw/verified-crawlers/ranges.conf;'));
  assert.ok(TEMPLATE.includes('include /etc/nginx/claw/verified-crawlers/ranges.conf;'));
});

test('the optional ranges directory is documented where every other variable is', () => {
  assert.match(read('.env.example'), /^# NGINX_CRAWLER_RANGES_DIR=$/mu);
  assert.match(read('docs/06-data/environment-variables.md'), /`NGINX_CRAWLER_RANGES_DIR`/u);
});

// --- fail2ban -----------------------------------------------------------------------------------------------------------------------
const JAILS = readIni('infra/fail2ban/jail.d/claw-nginx.local');

test('the three production jails are unchanged and the web jails ban in DOCKER-USER', () => {
  const production = {
    'claw-nginx-scan': { maxretry: '2', findtime: '1h', bantime: '7d' },
    'claw-nginx-flood': { maxretry: '40', findtime: '5m', bantime: '1h' },
    'claw-nginx-auth': { maxretry: '25', findtime: '10m', bantime: '6h' },
  };
  for (const [name, expected] of Object.entries(production)) {
    for (const [key, value] of Object.entries(expected))
      assert.equal(JAILS[name][key], value, `${name}.${key}`);
  }
  for (const name of Object.keys(production).concat([
    'claw-nginx-fakebot',
    'claw-nginx-crawler-abuse',
  ])) {
    const jail = JAILS[name];
    assert.equal(jail.enabled, 'true', name);
    assert.equal(jail.filter, name);
    assert.equal(jail.logpath, '/var/log/claw-nginx/access.log');
    assert.equal(jail.banaction, 'iptables-allports');
    assert.equal(jail.chain, 'DOCKER-USER');
    assert.ok(
      fs.existsSync(repoPath(`infra/fail2ban/filter.d/${name}.conf`)),
      `${name}: filter file`,
    );
  }
  assert.equal(JAILS.DEFAULT.ignoreip, '127.0.0.1/8 ::1 172.16.0.0/12');
});

test('fake crawlers are banned on the first request for a day, abusive verified ones for an hour only', () => {
  assert.deepEqual(
    [JAILS['claw-nginx-fakebot'].maxretry, JAILS['claw-nginx-fakebot'].bantime],
    ['1', '24h'],
  );
  assert.equal(JAILS['claw-nginx-crawler-abuse'].bantime, '1h');
  assert.equal(
    JAILS['claw-nginx-crawler-abuse']['bantime.increment'],
    'false',
    'a verified crawler is never banned for days',
  );
  for (const name of [
    'claw-nginx-scan',
    'claw-nginx-flood',
    'claw-nginx-auth',
    'claw-nginx-fakebot',
  ]) {
    assert.equal(JAILS[name]['bantime.increment'], 'true', `${name} escalates repeat bans`);
    assert.ok(Number.parseInt(JAILS[name]['bantime.maxtime'], 10) > 0, `${name} has a ceiling`);
  }
});

test('recidive bans a 3-times-in-a-day offender for 7 days on every port, for containers and for the host', () => {
  const recidive = readIni('infra/fail2ban/jail.d/claw-recidive.local').recidive;
  assert.equal(recidive.enabled, 'true');
  assert.deepEqual([recidive.maxretry, recidive.findtime, recidive.bantime], ['3', '1d', '7d']);
  assert.equal(recidive.filter, 'claw-recidive');
  assert.match(recidive.action, /iptables-allports\[[^\]]*chain=DOCKER-USER/u);
  assert.match(recidive.action, /iptables-allports\[[^\]]*chain=INPUT/u);
  const filter = read('infra/fail2ban/filter.d/claw-recidive.conf');
  assert.match(
    filter,
    /\(\?!recidive\\\]\|claw-nginx-crawler-abuse\\\]\)/u,
    'a crawler ban must never escalate to seven days',
  );
});

test('the sshd jail is the one in production', () => {
  assert.deepEqual(readIni('infra/fail2ban/jail.d/claw-sshd.local').sshd, {
    enabled: 'true',
    backend: 'systemd',
    maxretry: '4',
    findtime: '10m',
    bantime: '24h',
    'bantime.increment': 'true',
  });
  assert.match(read('infra/fail2ban/fail2ban.d/claw.local'), /^dbpurgeage = 35d$/mu);
});

const lineOf = (
  request,
  status,
  agent = 'Mozilla/5.0',
  crawler = '',
  verdict = 'none',
  address = '203.0.113.7',
) =>
  `${address} - - [28/Nov/2026:12:00:00 +0000] "${request}" ${status} 146 "-" "${agent}" crawler=${crawler} verdict=${verdict}`;

test('the filters match the log format nginx writes, and verified crawlers are never banned for days', () => {
  // scan: probes count, normal traffic does not
  for (const request of [
    'GET /.env HTTP/2.0',
    'GET /.git/config HTTP/2.0',
    'POST /wp-login.php HTTP/2.0',
    'GET /docker-compose.yml HTTP/2.0',
    'GET /package.json HTTP/2.0',
    'GET /swagger.json HTTP/2.0',
    'GET /index.php?x=1 HTTP/2.0',
    'GET /a/../../etc/passwd HTTP/1.1',
    'GET /x/%2e%2e/%2e%2e/etc/passwd HTTP/2.0',
    'GET /actuator/health HTTP/2.0',
  ]) {
    assert.ok(counts('claw-nginx-scan', lineOf(request, 404)), request);
  }
  for (const request of [
    'GET /robots.txt HTTP/2.0',
    'GET / HTTP/2.0',
    'GET /.well-known/security.txt HTTP/2.0',
    'GET /api/v1/files/1/download/package.json HTTP/2.0',
    'GET /learn/x HTTP/2.0',
  ]) {
    assert.ok(!counts('claw-nginx-scan', lineOf(request, 200)), request);
  }
  assert.ok(
    !counts(
      'claw-nginx-scan',
      lineOf(
        'GET /wp-login.php HTTP/2.0',
        404,
        'Googlebot/2.1',
        'google',
        'verified',
        '66.249.64.1',
      ),
    ),
    'a verified crawler is never banned by the scan jail',
  );
  assert.ok(
    counts(
      'claw-nginx-scan',
      lineOf('GET /wp-login.php HTTP/2.0', 404, 'Googlebot/2.1', 'google', 'fake'),
    ),
    'a fake one is',
  );

  // flood: a 429 counts; a verified crawler's 429 does not (claw-nginx-crawler-abuse owns it)
  assert.ok(counts('claw-nginx-flood', lineOf('GET /api/v1/models HTTP/2.0', 429)));
  assert.ok(!counts('claw-nginx-flood', lineOf('GET /api/v1/models HTTP/2.0', 200)));
  assert.ok(
    !counts(
      'claw-nginx-flood',
      lineOf('GET /learn/x HTTP/2.0', 429, 'Googlebot/2.1', 'google', 'verified', '66.249.64.1'),
    ),
  );

  // auth
  assert.ok(counts('claw-nginx-auth', lineOf('POST /api/v1/auth/login HTTP/2.0', 401)));
  assert.ok(counts('claw-nginx-auth', lineOf('POST /api/v1/auth/register HTTP/2.0', 429)));
  assert.ok(!counts('claw-nginx-auth', lineOf('POST /api/v1/auth/login HTTP/2.0', 200)));
  assert.ok(!counts('claw-nginx-auth', lineOf('GET /api/v1/auth/me HTTP/2.0', 401)));

  // fake crawler: one line is enough, and nothing in the request or the User-Agent can fake or hide the verdict
  assert.ok(
    counts('claw-nginx-fakebot', lineOf('GET / HTTP/2.0', 403, 'Googlebot/2.1', 'google', 'fake')),
  );
  assert.ok(
    !counts(
      'claw-nginx-fakebot',
      lineOf('GET / HTTP/2.0', 200, 'Googlebot/2.1', 'google', 'verified', '66.249.64.1'),
    ),
  );
  assert.ok(
    !counts(
      'claw-nginx-fakebot',
      lineOf('GET / HTTP/2.0', 200, 'x crawler=google verdict=fake', '', 'none'),
    ),
    'a User-Agent cannot frame itself or anyone',
  );
  assert.ok(
    counts(
      'claw-nginx-fakebot',
      lineOf('GET / HTTP/2.0', 403, 'x crawler= verdict=none', 'bing', 'fake'),
    ),
    'a User-Agent cannot hide a fake',
  );

  // crawler abuse: only a verified crawler's 429
  assert.ok(
    counts(
      'claw-nginx-crawler-abuse',
      lineOf('GET /learn/x HTTP/2.0', 429, 'Googlebot/2.1', 'google', 'verified', '66.249.64.1'),
    ),
  );
  assert.ok(
    !counts(
      'claw-nginx-crawler-abuse',
      lineOf('GET /learn/x HTTP/2.0', 200, 'Googlebot/2.1', 'google', 'verified', '66.249.64.1'),
    ),
  );
  assert.ok(!counts('claw-nginx-crawler-abuse', lineOf('GET /learn/x HTTP/2.0', 429)));
});

test('the logging tap and the logrotate policy are in the repo with the fail2ban files', () => {
  assert.match(
    read('infra/fail2ban/claw-nginx-logtap.service'),
    /docker logs -f --since 1s claw-nginx >> \/var\/log\/claw-nginx\/access\.log/u,
  );
  assert.match(read('infra/fail2ban/logrotate.claw-nginx'), /copytruncate/u);
  assert.match(read('infra/fail2ban/logrotate.claw-nginx'), /rotate 14/u);
});

// --- the host refresher --------------------------------------------------------------------------------------------------------------
test('the nightly refresh is a valid script with a timer that survives a reboot', () => {
  const script = repoPath('infra/host/refresh-crawler-ranges.sh');
  const syntax = spawnSync(
    process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash',
    ['-n', script],
    { encoding: 'utf8' },
  );
  if (syntax.error === undefined) assert.equal(syntax.status, 0, syntax.stderr);
  const text = read('infra/host/refresh-crawler-ranges.sh');
  assert.match(text, /nginx -t/u);
  assert.match(text, /nginx -s reload/u);
  assert.match(
    text,
    /inside the git checkout/u,
    'it must refuse a directory that would dirty the checkout',
  );
  const timer = read('infra/host/claw-crawler-ranges.timer');
  assert.match(timer, /^OnCalendar=/mu);
  assert.match(timer, /^Persistent=true$/mu);
  assert.match(timer, /^WantedBy=timers\.target$/mu);
  const service = read('infra/host/claw-crawler-ranges.service');
  assert.match(service, /^Type=oneshot$/mu);
  assert.match(service, /^SuccessExitStatus=3$/mu);
  assert.match(
    service,
    /^ExecStart=\/bin\/bash \/srv\/clawai\/infra\/host\/refresh-crawler-ranges\.sh$/mu,
  );
});
