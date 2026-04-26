import { Injectable, Logger } from '@nestjs/common';
import { ClientLog } from '../schemas/client-log.schema';
import { ClientLogsRepository } from '../repositories/client-logs.repository';
import type {
  ClientLogFilters,
  ClientLogStatsResponse,
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
    this.logger.debug(`create: level=${input.level} component=${input.component ?? 'none'}`);
    try {
      const doc = await this.clientLogsRepository.create(input);
      const id = String(doc._id);
      this.logger.log(`create: persisted client-log id=${id}`);
      return { id };
    } catch (error) {
      this.logger.error(`create: failed — ${(error as Error).message}`);
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
