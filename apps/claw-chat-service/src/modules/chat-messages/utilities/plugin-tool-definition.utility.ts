import {
  PLUGIN_RISK_CLASS,
  PLUGIN_TOOL_OPERATION,
  PLUGIN_TOOL_VERSION,
} from '../constants/plugin-tools.constants';
import { RUNTIME_V2_SCHEMA_VERSION } from '../constants/runtime-v2.constants';
import { type ToolDefinitionDto, toolDefinitionSchema } from '../dto/runtime-v2.dto';
import type { PluginRef, PluginToolCatalog, ResolvedPluginTool } from '../types/plugin-tools.types';

/** Only the tools the user mentioned: a plugin ref allows all of its tools, a tool ref just that one. */
export function toolsAllowedByRefs(
  tools: readonly ResolvedPluginTool[],
  refs: readonly PluginRef[],
): ResolvedPluginTool[] {
  return tools.filter((tool) =>
    refs.some(
      (ref) =>
        ref.installId === tool.installId &&
        (ref.toolName === undefined || ref.toolName === tool.toolName),
    ),
  );
}

/**
 * Plugin tools as Runtime-shaped definitions, so the existing native tool lane
 * (translation, byte budget, provider dialects, call normalisation) carries them
 * unchanged. One operation and one target (the install) each: the model's
 * `operation` and `targetId` have exactly one legal value.
 *
 * A tool description and schema come from a plugin author, so each definition is held
 * to the same schema every Runtime tool is. One that fails (oversized or malformed
 * schema, bad name) is left out; the rest still work.
 */
export function toToolCatalog(tools: readonly ResolvedPluginTool[]): PluginToolCatalog {
  const accepted: ResolvedPluginTool[] = [];
  const definitions: ToolDefinitionDto[] = [];
  for (const tool of tools) {
    const parsed = toolDefinitionSchema.safeParse({
      schemaVersion: RUNTIME_V2_SCHEMA_VERSION,
      name: tool.nativeName,
      version: PLUGIN_TOOL_VERSION,
      description:
        [tool.description, tool.title, tool.toolName].find((text) => text.trim().length > 0) ??
        tool.nativeName,
      operations: [PLUGIN_TOOL_OPERATION],
      riskClasses: [PLUGIN_RISK_CLASS[tool.riskLevel]],
      targetIds: [tool.installId],
      inputSchema: tool.inputSchema,
    });
    if (!parsed.success) continue;
    accepted.push(tool);
    definitions.push(parsed.data);
  }
  return { accepted, definitions };
}
