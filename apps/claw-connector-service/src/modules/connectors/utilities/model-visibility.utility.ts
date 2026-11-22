import type {
  ModelVisibilityGate,
  ModelVisibilityGateName,
  ModelVisibilityRow,
  RoutingModelVisibility,
} from '../types/connectors.types';
import { ROUTING_UNKNOWN_DETAIL } from '../constants/model-visibility.constants';
import { isPickerKind } from './picker-kind.utility';

function pass(gate: ModelVisibilityGateName, detail: string): ModelVisibilityGate {
  return { gate, status: 'PASS', detail };
}

function fail(gate: ModelVisibilityGateName, detail: string): ModelVisibilityGate {
  return { gate, status: 'FAIL', detail };
}

function skipped(gate: ModelVisibilityGateName, detail: string): ModelVisibilityGate {
  return { gate, status: 'SKIPPED', detail };
}

function unknown(gate: ModelVisibilityGateName): ModelVisibilityGate {
  return { gate, status: 'UNKNOWN', detail: ROUTING_UNKNOWN_DETAIL };
}

function routerOnlyGate(inRegistry: boolean, isRouterOnly: boolean | null): ModelVisibilityGate {
  if (!inRegistry) return skipped('NOT_ROUTER_ONLY', 'no registry row');
  return isRouterOnly === true
    ? fail('NOT_ROUTER_ONLY', 'marked router-only: used by the router itself, never offered')
    : pass('NOT_ROUTER_ONLY', 'user-selectable');
}

/** The provider key routing-service knows a row by: a custom provider's key, else the enum. */
export function visibilityProviderKey(row: ModelVisibilityRow): string {
  return row.connector.providerDefinition?.key ?? row.provider;
}

/** Gates connector-service owns: the `GET /connectors/available-models` filter. */
export function connectorVisibilityGates(row: ModelVisibilityRow | null): ModelVisibilityGate[] {
  if (row === null) {
    const reason = 'no connector row: sync the connector, or check the provider and model key';
    return [
      fail('EXISTS', 'not found in connector_models on any connector'),
      skipped('CONNECTOR_ENABLED', reason),
      skipped('LIFECYCLE_ACTIVE', reason),
      skipped('EXPOSED', reason),
      skipped('KIND_CHAT', reason),
    ];
  }
  const definition = row.connector.providerDefinition;
  const connectorOn = row.connector.isEnabled && (definition === null || definition.isActive);
  const kindOk = isPickerKind(row.kind, row.modelKey);
  return [
    pass('EXISTS', `connector "${row.connector.name}"`),
    connectorOn
      ? pass('CONNECTOR_ENABLED', 'connector enabled')
      : fail(
          'CONNECTOR_ENABLED',
          row.connector.isEnabled
            ? 'the custom provider definition is inactive'
            : 'the connector is disabled',
        ),
    row.lifecycle === 'ACTIVE'
      ? pass('LIFECYCLE_ACTIVE', 'ACTIVE')
      : fail('LIFECYCLE_ACTIVE', `lifecycle is ${row.lifecycle}; only ACTIVE models are offered`),
    row.exposure === 'EXPOSED'
      ? pass('EXPOSED', 'EXPOSED')
      : fail('EXPOSED', 'UNEXPOSED: an admin has not exposed it, or a sync unexposed it'),
    kindOk
      ? pass('KIND_CHAT', row.kind)
      : fail(
          'KIND_CHAT',
          `kind is ${row.kind}, not CHAT: not offered in chat${row.kindReason === null ? '' : ` (${row.kindReason})`}`,
        ),
  ];
}

/** Gates routing-service owns: registry row, router-only flag, price. */
export function routingVisibilityGates(
  routing: RoutingModelVisibility | null,
): ModelVisibilityGate[] {
  if (routing === null) {
    return [unknown('IN_ROUTING_REGISTRY'), unknown('NOT_ROUTER_ONLY'), unknown('PRICED')];
  }
  const inRegistry = routing.inRegistry && routing.lifecycle !== 'REMOVED';
  return [
    inRegistry
      ? pass('IN_ROUTING_REGISTRY', `router_model_registry lifecycle ${routing.lifecycle ?? '?'}`)
      : fail(
          'IN_ROUTING_REGISTRY',
          routing.inRegistry
            ? 'the router_model_registry row is REMOVED'
            : 'not in router_model_registry: routing sync skips it, so it has no price row or admin pricing entry',
        ),
    routerOnlyGate(inRegistry, routing.isRouterOnly),
    routing.costClass === null
      ? fail('PRICED', 'unpriced: a metered model with no price is refused (blocked, never free)')
      : pass('PRICED', `cost class ${routing.costClass}`),
  ];
}

/** How far a row gets through the connector gates, for picking the most visible match. */
export function connectorGateScore(row: ModelVisibilityRow): number {
  return connectorVisibilityGates(row).filter((gate) => gate.status === 'PASS').length;
}

export function summarizeVisibility(gates: readonly ModelVisibilityGate[]): {
  visibleInPicker: boolean;
  firstFailingGate: ModelVisibilityGateName | null;
} {
  return {
    visibleInPicker: gates.every((gate) => gate.status === 'PASS'),
    firstFailingGate: gates.find((gate) => gate.status === 'FAIL')?.gate ?? null,
  };
}
