export type RuntimeProtocolVersion = '2.0' | '1.0';
export type RuntimeProtocolTransport = 'sse';

export interface RuntimeProtocolFeatures {
  readonly capabilityManifest: boolean;
  readonly orderedRunEvents: boolean;
  readonly toolExecution: boolean;
}

export interface RuntimeProtocolLimits {
  readonly maxActiveRuns: number;
  readonly maxEventBytes: number;
}

export interface RuntimeProtocolDescriptor {
  readonly features: RuntimeProtocolFeatures;
  readonly limits: RuntimeProtocolLimits;
  readonly preferred: RuntimeProtocolVersion;
  readonly transports: readonly RuntimeProtocolTransport[];
  readonly versions: readonly RuntimeProtocolVersion[];
}
