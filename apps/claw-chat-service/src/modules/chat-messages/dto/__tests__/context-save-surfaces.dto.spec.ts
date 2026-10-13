import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { consensusMessageSchema } from '../consensus-message.dto';
import { contextSaveProposalConfirmSchema } from '../context-save-proposal-confirm.dto';
import { createMessageSchema } from '../create-message.dto';
import { saveIntentVerdictSchema } from '../save-intent-verdict.dto';
import {
  SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
  SAVE_INTENT_PACK_NAME_MAX_CHARS,
  SAVE_INTENT_SUMMARY_MAX_CHARS,
} from '../../constants/save-intent.constants';

const DTO_DIR = join(__dirname, '..');

/**
 * ADR-168 / rules/59: only the surfaces whose backend path runs the save
 * orchestrator carry `contextSaveMode`. The orchestration managers (Compare,
 * Consensus, Escalation, the labs, in-thread Compare) never read it, so a field
 * they accepted would be a switch wired to nothing.
 */
const ORCHESTRATION_DTOS = [
  'best-of-n-message.dto.ts',
  'consensus-message.dto.ts',
  'cost-ensemble-message.dto.ts',
  'decompose-task.dto.ts',
  'escalation-chain-message.dto.ts',
  'parallel-message.dto.ts',
  'pipeline-message.dto.ts',
  'repair-message.dto.ts',
  'role-pack-message.dto.ts',
  'verify-message.dto.ts',
];

describe('contextSaveMode lives only where the save orchestrator runs (ADR-168)', () => {
  it.each(ORCHESTRATION_DTOS)('%s does not accept contextSaveMode', (file) => {
    expect(readFileSync(join(DTO_DIR, file), 'utf8')).not.toContain('contextSave');
  });

  it('createMessage keeps it', () => {
    const parsed = createMessageSchema.safeParse({
      threadId: 't1',
      content: 'remember I am vegetarian',
      contextSaveMode: 'AUTO',
    });

    expect(parsed.success && parsed.data.contextSaveMode).toBe('AUTO');
    expect(
      createMessageSchema.safeParse({ threadId: 't1', content: 'x', contextSaveMode: 'NOPE' })
        .success,
    ).toBe(false);
  });

  it('an orchestration body that still sends it has it ignored, not honoured', () => {
    const parsed = consensusMessageSchema.safeParse({
      content: 'Compare these',
      models: [
        { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
        { provider: 'OPENAI', model: 'gpt-4o' },
      ],
      contextSaveMode: 'AUTO',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && 'contextSaveMode' in parsed.data).toBe(false);
  });
});

describe('one set of limits for the planner, the confirm and the form (ADR-168)', () => {
  it('the memory cap is the planner summary cap, so no proposal is born unsaveable', () => {
    expect(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS).toBe(SAVE_INTENT_SUMMARY_MAX_CHARS);
  });

  it('a maximal planner memory is accepted by the confirm', () => {
    const text = 'x'.repeat(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS);

    expect(
      saveIntentVerdictSchema.safeParse({ save: true, memory: { type: 'SUMMARY', text } }).success,
    ).toBe(true);
    expect(
      contextSaveProposalConfirmSchema.safeParse({ memory: { type: 'SUMMARY', text } }).success,
    ).toBe(true);
  });

  it('one character over is refused by both', () => {
    const text = 'x'.repeat(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS + 1);

    expect(
      saveIntentVerdictSchema.safeParse({ save: true, memory: { type: 'SUMMARY', text } }).success,
    ).toBe(false);
    expect(
      contextSaveProposalConfirmSchema.safeParse({ memory: { type: 'SUMMARY', text } }).success,
    ).toBe(false);
  });

  it('a maximal planner pack name is accepted by the confirm', () => {
    const name = 'n'.repeat(SAVE_INTENT_PACK_NAME_MAX_CHARS);

    expect(
      saveIntentVerdictSchema.safeParse({
        save: true,
        contextPack: { source: 'USER_TEXT', newPackName: name },
      }).success,
    ).toBe(true);
    expect(
      contextSaveProposalConfirmSchema.safeParse({
        pack: { packId: null, newPackName: name, content: 'x' },
      }).success,
    ).toBe(true);
  });

  it('exports the numbers as plain literals the frontend test can read', () => {
    const source = readFileSync(
      join(DTO_DIR, '..', 'constants', 'save-intent.constants.ts'),
      'utf8',
    );

    for (const name of [
      'SAVE_INTENT_MEMORY_TEXT_MAX_CHARS',
      'SAVE_INTENT_SUMMARY_MAX_CHARS',
      'SAVE_INTENT_PACK_NAME_MAX_CHARS',
      'SAVE_PACK_CONTENT_MAX_CHARS',
    ]) {
      expect(source).toMatch(new RegExp(`export const ${name} = [\\d_]+;`, 'u'));
    }
  });
});
