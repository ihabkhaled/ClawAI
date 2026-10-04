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
    test(`${composeFile} ${serviceName} probes its plain HTTP health route`, () => {
      const serviceBlock = readServiceBlock(composeFile, serviceName);

      assert.match(serviceBlock, /'CMD',\s*'node',\s*'-e'/);
      assert.match(serviceBlock, new RegExp(`http://127\\.0\\.0\\.1:${port}/api/v1/health`));
      assert.doesNotMatch(serviceBlock, /https:\/\/|wget/);
    });
  }
}
