import { type Mock, vi } from 'vitest';
import {
  type MemoryRecord,
  MemoryRetention,
  MemoryScope,
  MemorySensitivity,
  MemorySource,
  MemoryType,
} from '../../../generated/prisma';
import { MemoryService } from '../services/memory.service';
import { type MemoryRepository } from '../repositories/memory.repository';
import { type MemoryEmbeddingManager } from '../managers/memory-embedding.manager';
import { type MemoryExtractionManager } from '../managers/memory-extraction.manager';
import { MemorySensitivityManager } from '../managers/memory-sensitivity.manager';
import { type MemorySuggestionRepository } from '../../memory-suggestions/repositories/memory-suggestion.repository';
import { type MemoryAuditService } from '../../memory-audit/services/memory-audit.service';
import { type MemoryPreferenceService } from '../../memory-preferences/services/memory-preference.service';
import { createMemorySchema } from '../dto/create-memory.dto';
import { updateMemorySchema } from '../dto/update-memory.dto';
import { MEMORY_CONTENT_MAX_CHARS } from '../../../common/constants/content-limits.constants';

function makeStub<T extends object>(): T {
  const cache: Record<string | symbol, Mock> = {};
  return new Proxy({} as T, {
    get: (_target, prop) => {
      cache[prop] ??= vi.fn();
      return cache[prop];
    },
  });
}

function record(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: 'mem-1',
    userId: 'user-1',
    type: MemoryType.INSTRUCTION,
    content: 'old',
    sourceThreadId: null,
    sourceMessageId: null,
    isEnabled: true,
    scope: MemoryScope.USER,
    scopeRef: null,
    tags: [],
    category: null,
    priority: 50,
    confidence: 1,
    source: MemorySource.USER_MANUAL,
    sensitivity: MemorySensitivity.NORMAL,
    retentionPolicy: MemoryRetention.PERMANENT,
    expiresAt: null,
    pinned: false,
    pausedUntil: null,
    qualityScore: 0.5,
    useCount: 0,
    lastUsedAt: null,
    provenanceJson: null,
    embeddedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Realistic spec markdown: headings, tables, API paths, long words. */
function specMarkdown(targetChars: number): string {
  const block = [
    '## Documentation Date validation',
    '',
    'Route: `POST /api/v1/careplans/documentation/entries/validateDocumentationDate`',
    '',
    '| Field | Rule | Error |',
    '| --- | --- | --- |',
    '| documentationDate | must not be in the future | "Documentation Date cannot be in the future." |',
    '',
    '- Use the patient timezone when comparing dates.',
    '',
  ].join('\n');
  let out = '# Myoncare specification\n\n';
  while (out.length < targetChars) out += block;
  return out.slice(0, targetChars);
}

describe('MemoryService — large markdown content (owner bug 1 + 2)', () => {
  let repo: MemoryRepository;
  let embedding: MemoryEmbeddingManager;
  let service: MemoryService;

  beforeEach(() => {
    repo = makeStub<MemoryRepository>();
    embedding = makeStub<MemoryEmbeddingManager>();
    const prefs = makeStub<MemoryPreferenceService>();
    service = new MemoryService(
      repo,
      makeStub<MemoryExtractionManager>(),
      new MemorySensitivityManager(),
      embedding,
      makeStub<MemorySuggestionRepository>(),
      makeStub<MemoryAuditService>(),
      prefs,
      { publish: vi.fn(), subscribe: vi.fn() } as never,
      { resolve: vi.fn().mockResolvedValue({ isAdmin: true }) } as never,
    );
    (repo.createWithinLimit as unknown as Mock).mockImplementation(
      async (data: { content: string; sensitivity: MemorySensitivity }) =>
        record({ content: data.content, sensitivity: data.sensitivity }),
    );
  });

  it('stores a 45K-char markdown spec whole, not a 256-char stub', async () => {
    const content = specMarkdown(45_000);
    const created = await service.createMemory('user-1', { type: MemoryType.FACT, content });
    expect(created.content).toHaveLength(45_000);
    expect(created.content).toBe(content);
    expect(created.sensitivity).not.toBe(MemorySensitivity.REDACTED);
  });

  it('masks a real secret in place and keeps every other character', async () => {
    const head = specMarkdown(30_000);
    const content = `${head}\nKey: AKIA1234567890ABCDEF\n${specMarkdown(20_000)}`;
    const created = await service.createMemory('user-1', { type: MemoryType.FACT, content });
    expect(created.sensitivity).toBe(MemorySensitivity.REDACTED);
    expect(created.content).not.toContain('AKIA1234567890ABCDEF');
    expect(created.content.length).toBe(content.length);
    expect(created.content.startsWith(head)).toBe(true);
    expect(created.content.endsWith(specMarkdown(20_000))).toBe(true);
  });

  it('finds a secret placed after the first 8K characters', () => {
    const content = `${specMarkdown(60_000)} ghp_abcdefghijklmnopqrstuvwxyz0123456789`;
    const verdict = new MemorySensitivityManager().classify(content);
    expect(verdict.verdict).toBe(MemorySensitivity.REDACTED);
  });

  it('gives the same verdict on repeated calls (no global-regex lastIndex drift)', () => {
    const manager = new MemorySensitivityManager();
    const text = 'token AKIA1234567890ABCDEF here';
    expect(manager.classify(text).verdict).toBe(MemorySensitivity.REDACTED);
    expect(manager.classify(text).verdict).toBe(MemorySensitivity.REDACTED);
    expect(manager.classify(text).verdict).toBe(MemorySensitivity.REDACTED);
  });

  it('does not flag lower-case URL paths as an AWS secret', () => {
    const verdict = new MemorySensitivityManager().classify(
      'See docs/careplans/documentation/entries/validation/rules for details.',
    );
    expect(verdict.verdict).toBe(MemorySensitivity.NORMAL);
  });

  it('persists a type change on update (Instruction -> Fact)', async () => {
    (repo.findById as unknown as Mock).mockResolvedValue(record());
    (repo.update as unknown as Mock).mockImplementation(async (_id: string, data: object) =>
      record(data as Partial<MemoryRecord>),
    );
    const parsed = updateMemorySchema.parse({ type: MemoryType.FACT, content: 'new body' });
    const updated = await service.updateMemory('mem-1', 'user-1', parsed);
    expect(repo.update).toHaveBeenCalledWith(
      'mem-1',
      expect.objectContaining({ type: MemoryType.FACT, content: 'new body' }),
    );
    expect(updated.type).toBe(MemoryType.FACT);
  });

  it('re-classifies sensitivity when content changes on update', async () => {
    (repo.findById as unknown as Mock).mockResolvedValue(record());
    (repo.update as unknown as Mock).mockImplementation(async (_id: string, data: object) =>
      record(data as Partial<MemoryRecord>),
    );
    await service.updateMemory('mem-1', 'user-1', { content: specMarkdown(100_000) });
    expect(repo.update).toHaveBeenCalledWith(
      'mem-1',
      expect.objectContaining({ content: specMarkdown(100_000) }),
    );
    expect(embedding.embedOne).toHaveBeenCalled();
  });
});

describe('memory DTO size limits (owner bug 3)', () => {
  it('accepts content up to the ceiling', () => {
    const ok = createMemorySchema.safeParse({
      type: MemoryType.FACT,
      content: 'a'.repeat(MEMORY_CONTENT_MAX_CHARS),
    });
    expect(ok.success).toBe(true);
    expect(MEMORY_CONTENT_MAX_CHARS).toBeGreaterThanOrEqual(250_000);
  });

  it('rejects content above the ceiling on create and update', () => {
    const big = 'a'.repeat(MEMORY_CONTENT_MAX_CHARS + 1);
    expect(createMemorySchema.safeParse({ type: MemoryType.FACT, content: big }).success).toBe(
      false,
    );
    expect(updateMemorySchema.safeParse({ content: big }).success).toBe(false);
  });

  it('accepts every memory type on update and rejects an unknown one', () => {
    for (const type of Object.values(MemoryType)) {
      expect(updateMemorySchema.safeParse({ type }).success).toBe(true);
    }
    expect(updateMemorySchema.safeParse({ type: 'NOPE' }).success).toBe(false);
  });
});
