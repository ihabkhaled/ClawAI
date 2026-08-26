import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { isWebhookSupported } from '../../webhooks/utilities/webhook-signature-verifiers.utility';
import { WorkspaceEventRepository } from '../repositories/workspace-event.repository';
import type { SyncedObjectLike } from '../types/workspace-event.types';
import { canonicalEventForSyncedObject } from '../utilities/synced-object-event-mapping.utility';

/**
 * Phase 04 (scoped slice) — the "consistency path" from the pack's
 * architecture diagram: `delta/history/change sync → reconcile normalized
 * objects/events`. Bridges the existing periodic sync pipeline
 * (WorkspaceSyncManager) into the canonical WorkspaceEvent fabric added in
 * Phase 03, for the 8 providers that have no webhook fast path
 * (Confluence, Google Drive, Gmail, Google Calendar, Outlook Calendar,
 * ClickUp, SharePoint, OneDrive per the Phase 01 matrix).
 *
 * Deliberately excludes the 6 webhook-covered providers
 * (`isWebhookSupported`) — those already get canonical events from
 * WebhookIngestConsumer, and running this bridge for them too would create
 * duplicate WorkspaceEvents for the same underlying change, which the pack
 * explicitly warns against ("Do not duplicate WorkspaceEvents after
 * reconciliation").
 */
@Injectable()
export class WorkspaceSyncEventBridgeService {
  private readonly logger = new Logger(WorkspaceSyncEventBridgeService.name);

  constructor(private readonly repo: WorkspaceEventRepository) {}

  async bridge(
    provider: WorkspaceProvider,
    connectorId: string,
    objects: SyncedObjectLike[],
  ): Promise<number> {
    if (isWebhookSupported(provider)) {
      return 0;
    }

    let created = 0;
    for (const obj of objects) {
      if (await this.bridgeOne(provider, connectorId, obj)) {
        created += 1;
      }
    }
    return created;
  }

  private async bridgeOne(
    provider: WorkspaceProvider,
    connectorId: string,
    obj: SyncedObjectLike,
  ): Promise<boolean> {
    const mapping = canonicalEventForSyncedObject(obj);
    if (mapping === null) return false;

    // Idempotency key includes the object's own externalUpdatedAt (when
    // known) so a re-sync of an *unchanged* object on the next poll tick
    // does not re-emit a duplicate event — only a real change (a new
    // externalUpdatedAt) produces a new key.
    const changeMarker =
      obj.externalUpdatedAt?.toISOString() ?? obj.externalCreatedAt?.toISOString() ?? 'unknown';
    const idempotencyKey = `sync:${connectorId}:${obj.externalId}:${changeMarker}`;
    const payload = { externalId: obj.externalId, type: obj.type, title: obj.title };

    try {
      const { created } = await this.repo.createIfNew({
        connectorId,
        provider,
        eventType: mapping.eventType,
        resourceType: mapping.resourceType,
        resourceExternalId: obj.externalId,
        occurredAt: obj.externalUpdatedAt ?? obj.externalCreatedAt ?? null,
        correlationId: connectorId,
        idempotencyKey,
        payload,
        payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
        sourceDeliveryId: null,
      });
      return created;
    } catch (error) {
      this.logger.warn(
        `sync-event-bridge failed for connector ${connectorId} object ${obj.externalId} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }
}
