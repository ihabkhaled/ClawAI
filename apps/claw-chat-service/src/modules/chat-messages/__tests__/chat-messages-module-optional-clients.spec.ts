import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression (2026-09-29): AttachmentInfoClient was injected into
// ChatMessagesService with @Optional() but never registered as a provider, so
// Nest always injected undefined and the attachment half of message.created,
// the research attachment digest and the image-attachment check were silently
// off. @Optional() hides a missing provider; this pins every optional client.
const MODULE_PATH = join(__dirname, '..', 'chat-messages.module.ts');
const SERVICE_PATH = join(__dirname, '..', 'services', 'chat-messages.service.ts');

const optionalClientsOf = (source: string): string[] =>
  [...source.matchAll(/@Optional\(\)\s+private\s+readonly\s+\w+\?:\s+(\w+Client)\b/g)].map(
    (match) => match[1] ?? '',
  );

describe('ChatMessagesModule registers every @Optional() client', () => {
  const moduleSource = readFileSync(MODULE_PATH, 'utf8');
  const serviceSource = readFileSync(SERVICE_PATH, 'utf8');
  const providerLines = new Set(moduleSource.split(/\r?\n/).map((line) => line.trim()));

  it('finds the optional clients the service injects', () => {
    expect(optionalClientsOf(serviceSource)).toContain('AttachmentInfoClient');
  });

  it.each(optionalClientsOf(serviceSource))('%s is a provider', (client) => {
    expect(providerLines.has(`${client},`)).toBe(true);
  });
});
