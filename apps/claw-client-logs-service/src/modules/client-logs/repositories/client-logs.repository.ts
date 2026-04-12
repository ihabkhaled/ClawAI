import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, Model, type SortOrder } from "mongoose";
import { ClientLog } from "../schemas/client-log.schema";
import type {
  AggregationResult,
  ClientLogFilters,
  CreateClientLogInput,
  DistinctValuesResult,
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

    if (filters.level) {
      query["level"] = { $regex: `^${filters.level}$`, $options: "i" };
    }
    if (filters.component) {
      query["component"] = filters.component;
    }
    if (filters.action) {
      query["action"] = filters.action;
    }
    if (filters.route) {
      query["route"] = filters.route;
    }
    if (filters.userId) {
      query["userId"] = filters.userId;
    }
    if (filters.sessionId) {
      query["sessionId"] = filters.sessionId;
    }
    if (filters.threadId) {
      query["threadId"] = filters.threadId;
    }
    if (filters.connectorId) {
      query["connectorId"] = filters.connectorId;
    }
    if (filters.requestId) {
      query["requestId"] = filters.requestId;
    }
    if (filters.errorCode) {
      query["errorCode"] = filters.errorCode;
    }
    if (filters.startDate ?? filters.endDate) {
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
    if (filters.messageContains) {
      query["message"] = { $regex: filters.messageContains, $options: "i" };
    }

    return query;
  }

  async findAll(filters: ClientLogFilters): Promise<ClientLog[]> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const query = this.buildQuery(filters);
    const sortField = filters.sortBy ?? "createdAt";
    const sortDir: SortOrder = filters.sortOrder === "asc" ? 1 : -1;

    return this.clientLogModel
      .find(query)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(filters: ClientLogFilters): Promise<number> {
    const query = this.buildQuery(filters);
    return this.clientLogModel.countDocuments(query).exec();
  }

  async getDistinctValues(field: string, filters: ClientLogFilters): Promise<DistinctValuesResult> {
    const query = this.buildQuery(filters);
    const values = (await this.clientLogModel.distinct(field, query).exec()) as string[];
    return { field, values: values.slice(0, 200) };
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

  async aggregateByRoute(): Promise<AggregationResult[]> {
    return this.clientLogModel.aggregate<AggregationResult>([
      { $match: { route: { $ne: null } } },
      { $group: { _id: "$route", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
  }

  async getErrorCount(filters: ClientLogFilters): Promise<number> {
    const query = this.buildQuery(filters);
    query["level"] = { $regex: "^error$", $options: "i" };
    return this.clientLogModel.countDocuments(query).exec();
  }
}
