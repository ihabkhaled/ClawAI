// ADR-219: one inline-text cap on every chat surface (rules/59). Labs used to
// stop at 10,000 characters while chat took 100,000, so a paste that worked in
// chat failed in a lab. Longer text becomes a text attachment in the composer.
import { type ZodTypeAny } from 'zod';

import { RepairType } from '../../../../common/enums/repair-type.enum';
import { MESSAGE_CONTENT_MAX_CHARS } from '../../constants/message-content.constants';
import { bestOfNMessageSchema } from '../best-of-n-message.dto';
import { consensusMessageSchema } from '../consensus-message.dto';
import { costEnsembleMessageSchema } from '../cost-ensemble-message.dto';
import { createMessageSchema } from '../create-message.dto';
import { decomposeTaskSchema } from '../decompose-task.dto';
import { editMessageSchema } from '../edit-message.dto';
import { escalationChainMessageSchema } from '../escalation-chain-message.dto';
import { parallelMessageSchema } from '../parallel-message.dto';
import { pipelineMessageSchema } from '../pipeline-message.dto';
import { repairMessageSchema } from '../repair-message.dto';
import { rolePackMessageSchema } from '../role-pack-message.dto';
import { verifyMessageSchema } from '../verify-message.dto';

const twoModels = [
  { provider: 'gemini', model: 'gemini-2.5-pro' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
];

const surfaces: ReadonlyArray<[string, ZodTypeAny, Record<string, unknown>]> = [
  ['chat', createMessageSchema, { threadId: 't1' }],
  ['edit', editMessageSchema, {}],
  ['compare', parallelMessageSchema, { models: twoModels }],
  ['consensus', consensusMessageSchema, { models: twoModels }],
  ['escalation', escalationChainMessageSchema, { chain: twoModels }],
  ['best-of-n', bestOfNMessageSchema, {}],
  ['cost-ensemble', costEnsembleMessageSchema, {}],
  ['decompose', decomposeTaskSchema, {}],
  ['pipeline', pipelineMessageSchema, {}],
  ['role-pack', rolePackMessageSchema, {}],
  ['verify', verifyMessageSchema, {}],
  ['repair', repairMessageSchema, { repairTypes: [RepairType.FORMAT] }],
];

describe.each(surfaces)('%s inline content cap', (_name, schema, base) => {
  it('accepts exactly the shared cap', () => {
    const content = 'a'.repeat(MESSAGE_CONTENT_MAX_CHARS);
    expect(schema.safeParse({ ...base, content }).success).toBe(true);
  });

  it('accepts a 50,000-character paste (the old 10,000 lab cap is gone)', () => {
    expect(schema.safeParse({ ...base, content: 'a'.repeat(50_000) }).success).toBe(true);
  });

  it('rejects one character over the cap', () => {
    const content = 'a'.repeat(MESSAGE_CONTENT_MAX_CHARS + 1);
    expect(schema.safeParse({ ...base, content }).success).toBe(false);
  });
});

describe('shared cap value', () => {
  it('is 100,000 characters, matching the frontend composer', () => {
    expect(MESSAGE_CONTENT_MAX_CHARS).toBe(100_000);
  });
});
