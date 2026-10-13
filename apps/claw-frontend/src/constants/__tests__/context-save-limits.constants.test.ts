import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CONTEXT_SAVE_MEMORY_MAX_CHARS,
  CONTEXT_SAVE_PACK_CONTENT_MAX_CHARS,
  CONTEXT_SAVE_PACK_NAME_MAX_CHARS,
} from '@/constants/context-save.constants';

const CHAT_MESSAGES_DIR = '../claw-chat-service/src/modules/chat-messages';

function readServerFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), CHAT_MESSAGES_DIR, relativePath), 'utf8');
}

/** The number a `NAME = 1_000;` constant is declared with in chat-service. */
function serverLimit(name: string): number {
  const source = readServerFile('constants/save-intent.constants.ts');
  const declaration = source.split('\n').find((line) => line.includes(`${name} =`));
  expect(declaration, `${name} is declared in save-intent.constants.ts`).toBeDefined();
  const value = (declaration ?? '').split('=')[1]?.replaceAll(/[\s_;]/g, '') ?? '';
  return Number(value);
}

// The "Remember this" form validates before it sends; the server validates again.
// If the two numbers differ the form either blocks text the server would accept or
// lets through text the server refuses with a bare "Validation failed". They are one
// rule stated twice (a shared-package export would mark every service affected), so
// this test is what keeps them one rule.
describe('context save limits match chat-service (ADR-168)', () => {
  it('memory text', () => {
    expect(CONTEXT_SAVE_MEMORY_MAX_CHARS).toBe(serverLimit('SAVE_INTENT_MEMORY_TEXT_MAX_CHARS'));
  });

  it('a summary, which the memory field also holds', () => {
    expect(CONTEXT_SAVE_MEMORY_MAX_CHARS).toBe(serverLimit('SAVE_INTENT_SUMMARY_MAX_CHARS'));
  });

  it('new pack name', () => {
    expect(CONTEXT_SAVE_PACK_NAME_MAX_CHARS).toBe(serverLimit('SAVE_INTENT_PACK_NAME_MAX_CHARS'));
  });

  it('pack content', () => {
    expect(CONTEXT_SAVE_PACK_CONTENT_MAX_CHARS).toBe(serverLimit('SAVE_PACK_CONTENT_MAX_CHARS'));
  });

  it('the confirm DTO really enforces those three constants on those three fields', () => {
    const dto = readServerFile('dto/context-save-proposal-confirm.dto.ts');

    expect(dto).toMatch(/text:\s*z\.string\(\)\.max\(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS\)/);
    expect(dto).toMatch(
      /newPackName:\s*z\s*\.string\(\)\s*\.max\(SAVE_INTENT_PACK_NAME_MAX_CHARS\)/,
    );
    expect(dto).toMatch(/content:\s*z\.string\(\)\.max\(SAVE_PACK_CONTENT_MAX_CHARS\)/);
  });
});
