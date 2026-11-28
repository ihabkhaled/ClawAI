import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { after, before, describe, test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';
import { docker, dockerSkipReason } from './helpers/docker.mjs';

// ADR-232: the REAL fail2ban (the Ubuntu package) reads the committed jails and filters. `fail2ban-client -t` proves the
// whole configuration loads, and `fail2ban-regex` proves each filter matches the lines nginx writes (the format
// is pinned by nginx-edge-docker.test.mjs) and ignores what it must. Runs with CLAW_DOCKER_TESTS=1.
// Image: built once from ubuntu:24.04 and kept (claw-f2b-test:ubuntu24); CLAW_F2B_TEST_IMAGE replaces it.

const skip = dockerSkipReason();
const IMAGE = process.env.CLAW_F2B_TEST_IMAGE ?? 'claw-f2b-test:ubuntu24';
const DOCKERFILE =
  'FROM ubuntu:24.04\n' +
  'RUN apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends fail2ban python3-systemd iptables >/dev/null 2>&1 && rm -rf /var/lib/apt/lists/*\n';

/** One nginx access-log line in the claw_edge format. */
const line = (address, request, status, agent, crawler = '', verdict = 'none') =>
  `${address} - - [28/Nov/2026:12:00:00 +0000] "${request}" ${status} 146 "-" "${agent}" crawler=${crawler} verdict=${verdict}`;

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const SAMPLES = {
  'claw-nginx-scan': {
    // matched: 8 probes from people who are not crawlers; ignored: 2 verified crawler hits; missed: normal pages
    lines: [
      line('203.0.113.7', 'GET /.env HTTP/2.0', 404, 'curl/8'),
      line('203.0.113.7', 'GET /.git/config HTTP/2.0', 404, 'curl/8'),
      line('203.0.113.7', 'POST /wp-login.php HTTP/2.0', 404, 'curl/8'),
      line('203.0.113.7', 'GET /docker-compose.yml HTTP/2.0', 404, 'curl/8'),
      line('203.0.113.7', 'GET /package.json HTTP/2.0', 404, 'curl/8'),
      line('203.0.113.7', 'GET /swagger.json HTTP/2.0', 404, 'curl/8'),
      line('203.0.113.7', 'GET /index.php?x=1 HTTP/2.0', 404, 'curl/8'),
      line('203.0.113.7', 'GET /x/%2e%2e/%2e%2e/etc/passwd HTTP/2.0', 400, 'curl/8'),
      line('66.249.64.1', 'GET /wp-login.php HTTP/2.0', 404, GOOGLEBOT, 'google', 'verified'),
      line('66.249.64.1', 'GET /.env HTTP/2.0', 404, GOOGLEBOT, 'google', 'verified'),
      line('203.0.113.8', 'GET /robots.txt HTTP/2.0', 200, 'Mozilla/5.0'),
      line('203.0.113.8', 'GET /.well-known/security.txt HTTP/2.0', 200, 'Mozilla/5.0'),
      line('203.0.113.8', 'GET /api/v1/files/1/download/package.json HTTP/2.0', 200, 'Mozilla/5.0'),
    ],
    expected: { matched: 8, ignored: 2, missed: 3 },
  },
  'claw-nginx-flood': {
    lines: [
      line('203.0.113.7', 'GET /api/v1/models HTTP/2.0', 429, 'Mozilla/5.0'),
      line('203.0.113.7', 'POST /api/v1/auth/login HTTP/2.0', 429, 'Mozilla/5.0'),
      line('66.249.64.1', 'GET /learn/x HTTP/2.0', 429, GOOGLEBOT, 'google', 'verified'),
      line('203.0.113.8', 'GET /api/v1/models HTTP/2.0', 200, 'Mozilla/5.0'),
      line('203.0.113.8', 'GET /api/v1/models HTTP/2.0', 502, 'Mozilla/5.0'),
    ],
    expected: { matched: 2, ignored: 1, missed: 2 },
  },
  'claw-nginx-auth': {
    lines: [
      line('203.0.113.7', 'POST /api/v1/auth/login HTTP/2.0', 401, 'curl/8'),
      line('203.0.113.7', 'POST /api/v1/auth/register HTTP/2.0', 409, 'curl/8'),
      line('203.0.113.7', 'POST /api/v1/auth/bot-check/challenge HTTP/2.0', 429, 'curl/8'),
      line('203.0.113.8', 'POST /api/v1/auth/login HTTP/2.0', 200, 'Mozilla/5.0'),
      line('203.0.113.8', 'GET /api/v1/auth/me HTTP/2.0', 401, 'Mozilla/5.0'),
    ],
    expected: { matched: 3, ignored: 0, missed: 2 },
  },
  'claw-nginx-fakebot': {
    lines: [
      line('198.51.100.9', 'GET / HTTP/2.0', 403, GOOGLEBOT, 'google', 'fake'),
      line('198.51.100.9', 'GET /robots.txt HTTP/2.0', 403, 'CCBot/2.0', 'commoncrawl', 'fake'),
      line('66.249.64.1', 'GET / HTTP/2.0', 200, GOOGLEBOT, 'google', 'verified'),
      line('172.18.0.1', 'GET / HTTP/2.0', 200, GOOGLEBOT, 'google', 'unchecked'),
      line('203.0.113.8', 'GET / HTTP/2.0', 200, 'Mozilla/5.0'),
      // a User-Agent that spells the verdict cannot frame itself or anyone: the verdict is the last field
      line('203.0.113.9', 'GET / HTTP/2.0', 200, 'evil crawler=google verdict=fake'),
    ],
    expected: { matched: 2, ignored: 0, missed: 4 },
  },
  'claw-nginx-crawler-abuse': {
    lines: [
      line('66.249.64.1', 'GET /learn/x HTTP/2.0', 429, GOOGLEBOT, 'google', 'verified'),
      line('66.249.64.2', 'GET /learn/y HTTP/2.0', 429, GOOGLEBOT, 'google', 'verified'),
      line('66.249.64.1', 'GET /learn/x HTTP/2.0', 200, GOOGLEBOT, 'google', 'verified'),
      line('203.0.113.8', 'GET /learn/x HTTP/2.0', 429, 'Mozilla/5.0'),
      line('198.51.100.9', 'GET /learn/x HTTP/2.0', 403, GOOGLEBOT, 'google', 'fake'),
    ],
    expected: { matched: 2, ignored: 0, missed: 3 },
  },
};

const RECIDIVE_LOG = [
  '2026-11-28 12:00:00,123 fail2ban.actions        [101]: NOTICE  [claw-nginx-scan] Ban 203.0.113.9',
  '2026-11-28 12:10:00,123 fail2ban.actions        [101]: NOTICE  [claw-nginx-flood] Ban 203.0.113.9',
  '2026-11-28 12:20:00,123 fail2ban.actions        [101]: NOTICE  [sshd] Ban 203.0.113.9',
  '2026-11-28 12:30:00,123 fail2ban.actions        [101]: NOTICE  [claw-nginx-crawler-abuse] Ban 66.249.64.1',
  '2026-11-28 12:40:00,123 fail2ban.actions        [101]: NOTICE  [recidive] Ban 203.0.113.9',
  '2026-11-28 12:50:00,123 fail2ban.actions        [101]: NOTICE  [claw-nginx-scan] Unban 203.0.113.9',
  '2026-11-28 12:55:00,123 fail2ban.filter         [101]: INFO    [claw-nginx-scan] Found 203.0.113.9 - 2026-11-28 12:55:00',
];

/** "Lines: 13 lines, 2 ignored, 8 matched, 3 missed" as numbers. */
function summary(output) {
  const match = /Lines: (\d+) lines, (\d+) ignored, (\d+) matched, (\d+) missed/u.exec(output);
  assert.ok(match, `no summary in:\n${output}`);
  return {
    lines: Number(match[1]),
    ignored: Number(match[2]),
    matched: Number(match[3]),
    missed: Number(match[4]),
  };
}

describe('fail2ban in a throwaway container (ADR-232)', { skip }, () => {
  let work;

  before(() => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-f2b-'));
    if (docker(['image', 'inspect', IMAGE]).status !== 0) {
      const build = docker(['build', '-t', IMAGE, '-'], { input: DOCKERFILE, timeout: 600_000 });
      assert.equal(build.status, 0, build.output);
    }
    for (const [name, sample] of Object.entries(SAMPLES))
      fs.writeFileSync(path.join(work, `${name}.log`), `${sample.lines.join('\n')}\n`);
    fs.writeFileSync(path.join(work, 'fail2ban.log'), `${RECIDIVE_LOG.join('\n')}\n`);
  });

  after(() => {
    if (work) fs.rmSync(work, { recursive: true, force: true });
  });

  const regex = (filter, logFile) =>
    docker([
      'run',
      '--rm',
      '-v',
      `${repoPath('infra/fail2ban/filter.d')}:/src:ro`,
      '-v',
      `${path.join(work, logFile)}:/sample.log:ro`,
      IMAGE,
      'sh',
      '-c',
      `cp /src/*.conf /etc/fail2ban/filter.d/ && fail2ban-regex /sample.log /etc/fail2ban/filter.d/${filter}.conf 2>&1`,
    ]);

  test('fail2ban-client -t loads every jail, filter and action of infra/fail2ban', () => {
    const result = docker([
      'run',
      '--rm',
      '-v',
      `${repoPath('infra/fail2ban')}:/src:ro`,
      IMAGE,
      'sh',
      '-c',
      'mkdir -p /var/log/claw-nginx && touch /var/log/claw-nginx/access.log /var/log/fail2ban.log && ' +
        'cp /src/filter.d/*.conf /etc/fail2ban/filter.d/ && cp /src/jail.d/*.local /etc/fail2ban/jail.d/ && ' +
        'cp /src/fail2ban.d/*.local /etc/fail2ban/fail2ban.d/ && fail2ban-client -t 2>&1',
    ]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /OK: configuration test is successful/u);
  });

  test('the loaded jails carry the ban times the runbook promises', () => {
    const result = docker([
      'run',
      '--rm',
      '-v',
      `${repoPath('infra/fail2ban')}:/src:ro`,
      IMAGE,
      'sh',
      '-c',
      'mkdir -p /var/log/claw-nginx && touch /var/log/claw-nginx/access.log /var/log/fail2ban.log && ' +
        'cp /src/filter.d/*.conf /etc/fail2ban/filter.d/ && cp /src/jail.d/*.local /etc/fail2ban/jail.d/ && ' +
        'cp /src/fail2ban.d/*.local /etc/fail2ban/fail2ban.d/ && fail2ban-client -d 2>&1',
    ]);
    assert.equal(result.status, 0, result.output);
    const setting = (jail, key) => {
      const match = new RegExp(`\\['set', '${jail}', '${key}', ([^\\]]+)\\]`, 'u').exec(
        result.stdout,
      );
      return match?.[1].replaceAll("'", '');
    };
    assert.equal(setting('claw-nginx-fakebot', 'maxretry'), '1');
    assert.equal(setting('claw-nginx-fakebot', 'bantime'), '24h');
    assert.equal(setting('claw-nginx-crawler-abuse', 'bantime'), '1h');
    assert.equal(setting('claw-nginx-crawler-abuse', 'bantime.increment'), 'False');
    assert.equal(setting('claw-nginx-scan', 'bantime'), '7d');
    assert.equal(setting('claw-nginx-scan', 'bantime.increment'), 'True');
    assert.equal(setting('recidive', 'maxretry'), '3');
    assert.equal(setting('recidive', 'findtime'), '1d');
    assert.equal(setting('recidive', 'bantime'), '7d');
    assert.match(result.stdout, /'iptables-allports-claw-recidive-docker'[\s\S]*DOCKER-USER/u);
    assert.match(result.stdout, /'iptables-allports-claw-recidive-input'[\s\S]*-I INPUT -p/u);
  });

  for (const [filter, sample] of Object.entries(SAMPLES)) {
    test(`${filter}: fail2ban-regex counts ${JSON.stringify(sample.expected)} on the nginx log format`, () => {
      const result = regex(filter, `${filter}.log`);
      assert.equal(result.status, 0, result.output);
      const counted = summary(result.output);
      assert.equal(counted.lines, sample.lines.length);
      assert.deepEqual(
        { matched: counted.matched, ignored: counted.ignored, missed: counted.missed },
        sample.expected,
        result.output,
      );
    });
  }

  test('claw-recidive counts bans from every jail but recidive itself and the crawler-abuse jail', () => {
    const result = regex('claw-recidive', 'fail2ban.log');
    assert.equal(result.status, 0, result.output);
    const counted = summary(result.output);
    assert.deepEqual(
      { matched: counted.matched, missed: counted.missed },
      { matched: 3, missed: 4 },
      result.output,
    );
  });
});
