import { ThreadOrigin } from '../../../generated/prisma';

/**
 * Every origin that belongs to the coding agent (F094).
 *
 * The VS Code extension creates CODING_AGENT threads and the headless CLI
 * creates CODING_AGENT_CLI threads. They are one history: a thread started in
 * a terminal must appear in, and open from, the extension, and the reverse.
 * Every read that admits the coding agent admits this whole family.
 */
export const CODING_AGENT_THREAD_ORIGINS: readonly ThreadOrigin[] = [
  ThreadOrigin.CODING_AGENT,
  ThreadOrigin.CODING_AGENT_CLI,
];
