import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, type PipelineStage } from 'mongoose';
import { FailureCountBy } from '@common/enums';
import { AuditLog } from '../schemas/audit-log.schema';
import { UsageLedger } from '../schemas/usage-ledger.schema';
import {
  FAILURE_SEVERITIES,
  OBSERVABILITY_MAX_TIME_MS,
  OBSERVABILITY_SIGNALS_TOP_N,
  OBSERVABILITY_TOP_N,
  REGEX_ESCAPE_PATTERN,
  SYNC_NOISE_ACTION_PATTERN,
  TRACING_PERCENTILES,
  TRACING_SIGNAL_ACTION_PATTERN,
  TRACING_SORT_FIELDS,
  UNKNOWN_LABEL,
  USAGE_MESSAGE_COMPLETED_ACTION,
} from '../constants/observability.constants';
import type {
  CountDoc,
  FailuresFacetDoc,
  FailuresQuery,
  FailuresWindow,
  ProviderExpression,
  TracingFacetDoc,
  TracingQuery,
} from '../types/observability.types';

/**
 * Bounded aggregates behind the Observability page.
 *
 * Every pipeline starts with a `$match` on a half-open `createdAt` window the
 * service has already capped (at most 30 days), so it rides the
 * `{ severity, createdAt }` / `{ createdAt }` indexes, and carries a server-side
 * `maxTimeMS`. Only metadata fields are read: provider, model, context,
 * action, severity, counts and latency. No prompt, response, key or header
 * ever leaves the store through here.
 */
@Injectable()
export class ObservabilityRepository {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
    @InjectModel(UsageLedger.name) private readonly usageLedgerModel: Model<UsageLedger>,
  ) {}

  async failures(
    window: FailuresWindow,
    query: FailuresQuery,
  ): Promise<FailuresFacetDoc | undefined> {
    const syncFilter: PipelineStage.Match = {
      $match: query.includeSync ? {} : { action: { $not: { $regex: SYNC_NOISE_ACTION_PATTERN } } },
    };
    const group: PipelineStage.Group = {
      $group: {
        _id: { action: '$action', entityType: '$entityType', severity: '$severity' },
        count: { $sum: 1 },
        lastSeenAt: { $max: '$createdAt' },
      },
    };
    const direction = query.order === 'asc' ? 1 : -1;
    const sort: PipelineStage.Sort = {
      $sort:
        query.sort === 'count'
          ? { count: direction, '_id.action': 1 }
          : { lastSeenAt: direction, '_id.action': 1 },
    };
    const searchStages: PipelineStage[] =
      query.search === null
        ? []
        : [this.searchMatch(['_id.action', '_id.entityType'], query.search)];
    const topBy = (field: string, key: unknown): PipelineStage.FacetPipelineStage[] => [
      syncFilter,
      { $match: { [field]: { $type: 'string' } } },
      { $group: { _id: key, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: OBSERVABILITY_TOP_N },
    ];

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: window.from, $lt: window.to },
          severity: { $in: [...FAILURE_SEVERITIES] },
        },
      },
      {
        $facet: {
          groups: [
            syncFilter,
            group,
            ...searchStages,
            sort,
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
          ] as PipelineStage.FacetPipelineStage[],
          groupsTotal: [
            syncFilter,
            group,
            ...searchStages,
            { $count: 'total' },
          ] as PipelineStage.FacetPipelineStage[],
          totals: [
            {
              $group: {
                _id: { $regexMatch: { input: '$action', regex: SYNC_NOISE_ACTION_PATTERN } },
                count: { $sum: 1 },
              },
            },
          ],
          bySource: [
            syncFilter,
            { $group: { _id: { $ifNull: ['$entityType', 'unknown'] }, count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: OBSERVABILITY_TOP_N },
          ],
          providers: topBy('details.provider', this.providerKeyExpression('$details.provider')),
          models: topBy('details.model', '$details.model'),
        },
      },
    ];
    const docs = await this.auditLogModel
      .aggregate<FailuresFacetDoc>(pipeline)
      .option({ maxTimeMS: OBSERVABILITY_MAX_TIME_MS, allowDiskUse: true });
    return docs[0];
  }

  /** Latency, token and provider-vs-estimate figures per provider / model / context. */
  async tracing(window: FailuresWindow, query: TracingQuery): Promise<TracingFacetDoc | undefined> {
    const match = this.tracingMatch(window, query);
    const direction = query.order === 'asc' ? 1 : -1;
    const sortField = TRACING_SORT_FIELDS[query.sort] ?? 'requests';
    const pipeline: PipelineStage[] = [
      match,
      {
        $group: {
          _id: this.tracingKey(query),
          provider: { $first: '$metadata.provider' },
          model: { $first: '$metadata.model' },
          requests: { $sum: 1 },
          measured: { $sum: { $cond: [{ $isNumber: '$metadata.latencyMs' }, 1, 0] } },
          avgLatency: { $avg: '$metadata.latencyMs' },
          percentiles: {
            $percentile: {
              input: '$metadata.latencyMs',
              p: [...TRACING_PERCENTILES],
              method: 'approximate',
            },
          },
          totalTokens: { $sum: '$quantity' },
          estimatedRequests: { $sum: { $cond: [{ $eq: ['$estimated', true] }, 1, 0] } },
        },
      },
      { $addFields: { p95: { $arrayElemAt: ['$percentiles', 1] } } },
      {
        $facet: {
          rows: [
            { $sort: { [sortField]: direction, _id: 1 } },
            { $skip: (query.page - 1) * query.limit },
            { $limit: query.limit },
          ],
          total: [{ $count: 'total' }],
        },
      },
    ];
    const docs = await this.usageLedgerModel
      .aggregate<TracingFacetDoc>(pipeline)
      .option({ maxTimeMS: OBSERVABILITY_MAX_TIME_MS, allowDiskUse: true });
    return docs[0];
  }

  /** Whole-window figures, not just the visible page. */
  async tracingOverall(
    window: FailuresWindow,
    query: TracingQuery,
  ): Promise<TracingFacetDoc['overall'][number] | undefined> {
    const docs = await this.usageLedgerModel
      .aggregate<TracingFacetDoc['overall'][number]>([
        this.tracingMatch(window, query),
        {
          $group: {
            _id: null,
            requests: { $sum: 1 },
            measured: { $sum: { $cond: [{ $isNumber: '$metadata.latencyMs' }, 1, 0] } },
            percentiles: {
              $percentile: {
                input: '$metadata.latencyMs',
                p: [...TRACING_PERCENTILES],
                method: 'approximate',
              },
            },
          },
        },
      ])
      .option({ maxTimeMS: OBSERVABILITY_MAX_TIME_MS });
    return docs[0];
  }

  /** HIGH/CRITICAL events per provider (normalised key) or per model name, SYNC noise excluded. */
  async failureCounts(window: FailuresWindow, by: FailureCountBy): Promise<CountDoc[]> {
    const field = by === FailureCountBy.PROVIDER ? 'details.provider' : 'details.model';
    return this.auditLogModel
      .aggregate<CountDoc>([
        {
          $match: {
            createdAt: { $gte: window.from, $lt: window.to },
            severity: { $in: [...FAILURE_SEVERITIES] },
            action: { $not: { $regex: SYNC_NOISE_ACTION_PATTERN } },
            [field]: { $type: 'string' },
          },
        },
        {
          $group: {
            _id:
              by === FailureCountBy.PROVIDER
                ? this.providerKeyExpression('$details.provider')
                : '$details.model',
            count: { $sum: 1 },
          },
        },
        { $limit: 500 },
      ])
      .option({ maxTimeMS: OBSERVABILITY_MAX_TIME_MS });
  }

  /** Retry / fallback / breaker / rate-limit events in the window, by action. */
  async signals(window: FailuresWindow): Promise<CountDoc[]> {
    return this.auditLogModel
      .aggregate<CountDoc>([
        {
          $match: {
            createdAt: { $gte: window.from, $lt: window.to },
            action: { $regex: TRACING_SIGNAL_ACTION_PATTERN, $options: 'i' },
          },
        },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: OBSERVABILITY_SIGNALS_TOP_N },
      ])
      .option({ maxTimeMS: OBSERVABILITY_MAX_TIME_MS });
  }

  private tracingMatch(window: FailuresWindow, query: TracingQuery): PipelineStage.Match {
    const stage: Record<string, unknown> = {
      action: USAGE_MESSAGE_COMPLETED_ACTION,
      createdAt: { $gte: window.from, $lt: window.to },
    };
    if (query.search !== null) {
      const regex = { $regex: this.escape(query.search), $options: 'i' };
      stage['$or'] = [
        { 'metadata.provider': regex },
        { 'metadata.model': regex },
        { context: regex },
      ];
    }
    return { $match: stage };
  }

  private tracingKey(query: TracingQuery): unknown {
    switch (query.dimension) {
      case 'provider':
        return this.providerKeyExpression('$metadata.provider');
      case 'model':
        return {
          $concat: [
            this.providerKeyExpression('$metadata.provider'),
            '/',
            { $ifNull: ['$metadata.model', UNKNOWN_LABEL] },
          ],
        };
      case 'context':
        return { $ifNull: ['$context', UNKNOWN_LABEL] };
    }
  }

  /** Upper-cases and folds `-`, space and `.` to `_`, matching `normalizeProviderKey` for real provider ids. */
  private providerKeyExpression(path: string): ProviderExpression {
    const fold = (input: unknown, find: string) => ({
      $replaceAll: { input, find, replacement: '_' },
    });
    return fold(fold(fold({ $toUpper: { $ifNull: [path, UNKNOWN_LABEL] } }, '-'), ' '), '.');
  }

  private searchMatch(fields: string[], search: string): PipelineStage.Match {
    const regex = { $regex: this.escape(search), $options: 'i' };
    return { $match: { $or: fields.map((field) => ({ [field]: regex })) } };
  }

  private escape(text: string): string {
    return text.replace(REGEX_ESCAPE_PATTERN, '\\$&');
  }
}
