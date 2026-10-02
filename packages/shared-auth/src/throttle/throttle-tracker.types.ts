import type { ExecutionContext } from '@nestjs/common';

/** One throttler window, exactly as `@nestjs/throttler` takes it. */
export interface ThrottleWindow {
  ttl: number;
  limit: number;
}

/**
 * Structurally a `ThrottlerModuleOptions` object. Declared here so this
 * package does not take a runtime dependency on `@nestjs/throttler`; every
 * service that calls `ThrottlerModule.forRoot` already has it.
 */
export interface ClawThrottlerOptions {
  throttlers: ThrottleWindow[];
  getTracker: (request: Record<string, unknown>) => Promise<string>;
  skipIf: (context: ExecutionContext) => boolean;
}

/** The slice of an HTTP request the tracker reads. */
export interface ThrottleRequestView {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socketAddress?: string;
}

/**
 * Where a request is counted. `viaProxy` is true when the address came from
 * the X-Real-IP a trusted proxy wrote, false when it is the socket peer.
 */
export interface ClientAddress {
  address: string;
  viaProxy: boolean;
}

/** The resolved addresses of the trusted proxy name, and when they expire. */
export interface TrustedProxyCache {
  addresses: ReadonlySet<string>;
  resolvedAt: number;
}
