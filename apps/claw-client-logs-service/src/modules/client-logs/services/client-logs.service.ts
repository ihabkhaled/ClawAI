import { Injectable, Logger } from '@nestjs/common';
import { ClientLog } from '../schemas/client-log.schema';
import { ClientLogsRepository } from '../repositories/client-logs.repository';
import type {
  ClientLogFilters,
  ClientLogStatsResponse,
  CreateClientLogBatchResponse,
  CreateClientLogInput,
  CreateClientLogResponse,
  DistinctValuesResult,
} from '../types/client-logs.types';
import type { PaginatedResult } from '@common/types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';

@Injectable()
export class ClientLogsService {
  private readonly logger = new Logger(ClientLogsService.name);

  constructor(private readonly clientLogsRepository: ClientLogsRepository) {}

  async create(input: CreateClientLogInput): Promise<CreateClientLogResponse> {
    try {
      const doc = await this.clientLogsRepository.create(input);
      return { id: String(doc._id) };
    } catch (error) {
      this.logger.error(`create: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Persists a batch of events in one round trip.
   *
   * Logs once for the batch, not once per event. The previous single-event path
   * emitted roughly four server log lines per client log line — interceptor,
   * service debug, service info, repository info — so ingesting telemetry cost
   * four times as much telemetry.
   */
  async createMany(inputs: CreateClientLogInput[]): Promise<CreateClientLogBatchResponse> {
    try {
      const docs = await this.clientLogsRepository.createMany(inputs);
      const ids = docs.map((doc) => String(doc._id));
      this.logger.log(`createMany: persisted ${String(ids.length)} of ${String(inputs.length)}`);
      return { ids, accepted: ids.length };
    } catch (error) {
      this.logger.error(`createMany: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async search(filters: ClientLogFilters): Promise<PaginatedResult<ClientLog>> {
    this.logger.debug(`search: page=${String(filters.page)} limit=${String(filters.limit)}`);
    try {
      const [data, total] = await Promise.all([
        this.clientLogsRepository.findAll(filters),
        this.clientLogsRepository.countAll(filters),
      ]);

      const page = filters.page ?? DEFAULT_PAGE;
      const limit = filters.limit ?? DEFAULT_PAGE_SIZE;

      this.logger.debug(
        `search: returning total=${String(total)} pageItems=${String(data.length)}`,
      );

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
      this.logger.error(`search: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getStats(): Promise<ClientLogStatsResponse> {
    this.logger.debug('getStats: aggregating');
    try {
      const [byLevel, topComponents, topActions, topRoutes, total, errorCount] = await Promise.all([
        this.clientLogsRepository.aggregateByLevel(),
        this.clientLogsRepository.aggregateByComponent(),
        this.clientLogsRepository.aggregateByAction(),
        this.clientLogsRepository.aggregateByRoute(),
        this.clientLogsRepository.countAll({}),
        this.clientLogsRepository.getErrorCount({}),
      ]);

      this.logger.debug(`getStats: total=${String(total)} errors=${String(errorCount)}`);

      return { byLevel, topComponents, topActions, topRoutes, errorCount, total };
    } catch (error) {
      this.logger.error(`getStats: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getDistinctValues(field: string, filters: ClientLogFilters): Promise<DistinctValuesResult> {
    this.logger.debug(`getDistinctValues: field=${field}`);
    try {
      return await this.clientLogsRepository.getDistinctValues(field, filters);
    } catch (error) {
      this.logger.error(`getDistinctValues: failed field=${field} — ${(error as Error).message}`);
      throw error;
    }
  }
}
