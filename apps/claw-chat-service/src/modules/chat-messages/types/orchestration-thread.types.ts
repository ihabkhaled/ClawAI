import { type RoutingMode } from '../../../generated/prisma';

/** What an orchestration surface (a lab, Compare, Consensus, Escalation) asks of its thread. */
export interface OrchestrationThreadRequest {
  /** An existing thread to run inside. Omitted: a new one is created. */
  threadId?: string | undefined;
  title: string;
  routingMode: RoutingMode;
  /** Context packs attached to the NEW thread; the context gateway reads them like chat does. */
  contextPackIds?: string[] | undefined;
}
