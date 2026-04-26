import { Injectable, Logger } from '@nestjs/common';
import { ServerLog } from '../schemas/server-log.schema';
import { ServerLogsRepository } from '../repositories/server-logs.repository';
import type {
  BatchCreateServerLogsResponse,
  CreateServerLogInput,
  CreateServerLogResponse,
  DistinctValuesResult,
  ServerLogFilters,
  ServerLogStatsResponse,
  TimeSeriesBucket,
} from '../types/server-logs.types';
import type { PaginatedResult } from '@common/types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';

@Injectable()
export class ServerLogsService {
  private readonly logger = new Logger(ServerLogsService.name);

  constructor(private readonly serverLogsRepository: ServerLogsRepository) {}

  async createLog(input: CreateServerLogInput): Promise<CreateServerLogResponse> {
    this.logger.debug(`createLog: level=${input.level} serviceName=${input.serviceName}`);
    try {
      const doc = await this.serverLogsRepository.create(input);
      const id = String(doc._id);
      this.logger.log(`createLog: persisted server-log id=${id}`);
      return { id };
    } catch (error) {
      this.logger.error(`createLog: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async createMany(inputs: CreateServerLogInput[]): Promise<BatchCreateServerLogsResponse> {
    this.logger.debug(`createMany: count=${String(inputs.length)}`);
    try {
      const inserted = await this.serverLogsRepository.createMany(inputs);
      this.logger.log(`createMany: inserted=${String(inserted)}`);
      return { inserted };
    } catch (error) {
      this.logger.error(`createMany: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getLogs(filters: ServerLogFilters): Promise<PaginatedResult<ServerLog>> {
    this.logger.debug(`getLogs: page=${String(filters.page)} limit=${String(filters.limit)}`);
    try {
      const [data, total] = await Promise.all([
        this.serverLogsRepository.findAll(filters),
        this.serverLogsRepository.countAll(filters),
      ]);

      const page = filters.page ?? DEFAULT_PAGE;
      const limit = filters.limit ?? DEFAULT_PAGE_SIZE;

      this.logger.debug(`getLogs: total=${String(total)} pageItems=${String(data.length)}`);

      return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      this.logger.error(`getLogs: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getStats(): Promise<ServerLogStatsResponse> {
    this.logger.debug('getStats: aggregating server-log statistics');
    try {
      const [
        byLevel,
        byService,
        byAction,
        byMethod,
        byStatusCode,
        byModule,
        total,
        errorCount,
        avgLatencyMs,
      ] = await Promise.all([
        this.serverLogsRepository.aggregateByLevel(),
        this.serverLogsRepository.aggregateByService(),
        this.serverLogsRepository.aggregateByAction(),
        this.serverLogsRepository.aggregateByMethod(),
        this.serverLogsRepository.aggregateByStatusCode(),
        this.serverLogsRepository.aggregateByModule(),
        this.serverLogsRepository.countAll({}),
        this.serverLogsRepository.getErrorCount({}),
        this.serverLogsRepository.getAvgLatency({}),
      ]);

      this.logger.debug(
        `getStats: total=${String(total)} errors=${String(errorCount)} avgLatencyMs=${String(avgLatencyMs)}`,
      );

      return {
        byLevel,
        byService,
        byAction,
        byMethod,
        byStatusCode,
        byModule,
        total,
        errorCount,
        avgLatencyMs,
      };
    } catch (error) {
      this.logger.error(`getStats: failed — ${(error as Error).message}`);
      throw error;
    }
  }

  async getDistinctValues(field: string, filters: ServerLogFilters): Promise<DistinctValuesResult> {
    this.logger.debug(`getDistinctValues: field=${field}`);
    try {
      return await this.serverLogsRepository.getDistinctValues(field, filters);
    } catch (error) {
      this.logger.error(`getDistinctValues: failed field=${field} — ${(error as Error).message}`);
      throw error;
    }
  }

  async getTimeSeries(
    filters: ServerLogFilters,
    intervalMinutes: number,
  ): Promise<TimeSeriesBucket[]> {
    this.logger.debug(`getTimeSeries: intervalMinutes=${String(intervalMinutes)}`);
    try {
      return await this.serverLogsRepository.getTimeSeries(filters, intervalMinutes);
    } catch (error) {
      this.logger.error(`getTimeSeries: failed — ${(error as Error).message}`);
      throw error;
    }
  }
}
