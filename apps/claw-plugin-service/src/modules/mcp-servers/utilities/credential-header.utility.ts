import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { isAllowedAuthHeader } from '../../catalog/utilities/is-allowed-auth-header.utility';
import {
  MCP_BEARER_HEADER,
  MCP_BEARER_PREFIX,
  MCP_DEFAULT_API_KEY_HEADER,
  MCP_RESERVED_REQUEST_HEADERS,
} from '../constants/mcp.constants';

/**
 * The header a credential travels in, or null when it may not. A bearer token always uses
 * Authorization. An API key uses the requested allow-listed header (default X-API-Key). A header
 * the client sets itself (Content-Type, Accept, Mcp-Session-Id ...) is never available.
 */
export function resolveCredentialHeaderName(kind: AuthKind, requested?: string): string | null {
  if (kind === AuthKind.NONE) return null;
  const name =
    kind === AuthKind.BEARER_TOKEN ? MCP_BEARER_HEADER : (requested ?? MCP_DEFAULT_API_KEY_HEADER);
  if (
    kind === AuthKind.BEARER_TOKEN &&
    requested !== undefined &&
    requested !== MCP_BEARER_HEADER
  ) {
    return null;
  }
  if (!isAllowedAuthHeader(name)) return null;
  return MCP_RESERVED_REQUEST_HEADERS.includes(name.toLowerCase()) ? null : name;
}

/** The request headers carrying a credential. Built per call and never stored, logged or returned. */
export function buildCredentialHeaders(
  kind: AuthKind,
  headerName: string,
  value: string,
): Record<string, string> {
  if (kind === AuthKind.API_KEY) return { [headerName]: value };
  return kind === AuthKind.BEARER_TOKEN
    ? { [MCP_BEARER_HEADER]: `${MCP_BEARER_PREFIX}${value}` }
    : {};
}
