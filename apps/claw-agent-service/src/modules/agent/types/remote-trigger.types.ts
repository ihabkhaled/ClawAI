import type { TerminalCommand } from '../../../generated/prisma';

/** The command a trigger produced, and whether it was replayed from an earlier request. */
export type RemoteTriggerResult = {
  command: TerminalCommand;
  replayed: boolean;
};
