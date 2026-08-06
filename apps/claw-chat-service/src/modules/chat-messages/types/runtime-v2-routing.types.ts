import { type RoutingMode } from '../../../generated/prisma';

/**
 * How one Runtime V2 start should be routed. A manual selection carries the
 * pinned provider and model; an automatic selection carries neither, so the
 * routing engine is free to choose.
 */
export interface RuntimeV2RoutingSelection {
  readonly routingMode: RoutingMode;
  readonly provider?: string;
  readonly model?: string;
  readonly allowedModels?: string[];
}
