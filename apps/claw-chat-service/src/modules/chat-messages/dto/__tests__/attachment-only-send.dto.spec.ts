// "I can send attachments/files WITHOUT text." Every send surface that accepts
// files must accept an empty prompt when files are attached, and must still
// refuse an empty prompt with nothing attached. One table, every schema, so a
// new surface cannot quietly keep the old `min(1)`.
import { type ZodTypeAny } from 'zod';

import { RepairType } from '../../../../common/enums/repair-type.enum';
import { MAX_ATTACHMENTS_PER_REQUEST } from '../../constants/attachment.constants';
import { bestOfNMessageSchema } from '../best-of-n-message.dto';
import { consensusMessageSchema } from '../consensus-message.dto';
import { costEnsembleMessageSchema } from '../cost-ensemble-message.dto';
import { createMessageSchema } from '../create-message.dto';
import { decomposeTaskSchema } from '../decompose-task.dto';
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

const TRIVIAL = ['', ' ', '\n\t ', '   '];

describe.each(surfaces)('%s send schema', (_name, schema, base) => {
  it.each(TRIVIAL)('accepts content %j when files are attached', (content) => {
    expect(schema.safeParse({ ...base, content, fileIds: ['f1'] }).success).toBe(true);
  });

  it.each(TRIVIAL)('rejects content %j with no files', (content) => {
    expect(schema.safeParse({ ...base, content }).success).toBe(false);
    expect(schema.safeParse({ ...base, content, fileIds: [] }).success).toBe(false);
  });

  it('still accepts ordinary text with no files', () => {
    expect(
      schema.safeParse({ ...base, content: 'Please review this document carefully.' }).success,
    ).toBe(true);
  });

  it(`rejects more than ${String(MAX_ATTACHMENTS_PER_REQUEST)} files`, () => {
    const fileIds = Array.from(
      { length: MAX_ATTACHMENTS_PER_REQUEST + 1 },
      (_, i) => `f${String(i)}`,
    );
    expect(schema.safeParse({ ...base, content: '', fileIds }).success).toBe(false);
  });

  it(`accepts exactly ${String(MAX_ATTACHMENTS_PER_REQUEST)} files with no text`, () => {
    const fileIds = Array.from({ length: MAX_ATTACHMENTS_PER_REQUEST }, (_, i) => `f${String(i)}`);
    expect(schema.safeParse({ ...base, content: '', fileIds }).success).toBe(true);
  });

  // Fuzz: any whitespace-only prompt is accepted exactly when a file rides with it.
  it('fuzz: whitespace-only content is valid iff files are attached', () => {
    const alphabet = [' ', '\n', '\t', '\r'];
    for (let run = 0; run < 50; run += 1) {
      const length = run % 7;
      const content = Array.from(
        { length },
        (_, i) => alphabet[(run * 31 + i * 7) % alphabet.length],
      ).join('');
      const withFiles = run % 2 === 0;
      const result = schema.safeParse({
        ...base,
        content,
        ...(withFiles ? { fileIds: ['f1'] } : {}),
      });
      expect(result.success).toBe(withFiles);
    }
  });
});

describe('decompose keeps its minimum for text-only tasks', () => {
  it('rejects a short task with no files', () => {
    expect(decomposeTaskSchema.safeParse({ content: 'too short' }).success).toBe(false);
  });

  it('accepts a short task when a file is attached', () => {
    expect(decomposeTaskSchema.safeParse({ content: 'do it', fileIds: ['f1'] }).success).toBe(true);
  });
});

describe('repair by message id needs neither content nor files', () => {
  it('accepts a messageId alone', () => {
    expect(
      repairMessageSchema.safeParse({ messageId: 'm1', repairTypes: [RepairType.FORMAT] }).success,
    ).toBe(true);
  });
});
