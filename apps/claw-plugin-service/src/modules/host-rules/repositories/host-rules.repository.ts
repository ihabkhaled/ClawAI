import { Injectable } from '@nestjs/common';

import { HostRuleKind } from '../../../common/enums/host-rule-kind.enum';
import { HostRuleMatch } from '../../../common/enums/host-rule-match.enum';
import { type PluginHostRule } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HOST_RULES_MAX } from '../constants/host-rules.constants';
import { type HostRuleRecord, type NewHostRule } from '../types/host-rules.types';

@Injectable()
export class HostRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<HostRuleRecord[]> {
    const rows = await this.prisma.pluginHostRule.findMany({
      orderBy: [{ match: 'asc' }, { kind: 'asc' }, { pattern: 'asc' }],
      take: HOST_RULES_MAX,
    });
    return rows.map((row) => this.toRecord(row));
  }

  count(): Promise<number> {
    return this.prisma.pluginHostRule.count();
  }

  /** Null when the same rule already exists. */
  async create(rule: NewHostRule): Promise<HostRuleRecord | null> {
    const existing = await this.prisma.pluginHostRule.findUnique({
      where: { kind_match_pattern: { kind: rule.kind, match: rule.match, pattern: rule.pattern } },
      select: { id: true },
    });
    return existing !== null
      ? null
      : this.toRecord(await this.prisma.pluginHostRule.create({ data: rule }));
  }

  async delete(id: string): Promise<HostRuleRecord | null> {
    const row = await this.prisma.pluginHostRule.findUnique({ where: { id } });
    if (row === null) return null;
    await this.prisma.pluginHostRule.deleteMany({ where: { id } });
    return this.toRecord(row);
  }

  private toRecord(row: PluginHostRule): HostRuleRecord {
    return {
      id: row.id,
      kind: HostRuleKind[row.kind],
      match: HostRuleMatch[row.match],
      pattern: row.pattern,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}
