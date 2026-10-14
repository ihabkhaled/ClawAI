import type {
  PluginInvokeRequest,
  PluginInvokeResult,
  PluginResolveRequest,
  PluginResolveResult,
} from '../types/plugin-tools.types';

/**
 * What chat-service needs from plugin-service. An abstract class so it is also
 * the Nest injection token; tests hand the loop a fake.
 *
 * Contract (docs/implementation/plugins-and-mcp-design.md section 7), both calls
 * carry the service credential and the owner's user id in the body, and
 * plugin-service scopes every lookup by that id:
 *
 *   POST /api/v1/internal/plugins/resolve  { userId, surface, refs[] }
 *     -> { tools[], systemBlock, limits{maxRounds,maxCallsPerTurn,timeoutMs}, notices[] }
 *   POST /api/v1/internal/plugins/invoke   { userId, installId, toolName, args, callId, surface,
 *                                     conversationId?, messageId?, tainted }
 *     -> { status, content, truncated, untrusted: true, durationMs, errorCode, ... }
 *   (surface goes out lower case; callId is minted per attempt by the adapter)
 */
export abstract class PluginInvokePort {
  /** Throws when plugin-service cannot answer; the loop turns that into a notice. */
  abstract resolve(request: PluginResolveRequest): Promise<PluginResolveResult>;
  /** Never throws for a tool failure: that is a status. Throws only when the service is unreachable. */
  abstract invoke(request: PluginInvokeRequest): Promise<PluginInvokeResult>;
}
