import { type McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';

/** A call to a remote MCP server did not succeed. `detail` is for the audit log, never for a user. */
export class McpFailure extends Error {
  constructor(
    readonly kind: McpFailureKind,
    readonly detail: string = '',
  ) {
    super(kind);
    this.name = 'McpFailure';
  }
}
