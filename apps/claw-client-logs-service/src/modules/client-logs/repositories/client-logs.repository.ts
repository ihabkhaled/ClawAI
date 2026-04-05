import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, type FilterQuery } from "mongoose";
import { ClientLog } from "../schemas/client-log.schema";
import type {
  ClientLogFilters,
  CreateClientLogInput,
  AggregationResult,
} from "../types/client-logs.types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@common/constants";

@Injectable()
export class ClientLogsRepository {
  constructor(
    @InjectModel(ClientLog.name) private readonly clientLogModel: Model<ClientLog>,
  ) {}

  async create(input: CreateClientLogInput): Promise<ClientLog> {
    const doc = new this.clientLogModel(input);
    return doc.save();
  }

  private buildQuery(filters: ClientLogFilters): FilterQuery<ClientLog> {
    const query: FilterQuery<ClientLog> = {};
    if (filters.level) query["level"] = filters.level;
    if (filters.component) query["component"] = filters.component;
    if (filters.action) query["action"] = filters.action;
    if (filters.route) query["route"] = filters.route;
    if (filters.userId) query["userId"] = filters.userId;
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

  async findAll(filters: ClientLogFilters): Promise<ClientLog[]> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const query = this.buildQuery(filters);

    return this.clientLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(filters: ClientLogFilters): Promise<number> {
    const query = this.buildQuery(filters);
    return this.clientLogModel.countDocuments(query).exec();
  }

  async aggregateByLevel(): Promise<AggregationResult[]> {
    return this.clientLogModel.aggregate<AggregationResult>([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateByComponent(): Promise<AggregationResult[]> {
    return this.clientLogModel.aggregate<AggregationResult>([
      { $match: { component: { $ne: null } } },
      { $group: { _id: "$component", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
  }

  async aggregateByAction(): Promise<AggregationResult[]> {
    return this.clientLogModel.aggregate<AggregationResult>([
      { $match: { action: { $ne: null } } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
  }
}
