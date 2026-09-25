import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';

// The composer used to accept 13 files; chat-service refuses an eleventh with
// a bare "Validation failed". The two numbers are one rule stated twice (a
// shared-package export would mark every service affected and crash every dev
// container until rebuilt — see chat-service's voice-note.constants.ts for the
// same trade-off), so this test is what keeps them one rule.
describe('MAX_ATTACHMENTS_PER_MESSAGE', () => {
  it("matches chat-service's MAX_ATTACHMENTS_PER_REQUEST", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        '../claw-chat-service/src/modules/chat-messages/constants/attachment.constants.ts',
      ),
      'utf8',
    );
    const match = /MAX_ATTACHMENTS_PER_REQUEST\s*=\s*(\d+)/.exec(source);

    expect(match?.[1]).toBeDefined();
    expect(MAX_ATTACHMENTS_PER_MESSAGE).toBe(Number(match?.[1]));
  });
});
