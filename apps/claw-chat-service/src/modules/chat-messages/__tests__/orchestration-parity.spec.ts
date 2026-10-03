import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The parity guard (rules/59). Normal chat is the one pipeline; Compare, Consensus,
// Escalation, the judge/critic and the seven labs are surfaces over it, never copies of it.
// This reads the source on purpose: a surface that quietly grows its own thread creation,
// its own raw provider call or its own request shape fails here, before a user finds out
// that a feature chat has does not exist in a lab.

const MODULE_DIR = join(__dirname, '..');

// Comments describe the old behaviour on purpose; only executable text counts.
function source(relative: string): string {
  return readFileSync(join(MODULE_DIR, relative), 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/^\s*\/\/.*$/gm, '');
}

const LAB_MANAGERS = [
  'answer-repair',
  'task-decomposition',
  'best-of-n',
  'verifier',
  'pipeline',
  'cost-ensemble',
  'role-pack',
] as const;

const COMPARE_FAMILY_MANAGERS = [
  'parallel-execution',
  'consensus-execution',
  'escalation-chain',
] as const;

// Documented exception (rules/59 item 6, TD-044): Consensus synthesis is a local reducer call
// that meters itself. Moving it onto connector models changes who pays, so it is a billing
// decision, not a refactor. Nothing else may post to the Ollama generate route directly.
const RAW_OLLAMA_ALLOWED = new Set(['consensus-execution']);

const LAB_DTOS = [
  'best-of-n-message',
  'consensus-message',
  'cost-ensemble-message',
  'decompose-task',
  'escalation-chain-message',
  'parallel-message',
  'pipeline-message',
  'repair-message',
  'role-pack-message',
  'verify-message',
] as const;

// Every fragment chat gives a message that a lab can express must be on every lab DTO.
const SHARED_FRAGMENTS = ['researchFields', 'attachmentFields', 'contextPackFields'] as const;

describe('orchestration parity with normal chat', () => {
  describe.each(LAB_MANAGERS)('lab manager %s', (name) => {
    const text = source(`managers/${name}.manager.ts`);

    it('assembles context through the chat context gateway', () => {
      expect(text).toContain('ChatContextGatewayManager');
    });

    it('calls the model through the shared execution gateway (chat chokepoint)', () => {
      expect(text).toContain('ModeExecutionGatewayManager');
    });

    it('obtains its thread from the shared resolver, not its own create()', () => {
      expect(text).toContain('resolveOrchestrationThread');
      expect(text).not.toContain('chatThreadsRepository.create(');
    });

    it('never posts to the raw Ollama route', () => {
      expect(text).not.toContain('api/v1/ollama/generate');
    });
  });

  describe.each(COMPARE_FAMILY_MANAGERS)('compare-family manager %s', (name) => {
    const text = source(`managers/${name}.manager.ts`);

    it('assembles context through the chat context gateway', () => {
      expect(text).toContain('ChatContextGatewayManager');
    });

    it('does not create its own thread', () => {
      expect(text).not.toContain('chatThreadsRepository.create(');
    });

    it('posts to the raw Ollama route only where documented', () => {
      if (RAW_OLLAMA_ALLOWED.has(name)) {
        return;
      }
      expect(text).not.toContain('api/v1/ollama/generate');
    });
  });

  it('the judge and critic call models through the chat chokepoint', () => {
    const text = source('managers/judge-referee.manager.ts');
    expect(text).toContain('callProvider');
    expect(text).not.toContain('api/v1/ollama/generate');
  });

  it('the service resolves Compare, Consensus and Escalation threads through the shared resolver', () => {
    const text = source('services/chat-messages.service.ts');
    expect(text.match(/resolveOrchestrationThread\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  describe.each(LAB_DTOS)('dto %s', (name) => {
    const text = source(`dto/${name}.dto.ts`);
    it.each(SHARED_FRAGMENTS)('spreads %s', (fragment) => {
      expect(text).toContain(`...${fragment}`);
    });
  });

  it('no manager outside the allow-list posts to the raw Ollama route', () => {
    const all = [...LAB_MANAGERS, ...COMPARE_FAMILY_MANAGERS, 'compare-judge', 'judge-referee'];
    for (const name of all) {
      if (RAW_OLLAMA_ALLOWED.has(name)) {
        continue;
      }
      expect(source(`managers/${name}.manager.ts`), name).not.toContain('api/v1/ollama/generate');
    }
  });
});
