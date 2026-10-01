import type { RoutineRunSource } from '../../../common/enums/routine-run-source.enum';
import type { ScheduledCommand, TerminalCommand } from '../../../generated/prisma';

/**
 * Remembers which command an idempotency key produced. Abstract so the trigger
 * service is tested against memory rather than Redis.
 */
export abstract class RemoteTriggerIdempotencyStore {
  /** Atomically claims an unused key. False when someone already holds it. */
  abstract claim(key: string): Promise<boolean>;
  /** The command id a settled key produced, the pending marker, or null. */
  abstract read(key: string): Promise<string | null>;
  abstract settle(key: string, commandId: string): Promise<void>;
  abstract release(key: string): Promise<void>;
}

/** The scheduled-command operations a trigger needs, owner-scoped. */
export abstract class RemoteJobRunner {
  abstract findOwned(userId: string, id: string): Promise<ScheduledCommand | null>;
  /** Fires now; null when the device has no connected session. */
  abstract fire(
    scheduled: ScheduledCommand,
    source: RoutineRunSource,
  ): Promise<TerminalCommand | null>;
  abstract findCommand(id: string): Promise<TerminalCommand | null>;
}
