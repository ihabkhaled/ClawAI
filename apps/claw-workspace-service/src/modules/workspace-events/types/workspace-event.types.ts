import type { WorkspaceCanonicalEventType } from '../../../common/enums/workspace-canonical-event-type.enum';
import type { WorkspaceObjectType } from '../../../common/enums/workspace-object-type.enum';

export type CanonicalEventMapping = {
  eventType: WorkspaceCanonicalEventType;
  resourceType: WorkspaceObjectType | null;
  resourceExternalId: string | null;
  occurredAt: Date | null;
};

/** A parsed webhook body — always either an object or an array. */
export type WebhookJsonBody = Record<string, unknown> | unknown[];

/**
 * The subset of `SyncedObject` (workspace/types/workspace.types.ts) the
 * sync→event bridge needs. Declared independently rather than importing
 * SyncedObject directly so this module doesn't reach into workspace/'s
 * internals for a shape this narrow.
 */
export type SyncedObjectLike = {
  externalId: string;
  type: WorkspaceObjectType;
  title: string;
  externalCreatedAt?: Date;
  externalUpdatedAt?: Date;
};
