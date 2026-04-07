import { Injectable } from "@nestjs/common";
import { ClientLog } from "../schemas/client-log.schema";
import { ClientLogsRepository } from "../repositories/client-logs.repository";
import type {
  ClientLogFilters,
  ClientLogStatsResponse,
  CreateClientLogInput,
  CreateClientLogResponse,
} from "../types/client-logs.types";
import type { PaginatedResult } from "@common/types";

@Injectable()
export class ClientLogsService {
  constructor(private readonly clientLogsRepository: ClientLogsRepository) {}

  async create(input: CreateClientLogInput): Promise<CreateClientLogResponse> {
    const doc = await this.clientLogsRepository.create(input);
    return { id: String(doc._id) };
  }

  async search(filters: ClientLogFilters): Promise<PaginatedResult<ClientLog>> {
    const [data, total] = await Promise.all([
      this.clientLogsRepository.findAll(filters),
      this.clientLogsRepository.countAll(filters),
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

  async getStats(): Promise<ClientLogStatsResponse> {
    const [byLevel, topComponents, topActions, total] = await Promise.all([
      this.clientLogsRepository.aggregateByLevel(),
      this.clientLogsRepository.aggregateByComponent(),
      this.clientLogsRepository.aggregateByAction(),
      this.clientLogsRepository.countAll({}),
    ]);

    return { byLevel, topComponents, topActions, total };
  }
}
