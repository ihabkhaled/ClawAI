/** How a call to a remote MCP server failed, as far as the caller needs to tell. */
export enum McpFailureKind {
  UNREACHABLE = 'UNREACHABLE',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT',
  ABORTED = 'ABORTED',
  OVERSIZED = 'OVERSIZED',
}
