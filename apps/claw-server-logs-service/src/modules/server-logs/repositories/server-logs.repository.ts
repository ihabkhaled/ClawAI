import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type FilterQuery, Model, type SortOrder } from 'mongoose';
import { ServerLog } from '../schemas/server-log.schema';
import type {
  AggregationResult,
  CreateServerLogInput,
  DistinctValuesResult,
  ServerLogFilters,
  TimeSeriesBucket,
} from '../types/server-logs.types';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';

@Injectable()
export class ServerLogsRepository {
  constructor(@InjectModel(ServerLog.name) private readonly serverLogModel: Model<ServerLog>) {}

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

    if (filters.level) {
      query['level'] = { $regex: `^${filters.level}$`, $options: 'i' };
    }
    if (filters.serviceName) {
      query['serviceName'] = filters.serviceName;
    }
    if (filters.module) {
      query['module'] = filters.module;
    }
    if (filters.controller) {
      query['controller'] = filters.controller;
    }
    if (filters.service) {
      query['service'] = filters.service;
    }
    if (filters.manager) {
      query['manager'] = filters.manager;
    }
    if (filters.action) {
      query['action'] = filters.action;
    }
    if (filters.method) {
      query['method'] = filters.method;
    }
    if (filters.route) {
      query['route'] = { $regex: filters.route, $options: 'i' };
    }
    if (filters.statusCode !== undefined) {
      query['statusCode'] = filters.statusCode;
    }
    if (filters.statusCodeMin !== undefined || filters.statusCodeMax !== undefined) {
      if (!query['statusCode']) {
        query['statusCode'] = {};
      }
      if (filters.statusCodeMin !== undefined) {
        (query['statusCode'] as Record<string, unknown>)['$gte'] = filters.statusCodeMin;
      }
      if (filters.statusCodeMax !== undefined) {
        (query['statusCode'] as Record<string, unknown>)['$lte'] = filters.statusCodeMax;
      }
    }
    if (filters.requestId) {
      query['requestId'] = filters.requestId;
    }
    if (filters.traceId) {
      query['traceId'] = filters.traceId;
    }
    if (filters.userId) {
      query['userId'] = filters.userId;
    }
    if (filters.threadId) {
      query['threadId'] = filters.threadId;
    }
    if (filters.messageId) {
      query['messageId'] = filters.messageId;
    }
    if (filters.connectorId) {
      query['connectorId'] = filters.connectorId;
    }
    if (filters.provider) {
      query['provider'] = filters.provider;
    }
    if (filters.modelName) {
      query['modelName'] = filters.modelName;
    }
    if (filters.errorCode) {
      query['errorCode'] = filters.errorCode;
    }
    if (filters.latencyMin !== undefined || filters.latencyMax !== undefined) {
      query['latencyMs'] = {};
      if (filters.latencyMin !== undefined) {
        (query['latencyMs'] as Record<string, unknown>)['$gte'] = filters.latencyMin;
      }
      if (filters.latencyMax !== undefined) {
        (query['latencyMs'] as Record<string, unknown>)['$lte'] = filters.latencyMax;
      }
    }
    if (filters.startDate ?? filters.endDate) {
      query['createdAt'] = {};
      if (filters.startDate) {
        (query['createdAt'] as Record<string, unknown>)['$gte'] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (query['createdAt'] as Record<string, unknown>)['$lte'] = new Date(filters.endDate);
      }
    }
    if (filters.search) {
      query['$text'] = { $search: filters.search };
    }
    if (filters.messageContains) {
      query['message'] = { $regex: filters.messageContains, $options: 'i' };
    }

    return query;
  }

  async findAll(filters: ServerLogFilters): Promise<ServerLog[]> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const query = this.buildQuery(filters);
    const sortField = filters.sortBy ?? 'createdAt';
    const sortDir: SortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    return this.serverLogModel
      .find(query)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countAll(filters: ServerLogFilters): Promise<number> {
    const query = this.buildQuery(filters);
    return this.serverLogModel.countDocuments(query).exec();
  }

  async getDistinctValues(field: string, filters: ServerLogFilters): Promise<DistinctValuesResult> {
    const query = this.buildQuery(filters);
    const values = (await this.serverLogModel.distinct(field, query).exec()) as string[];
    return { field, values: values.slice(0, 200) };
  }

  async getTimeSeries(
    filters: ServerLogFilters,
    intervalMinutes: number,
  ): Promise<TimeSeriesBucket[]> {
    const query = this.buildQuery(filters);
    const intervalMs = intervalMinutes * 60 * 1000;

    return this.serverLogModel.aggregate<TimeSeriesBucket>([
      { $match: query },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: '$createdAt' },
                { $mod: [{ $toLong: '$createdAt' }, intervalMs] },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          timestamp: { $dateToString: { format: '%Y-%m-%dT%H:%M:%SZ', date: '$_id' } },
          count: 1,
        },
      },
    ]);
  }

  async aggregateByLevel(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateByService(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $group: { _id: '$serviceName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateByAction(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $match: { action: { $ne: null } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);
  }

  async aggregateByMethod(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $match: { method: { $ne: null } } },
      { $group: { _id: '$method', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateByStatusCode(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $match: { statusCode: { $ne: null } } },
      { $group: { _id: { $toString: '$statusCode' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  }

  async aggregateByModule(): Promise<AggregationResult[]> {
    return this.serverLogModel.aggregate<AggregationResult>([
      { $match: { module: { $ne: null } } },
      { $group: { _id: '$module', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);
  }

  async getErrorCount(filters: ServerLogFilters): Promise<number> {
    const query = this.buildQuery(filters);
    query['level'] = 'error';
    return this.serverLogModel.countDocuments(query).exec();
  }

  async getAvgLatency(filters: ServerLogFilters): Promise<number> {
    const query = this.buildQuery(filters);
    query['latencyMs'] = { ...((query['latencyMs'] as Record<string, unknown>) ?? {}), $ne: null };
    const result = await this.serverLogModel.aggregate<{ avgLatency: number }>([
      { $match: query },
      { $group: { _id: null, avgLatency: { $avg: '$latencyMs' } } },
    ]);
    return Math.round(result[0]?.avgLatency ?? 0);
  }
}
