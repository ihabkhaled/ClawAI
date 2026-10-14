import { jsonRpcResponseSchema } from '../schemas/json-rpc.schema';
import { type JsonRpcResponse } from '../types/mcp-client.types';
import { parseSseEvents } from './parse-sse-events.utility';

function fromJsonText(text: string, id: number): JsonRpcResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  // A server may answer a batch-shaped array; the response we want is the one with our id.
  for (const candidate of Array.isArray(parsed) ? parsed : [parsed]) {
    const checked = jsonRpcResponseSchema.safeParse(candidate);
    if (checked.success && checked.data.id === id) return checked.data;
  }
  return null;
}

/**
 * The JSON-RPC response carrying `id`, from either body shape a streamable-HTTP server may use:
 * a single application/json document or a text/event-stream. Notifications and responses to
 * other requests in the same stream are skipped. Null when the response is not (yet) there.
 */
export function extractJsonRpcResponse(
  contentType: string,
  body: string,
  id: number,
): JsonRpcResponse | null {
  if (contentType.toLowerCase().includes('text/event-stream')) {
    for (const data of parseSseEvents(body)) {
      const found = fromJsonText(data, id);
      if (found !== null) return found;
    }
    return null;
  }
  return fromJsonText(body, id);
}
