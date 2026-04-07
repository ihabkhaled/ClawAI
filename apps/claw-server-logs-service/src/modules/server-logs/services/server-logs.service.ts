import { Injectable } from "@nestjs/common";
import { ServerLog } from "../schemas/server-log.schema";
import { ServerLogsRepository } from "../repositories/server-logs.repository";
import type {
  BatchCreateServerLogsResponse,
  CreateServerLogInput,
  CreateServerLogResponse,
  ServerLogFilters,
  ServerLogStatsResponse,
} from "../types/server-logs.types";
import type { PaginatedResult } from "@common/types";

@Injectable()
export class ServerLogsService {
  constructor(private readonly serverLogsRepository: ServerLogsRepository) {}

  async createLog(input: CreateServerLogInput): Promise<CreateServerLogResponse> {
    const doc = await this.serverLogsRepository.create(input);
    return { id: String(doc._id) };
  }

  async createMany(inputs: CreateServerLogInput[]): Promise<BatchCreateServerLogsResponse> {
    const inserted = await this.serverLogsRepository.createMany(inputs);
    return { inserted };
  }

  async getLogs(filters: ServerLogFilters): Promise<PaginatedResult<ServerLog>> {
    const [data, total] = await Promise.all([
      this.serverLogsRepository.findAll(filters),
      this.serverLogsRepository.countAll(filters),
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

  async getStats(): Promise<ServerLogStatsResponse> {
    const [byLevel, byService, byAction, total] = await Promise.all([
      this.serverLogsRepository.aggregateByLevel(),
      this.serverLogsRepository.aggregateByService(),
      this.serverLogsRepository.aggregateByAction(),
      this.serverLogsRepository.countAll({}),
    ]);

    return { byLevel, byService, byAction, total };
  }
}
