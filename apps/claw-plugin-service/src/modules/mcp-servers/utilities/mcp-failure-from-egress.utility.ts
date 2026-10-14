import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import { EgressError } from '../../egress/errors/egress.error';
import { McpFailure } from '../errors/mcp-failure.error';

/**
 * Folds an egress refusal into the three things a caller may tell a user. A blocked address, a
 * failed lookup and a refused connection all read as UNREACHABLE, so the outcome never says which
 * internal host or port exists. Redirects and malformed requests read as REJECTED.
 */
export function mcpFailureFromEgress(error: unknown): McpFailure {
  if (error instanceof McpFailure) return error;
  if (!(error instanceof EgressError)) return new McpFailure(McpFailureKind.UNREACHABLE, 'unknown');
  const detail = `${error.code}${error.detail === '' ? '' : `: ${error.detail}`}`;
  switch (error.code) {
    case EgressErrorCode.TIMEOUT:
      return new McpFailure(McpFailureKind.TIMEOUT, detail);
    case EgressErrorCode.ABORTED:
      return new McpFailure(McpFailureKind.ABORTED, detail);
    case EgressErrorCode.REDIRECT_BLOCKED:
    case EgressErrorCode.TOO_MANY_REDIRECTS:
    case EgressErrorCode.INVALID_REQUEST:
      return new McpFailure(McpFailureKind.REJECTED, detail);
    default:
      return new McpFailure(McpFailureKind.UNREACHABLE, detail);
  }
}
