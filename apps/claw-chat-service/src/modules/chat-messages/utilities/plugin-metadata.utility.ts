import type { LlmResponse } from '../types/execution.types';

/**
 * The assistant message's plugin parts: `pluginCalls` (what ran, shown above the answer
 * as a timeline) and `pluginNotices` (why a mentioned plugin did not run). Empty when
 * the turn mentioned no plugin, so ordinary messages gain no keys.
 */
export function buildPluginMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
  return {
    ...(llmResponse.pluginCalls === undefined || llmResponse.pluginCalls.length === 0
      ? {}
      : { pluginCalls: llmResponse.pluginCalls }),
    ...(llmResponse.pluginNotices === undefined || llmResponse.pluginNotices.length === 0
      ? {}
      : { pluginNotices: llmResponse.pluginNotices }),
  };
}
