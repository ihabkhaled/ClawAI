import {
  MemoryAuditAction,
  type MemoryRecord,
  MemoryRetention,
  MemoryScope,
  MemorySensitivity,
  MemorySource,
  MemoryType,
} from '../../../generated/prisma';
import { MemoryService } from '../services/memory.service';
import { type MemoryRepository } from '../repositories/memory.repository';
import { type MemoryExtractionManager } from '../managers/memory-extraction.manager';
import { MemorySensitivityManager } from '../managers/memory-sensitivity.manager';
import { type MemorySuggestionRepository } from '../../memory-suggestions/repositories/memory-suggestion.repository';
import { type MemoryAuditService } from '../../memory-audit/services/memory-audit.service';
import { type MemoryPreferenceService } from '../../memory-preferences/services/memory-preference.service';
import type { CreateMemoryDto } from '../dto/create-memory.dto';

function makeStub<T extends object>(): T {
  const cache: Record<string | symbol, jest.Mock> = {};
  return new Proxy({} as T, {
    get: (_target, prop) => {
      if (!cache[prop]) {
        cache[prop] = jest.fn();
      }
      return cache[prop];
    },
  });
}

function buildMemoryRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: 'mem-1',
    userId: 'user-1',
    type: MemoryType.FACT,
    content: 'Pretend memory content',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MemoryService (V2)', () => {
  let memoryRepo: MemoryRepository;
  let extraction: MemoryExtractionManager;
  let sensitivity: MemorySensitivityManager;
  let suggestionRepo: MemorySuggestionRepository;
  let auditService: MemoryAuditService;
  let preferenceService: MemoryPreferenceService;
  let rabbit: { publish: ReturnType<typeof jest.fn>; subscribe: ReturnType<typeof jest.fn> };
  let service: MemoryService;

  beforeEach(() => {
    memoryRepo = makeStub<MemoryRepository>();
    extraction = makeStub<MemoryExtractionManager>();
    sensitivity = new MemorySensitivityManager();
    suggestionRepo = makeStub<MemorySuggestionRepository>();
    auditService = makeStub<MemoryAuditService>();
    preferenceService = makeStub<MemoryPreferenceService>();
    rabbit = { publish: jest.fn(), subscribe: jest.fn() };
    service = new MemoryService(
      memoryRepo,
      extraction,
      sensitivity,
      suggestionRepo,
      auditService,
      preferenceService,
      rabbit as unknown as ConstructorParameters<typeof MemoryService>[6],
    );
  });

  it('creates a normal memory and records audit', async () => {
    const created = buildMemoryRecord();
    (memoryRepo.create as unknown as jest.Mock).mockResolvedValue(created);

    const dto: CreateMemoryDto = {
      type: MemoryType.FACT,
      content: 'My favourite colour is blue.',
    };

    const result = await service.createMemory('user-1', dto);

    expect(result).toEqual(created);
    expect(memoryRepo.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: MemoryAuditAction.CREATED,
      }),
    );
  });

  it('redacts content when sensitivity classifier finds an AWS key', async () => {
    const created = buildMemoryRecord({
      content: 'AK********0000',
      sensitivity: MemorySensitivity.REDACTED,
    });
    (memoryRepo.create as unknown as jest.Mock).mockResolvedValue(created);

    const dto: CreateMemoryDto = {
      type: MemoryType.FACT,
      content: 'My AWS key is AKIA1234567890ABCDEF',
    };

    const result = await service.createMemory('user-1', dto);

    expect(result.sensitivity).toBe(MemorySensitivity.REDACTED);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: MemoryAuditAction.REDACTED }),
    );
  });

  it('blocks forget without confirmation', async () => {
    await expect(service.deleteMemory('mem-1', 'user-1', false)).rejects.toMatchObject({
      code: 'FORGET_CONFIRMATION_REQUIRED',
    });
  });
});
