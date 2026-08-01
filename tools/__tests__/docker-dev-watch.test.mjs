import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const BACKEND_SERVICES = [
  'auth-service',
  'chat-service',
  'connector-service',
  'routing-service',
  'memory-service',
  'file-service',
  'audit-service',
  'ollama-service',
  'client-logs-service',
  'server-logs-service',
  'health-service',
  'image-service',
  'workspace-service',
  'agent-service',
  'research-service',
  'payment-service',
  'llamacpp-service',
  'file-generation-service',
];

const POLLING_SETTINGS = [
  'TSC_WATCHFILE: DynamicPriorityPolling',
  'TSC_WATCHDIRECTORY: RecursiveDirectoryUsingDynamicPriorityPolling',
];
const POLLING_ENVIRONMENT_MERGE = '      <<: *development-watch-environment';

function serviceBlock(source, serviceName) {
  const lines = source.split(/\r?\n/u);
  const heading = `  ${serviceName}:`;
  const start = lines.indexOf(heading);
  assert.notEqual(start, -1, `missing Compose service ${serviceName}`);

  const followingLines = lines.slice(start + 1);
  const relativeEnd = followingLines.findIndex((line) => /^ {2}\S[^:]*:$/u.test(line));
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd;
  return lines.slice(start, end).join('\n');
}

test('every development backend service enables cross-platform polling watchers', () => {
  const source = readFileSync(repoPath('docker', 'docker-compose.dev.services.yml'), 'utf8');

  for (const setting of POLLING_SETTINGS) {
    assert.match(source, new RegExp(`^ {2}${setting}$`, 'mu'));
  }
  for (const serviceName of BACKEND_SERVICES) {
    const block = serviceBlock(source, serviceName);
    assert.ok(
      block.split('\n').includes(POLLING_ENVIRONMENT_MERGE),
      `${serviceName} does not inherit the development watcher environment`,
    );

    const manifest = JSON.parse(
      readFileSync(repoPath('apps', `claw-${serviceName}`, 'package.json'), 'utf8'),
    );
    assert.match(manifest.scripts.dev, /nodemon --legacy-watch --watch src/u);
    assert.match(manifest.scripts.dev, /--exec "npm run build && node dist\/main\.js"/u);
    assert.match(
      block,
      new RegExp(
        `^ {6}- \.\.\/apps\/claw-${serviceName}\/package\\.json:` +
          `\/app\/apps\/claw-${serviceName}\/package\\.json:ro$`,
        'mu',
      ),
      `${serviceName} does not bind-mount its development script`,
    );
  }
});

test('production services do not enable development polling watchers', () => {
  const source = readFileSync(repoPath('docker', 'docker-compose.prod.services.yml'), 'utf8');

  for (const setting of POLLING_SETTINGS) {
    assert.doesNotMatch(source, new RegExp(setting, 'u'));
  }
});

test('development frontend uses polling with source and public bind mounts', () => {
  const source = readFileSync(repoPath('docker', 'docker-compose.dev.services.yml'), 'utf8');
  const block = serviceBlock(source, 'frontend');

  assert.match(block, /^ {6}WATCHPACK_POLLING: 'true'$/mu);
  assert.match(block, /^ {6}CHOKIDAR_USEPOLLING: 'true'$/mu);
  assert.match(block, /^ {6}- \.\.\/apps\/claw-frontend\/src:\/app\/src$/mu);
  assert.match(block, /^ {6}- \.\.\/apps\/claw-frontend\/public:\/app\/public$/mu);
});

test('research development image compiles shared entitlements before startup', () => {
  const developmentSource = readFileSync(
    repoPath('apps', 'claw-research-service', 'Dockerfile.dev'),
    'utf8',
  );
  const productionSource = readFileSync(
    repoPath('apps', 'claw-research-service', 'Dockerfile'),
    'utf8',
  );

  assert.match(developmentSource, /^RUN cd packages\/shared-entitlements && npx tsgo$/mu);
  assert.match(productionSource, /cd \/app\/packages\/shared-entitlements && npx tsgo/u);
});
