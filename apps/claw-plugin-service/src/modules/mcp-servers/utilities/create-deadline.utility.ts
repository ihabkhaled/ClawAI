import { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import { McpFailure } from '../errors/mcp-failure.error';
import { type Deadline } from '../types/deadline.types';

/** One time budget shared by every step of a call (handshake, notification, the call itself). */
export function createDeadline(totalMs: number, now: () => number = Date.now): Deadline {
  const end = now() + totalMs;
  return {
    remaining: (): number => {
      const left = end - now();
      if (left <= 0) throw new McpFailure(McpFailureKind.TIMEOUT, 'call budget used up');
      return left;
    },
  };
}
