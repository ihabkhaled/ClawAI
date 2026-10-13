import { consensusMessageSchema } from '../consensus-message.dto';
import { contextSaveProposalConfirmSchema } from '../context-save-proposal-confirm.dto';
import { createMessageSchema } from '../create-message.dto';
import { saveIntentVerdictSchema } from '../save-intent-verdict.dto';
import best_of_n_message_source from '../best-of-n-message.dto.ts?raw';
import consensus_message_source from '../consensus-message.dto.ts?raw';
import cost_ensemble_message_source from '../cost-ensemble-message.dto.ts?raw';
import decompose_task_source from '../decompose-task.dto.ts?raw';
import escalation_chain_message_source from '../escalation-chain-message.dto.ts?raw';
import parallel_message_source from '../parallel-message.dto.ts?raw';
import pipeline_message_source from '../pipeline-message.dto.ts?raw';
import repair_message_source from '../repair-message.dto.ts?raw';
import role_pack_message_source from '../role-pack-message.dto.ts?raw';
import verify_message_source from '../verify-message.dto.ts?raw';
import saveIntentConstantsSource from '../../constants/save-intent.constants.ts?raw';
import {
  SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
  SAVE_INTENT_PACK_NAME_MAX_CHARS,
  SAVE_INTENT_SUMMARY_MAX_CHARS,
} from '../../constants/save-intent.constants';

/**
 * ADR-168 / rules/59: only the surfaces whose backend path runs the save
 * orchestrator carry `contextSaveMode`. The orchestration managers (Compare,
 * Consensus, Escalation, the labs, in-thread Compare) never read it, so a field
 * they accepted would be a switch wired to nothing.
 */
const ORCHESTRATION_DTOS: ReadonlyArray<readonly [string, string]> = [
  ['best-of-n-message.dto.ts', best_of_n_message_source],
  ['consensus-message.dto.ts', consensus_message_source],
  ['cost-ensemble-message.dto.ts', cost_ensemble_message_source],
  ['decompose-task.dto.ts', decompose_task_source],
  ['escalation-chain-message.dto.ts', escalation_chain_message_source],
  ['parallel-message.dto.ts', parallel_message_source],
  ['pipeline-message.dto.ts', pipeline_message_source],
  ['repair-message.dto.ts', repair_message_source],
  ['role-pack-message.dto.ts', role_pack_message_source],
  ['verify-message.dto.ts', verify_message_source],
];

describe('contextSaveMode lives only where the save orchestrator runs (ADR-168)', () => {
  it.each(ORCHESTRATION_DTOS)('%s does not accept contextSaveMode', (_file, source) => {
    expect(source).not.toContain('contextSave');
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
    const source = saveIntentConstantsSource;

    expect(source).toMatch(/export const SAVE_INTENT_MEMORY_TEXT_MAX_CHARS = [\d_]+;/u);
    expect(source).toMatch(/export const SAVE_INTENT_SUMMARY_MAX_CHARS = [\d_]+;/u);
    expect(source).toMatch(/export const SAVE_INTENT_PACK_NAME_MAX_CHARS = [\d_]+;/u);
    expect(source).toMatch(/export const SAVE_PACK_CONTENT_MAX_CHARS = [\d_]+;/u);
  });
});
