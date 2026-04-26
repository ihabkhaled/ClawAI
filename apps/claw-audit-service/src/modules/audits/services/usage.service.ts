import { Injectable, Logger } from '@nestjs/common';
import { UsageLedger } from '../schemas/usage-ledger.schema';
import { UsageLedgerRepository } from '../repositories/usage-ledger.repository';
import type {
  CostSummaryResult,
  CreateUsageLedgerInput,
  LatencySummaryResult,
  UsageLedgerFilters,
  UsageSummaryResponse,
} from '../types/audits.types';
import type { PaginatedResult } from '@common/types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly usageLedgerRepository: UsageLedgerRepository) {}

  async createUsageEntry(input: CreateUsageLedgerInput): Promise<UsageLedger> {
    this.logger.debug(
      `createUsageEntry: resource=${input.resourceType} action=${input.action} qty=${String(input.quantity)}`,
    );
    try {
      const doc = await this.usageLedgerRepository.create(input);
      this.logger.log(
        `createUsageEntry: persisted resource=${input.resourceType} action=${input.action}`,
      );
      return doc;
    } catch (error) {
      this.logger.error(`createUsageEntry: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getUsageEntries(filters: UsageLedgerFilters): Promise<PaginatedResult<UsageLedger>> {
    this.logger.debug(
      `getUsageEntries: page=${String(filters.page)} limit=${String(filters.limit)}`,
    );
    try {
      const [data, total] = await Promise.all([
        this.usageLedgerRepository.findAll(filters),
        this.usageLedgerRepository.countAll(filters),
      ]);

      const page = filters.page ?? DEFAULT_PAGE;
      const limit = filters.limit ?? DEFAULT_PAGE_SIZE;

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`getUsageEntries: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getUsageSummary(): Promise<UsageSummaryResponse> {
    this.logger.debug('getUsageSummary: aggregating');
    try {
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
    } catch (error) {
      this.logger.error(`getUsageSummary: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getCostSummary(): Promise<CostSummaryResult> {
    this.logger.debug('getCostSummary: aggregating cost summary');
    try {
      return await this.usageLedgerRepository.aggregateCostSummary();
    } catch (error) {
      this.logger.error(`getCostSummary: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getLatencySummary(): Promise<LatencySummaryResult> {
    this.logger.debug('getLatencySummary: aggregating latency summary');
    try {
      return await this.usageLedgerRepository.aggregateLatencySummary();
    } catch (error) {
      this.logger.error(`getLatencySummary: failed — ${(error as Error).message}`);
      throw error;
    }
  }
}
