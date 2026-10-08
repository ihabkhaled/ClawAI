import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const COMPOSE = 'docker/docker-compose.prod.services.yml';
const HEALTH_TOOLS = ['wget', 'curl'];
const NEWLINE = String.fromCharCode(10);
const CONTINUATION = /\\\r?\n/gu;

/** Splits the compose file into `services:` entries by their two-space-indented names. */
function serviceBlocks(source) {
  const blocks = [];
  let current = null;
  for (const line of source.split(NEWLINE)) {
    const header = /^ {2}([a-z0-9-]+):\s*$/u.exec(line);
    if (header) {
      current = { name: header[1], lines: [] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return blocks;
}

function healthTool(block) {
  const line = block.lines.find((entry) => /^\s+test:\s*\[/u.test(entry));
  return HEALTH_TOOLS.find((tool) => line?.includes(`${tool} `)) ?? null;
}

function dockerfileOf(block) {
  const line = block.lines.find((entry) => /^\s+dockerfile:\s*\S/u.test(entry));
  return line ? line.split(':')[1].trim() : null;
}

/** The last stage of a Dockerfile with comments dropped and `\` continuations folded onto one line. */
function finalStage(source) {
  return source
    .slice(source.lastIndexOf('FROM '))
    .split(NEWLINE)
    .filter((entry) => !entry.trim().startsWith('#'))
    .join(NEWLINE)
    .replaceAll(CONTINUATION, ' ');
}

test('every image built here that is health-checked with wget or curl installs that tool', () => {
  // node:26-bookworm-slim (glibc images) ships neither wget nor curl; the Alpine image the
  // frontend used before had wget in busybox. The frontend moved to Bookworm without installing
  // it, so the container served traffic but was marked unhealthy and every production deploy
  // rolled back with "health verification failed". Nothing built the image in CI, so only a real
  // deploy showed it.
  const checked = [];
  for (const block of serviceBlocks(readFileSync(repoPath(COMPOSE), 'utf8'))) {
    const tool = healthTool(block);
    const dockerfile = dockerfileOf(block);
    if (tool === null || dockerfile === null) continue;
    checked.push(block.name);
    const stage = finalStage(readFileSync(repoPath(dockerfile), 'utf8'));
    assert.match(
      stage,
      new RegExp(`(apt-get install|apk add)[^\\n]*\\b${tool}\\b`, 'u'),
      `${block.name}: the healthcheck runs ${tool} but the final stage of ${dockerfile} does not install it`,
    );
  }
  assert.ok(checked.includes('frontend'), 'expected the frontend service to be checked');
});
