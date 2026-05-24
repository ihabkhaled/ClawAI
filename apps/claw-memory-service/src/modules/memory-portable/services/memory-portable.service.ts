import { Injectable, Logger } from '@nestjs/common';
import { type MemoryRecord, MemoryType } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { MemoryService } from '../../memory/services/memory.service';
import type { ImportResult, ImportRow } from '../types/memory-portable.types';

export type { ImportResult, ImportRow };

@Injectable()
export class MemoryPortableService {
  private readonly logger = new Logger(MemoryPortableService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {}

  async exportNdjson(userId: string): Promise<string> {
    const memories = await this.prisma.memoryRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 10_000,
    });
    return memories.map((m) => JSON.stringify(this.serialise(m))).join('\n');
  }

  async importNdjson(userId: string, body: string): Promise<ImportResult> {
    const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };
    const lines = body.split(/\r?\n/).filter((line) => line.trim().length > 0);
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i] ?? '';
      try {
        const parsed = JSON.parse(raw) as Partial<ImportRow>;
        if (!parsed.content || parsed.content.length === 0) {
          result.skipped += 1;
          result.errors.push({ index: i, reason: 'missing_content' });
          continue;
        }
        const memoryType = this.coerceType(parsed.type);
        if (memoryType === null) {
          result.skipped += 1;
          result.errors.push({ index: i, reason: 'invalid_type' });
          continue;
        }
        await this.memoryService.createMemory(userId, {
          type: memoryType,
          content: parsed.content,
          tags: parsed.tags,
          category: parsed.category,
          pinned: parsed.pinned,
        });
        result.inserted += 1;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'unknown';
        result.errors.push({ index: i, reason: msg });
        result.skipped += 1;
      }
    }
    this.logger.log(
      `importNdjson: userId=${userId} inserted=${String(result.inserted)} skipped=${String(result.skipped)}`,
    );
    return result;
  }

  private serialise(memory: MemoryRecord): Record<string, unknown> {
    return {
      type: memory.type,
      content: memory.sensitivity === 'REDACTED' ? '[REDACTED]' : memory.content,
      scope: memory.scope,
      scopeRef: memory.scopeRef,
      tags: memory.tags,
      category: memory.category,
      priority: memory.priority,
      sensitivity: memory.sensitivity,
      pinned: memory.pinned,
      source: memory.source,
      createdAt: memory.createdAt.toISOString(),
    };
  }

  private coerceType(input: unknown): MemoryType | null {
    if (typeof input !== 'string') return null;
    const candidate = input.toUpperCase();
    const valid: MemoryType[] = [
      MemoryType.FACT,
      MemoryType.PREFERENCE,
      MemoryType.INSTRUCTION,
      MemoryType.SUMMARY,
    ];
    return valid.find((v) => v === candidate) ?? null;
  }
}
