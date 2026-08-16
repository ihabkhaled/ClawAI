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
