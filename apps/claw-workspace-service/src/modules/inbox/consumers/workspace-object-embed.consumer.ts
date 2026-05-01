import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { buildAuthHeader } from '../../../common/utilities/file-service-client.utility';
import { SEARCH_HTTP_TIMEOUT_MS } from '../constants/inbox.constants';

const EMBED_BATCH_SIZE = 25;
const EMBED_MAX_CONTENT_CHARS = 8_000;

type WorkspaceObjectSyncedEvent = {
  connectorId: string;
  provider: string;
  userId: string;
  objectCount: number;
};

/**
 * Stream 30 — listens for per-connector sync-completion events and embeds the
 * objects that were upserted/updated in the last sync window. Posts each one
 * to memory-service `/internal/embeddings/upsert-workspace-object`.
 *
 * Why batched-after-sync rather than per-row publish: per-object events would
 * 10x the RabbitMQ traffic on an initial backfill of a Slack workspace
 * (10k+ messages). Batching after the sync barrier gives the same end state
 * with one consumer call per connector tick.
 */
@Injectable()
export class WorkspaceObjectEmbedConsumer implements OnModuleInit {
  private readonly logger = new Logger(WorkspaceObjectEmbedConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(EventPattern.WORKSPACE_OBJECT_SYNCED, (raw) =>
      this.handle(raw as WorkspaceObjectSyncedEvent),
    );
    this.logger.log(`Subscribed to ${EventPattern.WORKSPACE_OBJECT_SYNCED}`);
  }

  async handle(event: WorkspaceObjectSyncedEvent): Promise<void> {
    if (event.objectCount === 0) {
      return;
    }
    this.logger.debug(
      `handle: connectorId=${event.connectorId} provider=${event.provider} objectCount=${String(event.objectCount)}`,
    );
    const recent = await this.prisma.workspaceObject.findMany({
      where: { connectorId: event.connectorId },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(event.objectCount, EMBED_BATCH_SIZE),
      select: { id: true, type: true, provider: true, title: true, content: true },
    });
    let upserted = 0;
    let skipped = 0;
    for (const obj of recent) {
      const text = `${obj.title}\n${obj.content ?? ''}`.slice(0, EMBED_MAX_CONTENT_CHARS).trim();
      if (text.length < 4) {
        skipped++;
        continue;
      }
      try {
        await this.callMemoryService({
          workspaceObjectId: obj.id,
          userId: event.userId,
          provider: obj.provider,
          objectType: obj.type,
          content: text,
        });
        upserted++;
      } catch (error) {
        skipped++;
        this.logger.warn(
          `handle: skipped objectId=${obj.id} — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    this.logger.log(
      `handle: connectorId=${event.connectorId} embed upserted=${String(upserted)} skipped=${String(skipped)}`,
    );
  }

  private async callMemoryService(input: {
    workspaceObjectId: string;
    userId: string;
    provider: string;
    objectType: string;
    content: string;
  }): Promise<void> {
    const url = `${AppConfig.get().MEMORY_SERVICE_URL}/api/v1/internal/embeddings/upsert-workspace-object`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: buildAuthHeader(),
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(SEARCH_HTTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`memory-service upsert ${String(response.status)}: ${text.slice(0, 200)}`);
    }
  }
}
