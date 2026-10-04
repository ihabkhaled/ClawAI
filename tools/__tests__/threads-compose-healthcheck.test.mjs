import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';

const composeFiles = [
  'docker/docker-compose.dev.services.yml',
  'docker/docker-compose.prod.services.yml',
];

const serviceDefinitions = [
  ['threads-service', 4019],
  ['thread-generation-service', 4020],
];

function readServiceBlock(composeFile, serviceName) {
  const source = readFileSync(new URL(`../../${composeFile}`, import.meta.url), 'utf8');
  const servicePattern = new RegExp(
    `^  ${serviceName}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|^networks:)`,
    'm',
  );
  const match = source.match(servicePattern);

  assert.ok(match, `${serviceName} is defined in ${composeFile}`);
  return match[1];
}

for (const composeFile of composeFiles) {
  for (const [serviceName, port] of serviceDefinitions) {
    test(`${composeFile} ${serviceName} probes its HTTPS health route without wget`, () => {
      const serviceBlock = readServiceBlock(composeFile, serviceName);
      const healthcheck = serviceBlock.slice(serviceBlock.indexOf('healthcheck:'));

      assert.match(serviceBlock, /'CMD',\s*'node',\s*'-e'/);
      assert.match(serviceBlock, new RegExp(`https://localhost:${port}/api/v1/health`));
      assert.match(serviceBlock, /node:https/);
      assert.match(serviceBlock, /rejectUnauthorized:\s*false/);
      assert.doesNotMatch(healthcheck, /wget/);
    });
  }
}
