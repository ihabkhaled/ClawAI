import { Injectable } from "@nestjs/common";
import { UsageLedger } from "../schemas/usage-ledger.schema";
import { UsageLedgerRepository } from "../repositories/usage-ledger.repository";
import type {
  CreateUsageLedgerInput,
  UsageLedgerFilters,
  UsageSummaryResponse,
  CostSummaryResult,
  LatencySummaryResult,
} from "../types/audits.types";
import type { PaginatedResult } from "@common/types";

@Injectable()
export class UsageService {
  constructor(private readonly usageLedgerRepository: UsageLedgerRepository) {}

  async createUsageEntry(input: CreateUsageLedgerInput): Promise<UsageLedger> {
    return this.usageLedgerRepository.create(input);
  }

  async getUsageEntries(filters: UsageLedgerFilters): Promise<PaginatedResult<UsageLedger>> {
    const [data, total] = await Promise.all([
      this.usageLedgerRepository.findAll(filters),
      this.usageLedgerRepository.countAll(filters),
    ]);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUsageSummary(): Promise<UsageSummaryResponse> {
    const [byProvider, byModel, costSummary] = await Promise.all([
      this.usageLedgerRepository.aggregateByProvider(),
      this.usageLedgerRepository.aggregateByModel(),
      this.usageLedgerRepository.aggregateCostSummary(),
    ]);

    return {
      byProvider,
      byModel,
      totalRequests: costSummary.totalRequests,
    };
  }

  async getCostSummary(): Promise<CostSummaryResult> {
    return this.usageLedgerRepository.aggregateCostSummary();
  }

  async getLatencySummary(): Promise<LatencySummaryResult> {
    return this.usageLedgerRepository.aggregateLatencySummary();
  }
}
