import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const locations = readFileSync(repoPath('infra/nginx/locations.conf'), 'utf8');
const compose = readFileSync(repoPath('docker/docker-compose.prod.services.yml'), 'utf8');
const maintenance = readFileSync(repoPath('infra/nginx/public-tls/maintenance.html'), 'utf8');

test('frontend failures use an internal 503 maintenance response', () => {
  const frontend = locations.slice(locations.lastIndexOf('location / {'));
  assert.match(frontend, /proxy_intercept_errors on;/u);
  assert.match(frontend, /error_page 502 503 504 =503 \/maintenance\.html;/u);
  assert.match(frontend, /location = \/maintenance\.html/u);
  assert.match(frontend, /internal;/u);
  assert.match(frontend, /default_type text\/html;/u);
  assert.match(frontend, /add_header Retry-After "60" always;/u);
});

test('production nginx mounts the maintenance asset read-only', () => {
  assert.match(compose, /\.\.\/infra\/nginx\/public-tls:\/etc\/nginx\/claw\/public-tls:ro/u);
});

test('maintenance page is self-contained, branded, responsive, and accessible', () => {
  assert.match(maintenance, /<meta name="viewport"/u);
  assert.match(maintenance, /<title>ClawAI \| Temporarily unavailable<\/title>/u);
  assert.match(maintenance, /<h1[^>]*>We’ll be right back<\/h1>/u);
  assert.match(maintenance, /ClawAI/u);
  assert.match(maintenance, /role="status"/u);
  assert.doesNotMatch(maintenance, /https?:\/\//u);
});
