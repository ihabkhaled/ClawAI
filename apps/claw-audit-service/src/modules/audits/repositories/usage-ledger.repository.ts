import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, type FilterQuery } from "mongoose";
import { UsageLedger } from "../schemas/usage-ledger.schema";
import type {
  CreateUsageLedgerInput,
  UsageLedgerFilters,
  ProviderAggregation,
  ModelAggregation,
  CostSummaryResult,
  LatencySummaryResult,
} from "../types/audits.types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@common/constants";

@Injectable()
export class UsageLedgerRepository {
  constructor(
    @InjectModel(UsageLedger.name) private readonly usageLedgerModel: Model<UsageLedger>,
  ) {}

  async create(input: CreateUsageLedgerInput): Promise<UsageLedger> {
    const doc = new this.usageLedgerModel(input);
    return doc.save();
  }

  private buildUsageQuery(filters: UsageLedgerFilters): FilterQuery<UsageLedger> {
    const query: FilterQuery<UsageLedger> = {};
    if (filters.userId) query["userId"] = filters.userId;
    if (filters.resourceType) query["resourceType"] = filters.resourceType;
    if (filters.action) query["action"] = filters.action;
    if (filters.provider) query["metadata.provider"] = filters.provider;
    if (filters.model) query["metadata.model"] = filters.model;
    if (filters.startDate || filters.endDate) {
      query["createdAt"] = {};
      if (filters.startDate) {
        (query["createdAt"] as Record<string, unknown>)["$gte"] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query["createdAt"] as Record<string, unknown>)["$lte"] = new Date(filters.endDate);
      }
    }
    return query;
  }

  async findAll(filters: UsageLedgerFilters): Promise<UsageLedger[]> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const query = this.buildUsageQuery(filters);

    return this.usageLedgerModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(filters: UsageLedgerFilters): Promise<number> {
    const query = this.buildUsageQuery(filters);
    return this.usageLedgerModel.countDocuments(query).exec();
  }

  async aggregateByProvider(): Promise<ProviderAggregation[]> {
    return this.usageLedgerModel.aggregate<ProviderAggregation>([
      {
        $group: {
          _id: "$metadata.provider",
          count: { $sum: 1 },
          totalTokens: { $sum: "$quantity" },
        },
      },
      {
        $project: {
          _id: 0,
          provider: "$_id",
          count: 1,
          totalTokens: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateByModel(): Promise<ModelAggregation[]> {
    return this.usageLedgerModel.aggregate<ModelAggregation>([
      {
        $group: {
          _id: "$metadata.model",
          count: { $sum: 1 },
          totalTokens: { $sum: "$quantity" },
        },
      },
      {
        $project: {
          _id: 0,
          model: "$_id",
          count: 1,
          totalTokens: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateCostSummary(): Promise<CostSummaryResult> {
    const result = await this.usageLedgerModel.aggregate<CostSummaryResult>([
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$quantity" },
          totalRequests: { $sum: 1 },
          estimatedCost: {
            $sum: {
              $multiply: ["$quantity", 0.000002],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalTokens: 1,
          totalRequests: 1,
          estimatedCost: 1,
        },
      },
    ]);
    return result[0] ?? { totalTokens: 0, totalRequests: 0, estimatedCost: 0 };
  }

  async aggregateLatencySummary(): Promise<LatencySummaryResult> {
    const result = await this.usageLedgerModel.aggregate<LatencySummaryResult>([
      { $match: { "metadata.latencyMs": { $exists: true } } },
      { $sort: { "metadata.latencyMs": 1 } },
      {
        $group: {
          _id: null,
          avgLatency: { $avg: "$metadata.latencyMs" },
          latencies: { $push: "$metadata.latencyMs" },
          totalRequests: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          avgLatency: { $round: ["$avgLatency", 2] },
          totalRequests: 1,
          p50Latency: {
            $arrayElemAt: [
              "$latencies",
              { $floor: { $multiply: [{ $size: "$latencies" }, 0.5] } },
            ],
          },
          p95Latency: {
            $arrayElemAt: [
              "$latencies",
              { $floor: { $multiply: [{ $size: "$latencies" }, 0.95] } },
            ],
          },
        },
      },
    ]);
    return result[0] ?? { avgLatency: 0, p50Latency: 0, p95Latency: 0, totalRequests: 0 };
  }
}
