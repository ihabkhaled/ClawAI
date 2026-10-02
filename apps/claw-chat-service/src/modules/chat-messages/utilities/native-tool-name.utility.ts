import {
  NATIVE_TOOL_NAME_ILLEGAL_PATTERN,
  NATIVE_TOOL_NAME_MAX_LENGTH,
  NATIVE_TOOL_NAME_REPLACEMENT,
} from '../constants/provider-tool.constants';

// Maps a Runtime tool name onto the strictest provider charset
// (`^[a-zA-Z0-9_-]{1,64}$`). This is intentionally lossy — `workspace.files`
// and a hypothetical `workspace_files` both become `workspace_files` — which
// is why admission (runtime-v2.dto) refuses such a pair up front, and why
// translateToolCatalog still asserts uniqueness as a backstop. Lives apart
// from the translation utility so the DTO can use it without a cycle.
export function sanitizeNativeToolName(toolName: string): string {
  return toolName
    .replaceAll(NATIVE_TOOL_NAME_ILLEGAL_PATTERN, NATIVE_TOOL_NAME_REPLACEMENT)
    .slice(0, NATIVE_TOOL_NAME_MAX_LENGTH);
}
