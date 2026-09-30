import { type Prisma, ThreadOrigin } from '../../../generated/prisma';
import { CODING_AGENT_THREAD_ORIGINS } from '../constants/thread-origin.constants';

/** True for any origin the coding agent (extension or CLI) creates. */
export function isCodingAgentOrigin(origin: ThreadOrigin): boolean {
  return CODING_AGENT_THREAD_ORIGINS.includes(origin);
}

/**
 * The `origin` condition a thread listing is narrowed by.
 *
 * Omitted means WEB, so the web chat list never shows agent runs. CODING_AGENT
 * means the whole coding agent family, because that is the extension's shared
 * history; CODING_AGENT_CLI alone narrows to threads the CLI started.
 */
export function threadOriginCondition(
  origin: ThreadOrigin | undefined,
): Prisma.EnumThreadOriginFilter<'ChatThread'> | ThreadOrigin {
  if (origin === undefined) return ThreadOrigin.WEB;
  return origin === ThreadOrigin.CODING_AGENT ? { in: [...CODING_AGENT_THREAD_ORIGINS] } : origin;
}
