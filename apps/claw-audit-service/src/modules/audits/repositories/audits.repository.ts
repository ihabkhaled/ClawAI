import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type FilterQuery, Model } from "mongoose";
import { AuditLog } from "../schemas/audit-log.schema";
import type {
  AggregationResult,
  AuditLogFilters,
  CreateAuditLogInput,
} from "../types/audits.types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@common/constants";

@Injectable()
export class AuditsRepository {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
  ) {}

  async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const doc = new this.auditLogModel(input);
    return doc.save();
  }

  private buildAuditQuery(filters: AuditLogFilters): FilterQuery<AuditLog> {
    const query: FilterQuery<AuditLog> = {};
    if (filters.userId) query["userId"] = filters.userId;
    if (filters.action) query["action"] = filters.action;
    if (filters.entityType) query["entityType"] = filters.entityType;
    if (filters.severity) query["severity"] = filters.severity;
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
      query["$or"] = [
        { action: { $regex: filters.search, $options: "i" } },
        { entityType: { $regex: filters.search, $options: "i" } },
        { entityId: { $regex: filters.search, $options: "i" } },
        { userId: { $regex: filters.search, $options: "i" } },
      ];
    }
    return query;
  }

  async findAll(filters: AuditLogFilters): Promise<AuditLog[]> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const query = this.buildAuditQuery(filters);

    return this.auditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(filters: AuditLogFilters): Promise<number> {
    const query = this.buildAuditQuery(filters);
    return this.auditLogModel.countDocuments(query).exec();
  }

  async aggregateByAction(): Promise<AggregationResult[]> {
    return this.auditLogModel.aggregate<AggregationResult>([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateBySeverity(): Promise<AggregationResult[]> {
    return this.auditLogModel.aggregate<AggregationResult>([
      { $group: { _id: "$severity", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }
}
