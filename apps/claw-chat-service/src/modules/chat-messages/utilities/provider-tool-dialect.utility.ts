// Resolves which native tool-calling dialect a provider speaks, and expresses
// a requested tool-choice mode in that dialect.
//
// Pure: no I/O, no logger, no vendor SDK. Every decision here is table-driven
// so adding a provider is a constants change, not a code change.

import { ProviderToolDialect, ToolChoiceMode } from '../../../common/enums';
import type { ResolvedToolChoice } from '../types/provider-tool.types';
import {
  ANTHROPIC_TOOL_CHOICE_ANY,
  ANTHROPIC_TOOL_CHOICE_AUTO,
  ANTHROPIC_TOOL_CHOICE_NONE,
  OPENAI_TOOL_CHOICE_AUTO,
  OPENAI_TOOL_CHOICE_NONE,
  OPENAI_TOOL_CHOICE_REQUIRED,
  PROVIDER_TOOL_DIALECT_BY_PROVIDER,
} from '../constants/provider-tool.constants';

// Returns the dialect for a provider, or NONE when the provider has no native
// tool surface (or the feature is switched off). NONE is the signal to fall
// back to the prompt-JSON compatibility lane — it is never an error.
export function resolveToolDialect(provider: string, enabled: boolean): ProviderToolDialect {
  if (!enabled) {
    return ProviderToolDialect.NONE;
  }
  return PROVIDER_TOOL_DIALECT_BY_PROVIDER[provider] ?? ProviderToolDialect.NONE;
}

export function supportsNativeTools(dialect: ProviderToolDialect): boolean {
  return dialect !== ProviderToolDialect.NONE;
}

// Native Ollama `/api/chat` has no forced-tool-choice field at all. Rather than
// pretend otherwise, REQUIRED degrades to "omit the field" and reports
// `degraded: true` so the caller can tell the user the anti-drift correction
// was prompt-only on this lane.
export function resolveToolChoicePayload(
  mode: ToolChoiceMode,
  dialect: ProviderToolDialect,
): ResolvedToolChoice {
  if (dialect === ProviderToolDialect.OPENAI) {
    return { openAi: openAiToolChoiceFor(mode), degraded: false, requested: mode };
  }
  if (dialect === ProviderToolDialect.ANTHROPIC) {
    return {
      anthropic: { type: anthropicToolChoiceFor(mode) },
      degraded: false,
      requested: mode,
    };
  }
  return { degraded: mode === ToolChoiceMode.REQUIRED, requested: mode };
}

function openAiToolChoiceFor(mode: ToolChoiceMode): string {
  if (mode === ToolChoiceMode.REQUIRED) return OPENAI_TOOL_CHOICE_REQUIRED;
  if (mode === ToolChoiceMode.NONE) return OPENAI_TOOL_CHOICE_NONE;
  return OPENAI_TOOL_CHOICE_AUTO;
}

function anthropicToolChoiceFor(mode: ToolChoiceMode): string {
  if (mode === ToolChoiceMode.REQUIRED) return ANTHROPIC_TOOL_CHOICE_ANY;
  if (mode === ToolChoiceMode.NONE) return ANTHROPIC_TOOL_CHOICE_NONE;
  return ANTHROPIC_TOOL_CHOICE_AUTO;
}
