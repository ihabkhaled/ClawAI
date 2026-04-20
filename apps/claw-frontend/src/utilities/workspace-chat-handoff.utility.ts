import type { WorkspaceConnector } from '@/types';

/**
 * Builds a connector-scoped system prompt so a fresh chat thread knows
 * the user has pre-loaded a specific connector as context. The chat
 * backend already appends its normal memory + context packs — this just
 * tells the model which workspace is in scope.
 */
export function buildConnectorSystemPrompt(connector: WorkspaceConnector): string {
  return [
    `The user has linked their ${connector.provider} workspace via Claw (connector "${connector.name}").`,
    `When the user asks about their ${connector.provider.toLowerCase()} data, answer based on the synced objects available for this connector.`,
    `If you need more context, say what kind of object you'd like them to surface.`,
  ].join(' ');
}

/**
 * Object-level variant. Used by object detail pages in a later phase.
 */
export function buildObjectSystemPrompt(input: {
  connectorName: string;
  provider: string;
  objectTitle: string;
  objectType: string;
}): string {
  return [
    `The user has attached a ${input.provider} ${input.objectType.toLowerCase()} ("${input.objectTitle}") from their "${input.connectorName}" workspace as the primary context for this thread.`,
    `Default to answering questions about that specific object unless the user broadens the scope.`,
  ].join(' ');
}
