import type { RuntimeProtocolDescriptor } from '../types/runtime-protocol.types';

const RUNTIME_PROTOCOL_FEATURES = Object.freeze({
  capabilityManifest: true,
  orderedRunEvents: true,
  toolExecution: false,
});

const RUNTIME_PROTOCOL_LIMITS = Object.freeze({
  maxActiveRuns: 8,
  maxEventBytes: 1_048_576,
});

export const RUNTIME_PROTOCOL_DESCRIPTOR: RuntimeProtocolDescriptor = Object.freeze({
  features: RUNTIME_PROTOCOL_FEATURES,
  limits: RUNTIME_PROTOCOL_LIMITS,
  preferred: '2.0',
  transports: Object.freeze(['sse'] as const),
  versions: Object.freeze(['2.0', '1.0'] as const),
});
