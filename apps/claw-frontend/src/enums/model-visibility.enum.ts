// The checks the chat picker applies to a connector model, in order. Mirrors
// connector-service `ModelVisibilityGateName` (GET /connectors/model-visibility).
export enum ModelVisibilityGate {
  EXISTS = 'EXISTS',
  CONNECTOR_ENABLED = 'CONNECTOR_ENABLED',
  LIFECYCLE_ACTIVE = 'LIFECYCLE_ACTIVE',
  EXPOSED = 'EXPOSED',
  KIND_CHAT = 'KIND_CHAT',
  IN_ROUTING_REGISTRY = 'IN_ROUTING_REGISTRY',
  NOT_ROUTER_ONLY = 'NOT_ROUTER_ONLY',
  PRICED = 'PRICED',
}

// UNKNOWN: routing-service did not answer. SKIPPED: nothing to judge (no row).
export enum ModelVisibilityGateStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  UNKNOWN = 'UNKNOWN',
  SKIPPED = 'SKIPPED',
}

// What a sync changed on a model (connector_model_events).
export enum ConnectorModelEventType {
  KIND_CHANGED = 'KIND_CHANGED',
  UNEXPOSED_BY_SYNC = 'UNEXPOSED_BY_SYNC',
}
