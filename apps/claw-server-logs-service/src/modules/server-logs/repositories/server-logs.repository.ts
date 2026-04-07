import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, Model } from "mongoose";
import { ServerLog } from "../schemas/server-log.schema";
import type {
  AggregationResult,
  CreateServerLogInput,
  ServerLogFilters,
} from "../types/server-logs.types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@common/constants";

@Injectable()
export class ServerLogsRepository {
  constructor(
    @InjectModel(ServerLog.name) private readonly serverLogModel: Model<ServerLog>,
  ) {}

  async create(input: CreateServerLogInput): Promise<ServerLog> {
    const doc = new this.serverLogModel(input);
    return doc.save();
  }

  async createMany(inputs: CreateServerLogInput[]): Promise<number> {
    const result = await this.serverLogModel.insertMany(inputs, { ordered: false });
    return result.length;
  }

  private buildQuery(filters: ServerLogFilters): FilterQuery<ServerLog> {
    const query: FilterQuery<ServerLog> = {};
    if (filters.level) query["level"] = filters.level;
    if (filters.serviceName) query["serviceName"] = filters.serviceName;
    if (filters.module) query["module"] = filters.module;
    if (filters.controller) query["controller"] = filters.controller;
    if (filters.action) query["action"] = filters.action;
    if (filters.requestId) query["requestId"] = filters.requestId;
    if (filters.traceId) query["traceId"] = filters.traceId;
    if (filters.userId) query["userId"] = filters.userId;
    if (filters.threadId) query["threadId"] = filters.threadId;
    if (filters.provider) query["provider"] = filters.provider;
    if (filters.startDate || filters.endDate) {
      query["createdAt"] = {};
      if (filters.startDate) {
        (query["createdAt"] as Record<string, unknown>)["$gte"] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query["createdAt"] as Record<string, unknown>)["$lte"] = new Date(filters.endDate);
      }
    }
    if (filters.search) {
      query["$text"] = { $search: filters.search };
    }
    return query;
  }

  async findAll(filters: ServerLogFilters): Promise<ServerLog[]> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const query = this.buildQuery(filters);

    return this.serverLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(filters: ServerLogFilters): Promise<number> {
    const query = this.buildQuery(filters);
    return this.serverLogModel.countDocuments(query).exec();
  }

  async aggregateByLevel(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateByService(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $group: { _id: "$serviceName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateByAction(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $match: { action: { $ne: null } } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }
}
