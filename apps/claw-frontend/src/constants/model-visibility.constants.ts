import { STATUS_STYLES } from '@/constants/status-badge.constants';
import { ConnectorModelKind } from '@/enums/connector-model-kind.enum';
import { ModelVisibilityGate, ModelVisibilityGateStatus } from '@/enums/model-visibility.enum';

export const MODEL_KIND_LABEL_KEYS: Record<ConnectorModelKind, string> = {
  [ConnectorModelKind.CHAT]: 'adminConnectors.visibility.kindChat',
  [ConnectorModelKind.TOOL]: 'adminConnectors.visibility.kindTool',
  [ConnectorModelKind.EMBEDDING]: 'adminConnectors.visibility.kindEmbedding',
  [ConnectorModelKind.AUDIO]: 'adminConnectors.visibility.kindAudio',
  [ConnectorModelKind.RERANKER]: 'adminConnectors.visibility.kindReranker',
};

// The audited StatusBadge palette: chat reads as active, everything else as a warning.
export const MODEL_KIND_OFFERED_BADGE_CLASS = STATUS_STYLES['active'] ?? '';
export const MODEL_KIND_NOT_OFFERED_BADGE_CLASS = STATUS_STYLES['pending'] ?? '';

export const MODEL_VISIBILITY_GATE_LABEL_KEYS: Record<ModelVisibilityGate, string> = {
  [ModelVisibilityGate.EXISTS]: 'adminConnectors.visibility.gateExists',
  [ModelVisibilityGate.CONNECTOR_ENABLED]: 'adminConnectors.visibility.gateConnectorEnabled',
  [ModelVisibilityGate.LIFECYCLE_ACTIVE]: 'adminConnectors.visibility.gateLifecycleActive',
  [ModelVisibilityGate.EXPOSED]: 'adminConnectors.visibility.gateExposed',
  [ModelVisibilityGate.KIND_CHAT]: 'adminConnectors.visibility.gateKindChat',
  [ModelVisibilityGate.IN_ROUTING_REGISTRY]: 'adminConnectors.visibility.gateInRoutingRegistry',
  [ModelVisibilityGate.NOT_ROUTER_ONLY]: 'adminConnectors.visibility.gateNotRouterOnly',
  [ModelVisibilityGate.PRICED]: 'adminConnectors.visibility.gatePriced',
};

export const MODEL_VISIBILITY_STATUS_LABEL_KEYS: Record<ModelVisibilityGateStatus, string> = {
  [ModelVisibilityGateStatus.PASS]: 'adminConnectors.visibility.statusPass',
  [ModelVisibilityGateStatus.FAIL]: 'adminConnectors.visibility.statusFail',
  [ModelVisibilityGateStatus.UNKNOWN]: 'adminConnectors.visibility.statusUnknown',
  [ModelVisibilityGateStatus.SKIPPED]: 'adminConnectors.visibility.statusSkipped',
};

export const MODEL_VISIBILITY_STATUS_BADGE_CLASSES: Record<ModelVisibilityGateStatus, string> = {
  [ModelVisibilityGateStatus.PASS]: STATUS_STYLES['active'] ?? '',
  [ModelVisibilityGateStatus.FAIL]: STATUS_STYLES['error'] ?? '',
  [ModelVisibilityGateStatus.UNKNOWN]: STATUS_STYLES['pending'] ?? '',
  [ModelVisibilityGateStatus.SKIPPED]: STATUS_STYLES['inactive'] ?? '',
};
