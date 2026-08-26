import { WorkspaceCanonicalEventType } from '../../../common/enums/workspace-canonical-event-type.enum';
import { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';
import type { CanonicalEventMapping, SyncedObjectLike } from '../types/workspace-event.types';

/**
 * Maps a synced object to a canonical event for the sync→event
 * reconciliation bridge (see WorkspaceSyncEventBridgeService). Only used
 * for providers with no webhook fast path.
 *
 * `externalCreatedAt === externalUpdatedAt` (or updatedAt missing) is
 * treated as "just created upstream" — a heuristic using data every
 * adapter already reports, not a guess: providers that don't distinguish
 * the two report the same value for both, and providers that do only
 * diverge once the object is actually edited.
 *
 * WorkspaceObjectType.MEETING is deliberately unmapped: MEETING_STARTED/
 * MEETING_ENDED are time-relative lifecycle events, not sync-detectable
 * create/update events — sync only tells us "this calendar entry exists or
 * changed," never whether it has actually started or ended. Mapping it here
 * would produce misleading events (e.g. syncing a future meeting should
 * not emit MEETING_STARTED). Needs a scheduled trigger, not a sync hook —
 * left for a later pass.
 */
export function canonicalEventForSyncedObject(obj: SyncedObjectLike): CanonicalEventMapping | null {
  const isNew =
    obj.externalUpdatedAt === undefined ||
    obj.externalCreatedAt === undefined ||
    obj.externalCreatedAt.getTime() === obj.externalUpdatedAt.getTime();
  const occurredAt = obj.externalUpdatedAt ?? obj.externalCreatedAt ?? null;

  switch (obj.type) {
    case WorkspaceObjectType.DOCUMENT:
      return {
        eventType: isNew
          ? WorkspaceCanonicalEventType.DOCUMENT_CREATED
          : WorkspaceCanonicalEventType.DOCUMENT_UPDATED,
        resourceType: WorkspaceObjectType.DOCUMENT,
        resourceExternalId: obj.externalId,
        occurredAt,
      };
    case WorkspaceObjectType.FILE:
    case WorkspaceObjectType.SPREADSHEET:
      // The canonical vocabulary has no FILE_CREATED — both branches
      // collapse to FILE_UPDATED, matching the pack's given event list.
      return {
        eventType: WorkspaceCanonicalEventType.FILE_UPDATED,
        resourceType: obj.type,
        resourceExternalId: obj.externalId,
        occurredAt,
      };
    case WorkspaceObjectType.EMAIL:
      return {
        eventType: WorkspaceCanonicalEventType.EMAIL_RECEIVED,
        resourceType: WorkspaceObjectType.EMAIL,
        resourceExternalId: obj.externalId,
        occurredAt,
      };
    case WorkspaceObjectType.TICKET:
      // Only reached for TICKET-typed objects from a sync-only provider
      // (ClickUp) — Jira is webhook-covered and already emits
      // TICKET_CREATED/TICKET_STATUS_CHANGED via WebhookIngestConsumer, so
      // the bridge never runs for it (see isWebhookSupported gate in
      // WorkspaceSyncEventBridgeService). TASK_* keeps the two sources'
      // vocabulary distinct even though both use WorkspaceObjectType.TICKET.
      return {
        eventType: isNew
          ? WorkspaceCanonicalEventType.TASK_CREATED
          : WorkspaceCanonicalEventType.TASK_UPDATED,
        resourceType: WorkspaceObjectType.TICKET,
        resourceExternalId: obj.externalId,
        occurredAt,
      };
    case WorkspaceObjectType.COMMENT:
      if (!isNew) return null; // matches the webhook path's created-only semantics
      return {
        eventType: WorkspaceCanonicalEventType.COMMENT_CREATED,
        resourceType: WorkspaceObjectType.COMMENT,
        resourceExternalId: obj.externalId,
        occurredAt,
      };
    default:
      return null;
  }
}
