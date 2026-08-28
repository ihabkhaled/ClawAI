import type { ChatStreamBusService } from '../../services/chat-stream-bus.service';
import type { StreamEvent } from '../../types/stream.types';

/**
 * A ChatStreamBusService that keeps everything in this process.
 *
 * Stands in for the Redis fan-out so a unit test does not need a server. It
 * delivers synchronously on `publish`, which is what lets the existing stream
 * tests keep asserting that an `emit` is observable on the very next tick.
 *
 * It also assigns `eventId` and `sequence` the way the Lua script does, because
 * those are not decoration: the browser drops a progress stage whose sequence
 * is below one already rendered, so a double that left them undefined would let
 * an ordering regression pass every test.
 */
export function createFakeChatStreamBus(): ChatStreamBusService {
  const replayByThread = new Map<string, StreamEvent[]>();
  const sequenceByThread = new Map<string, number>();
  let handler: ((event: StreamEvent) => void) | null = null;

  const bus = {
    onEvent(next: (event: StreamEvent) => void): void {
      handler = next;
    },
    publish(event: StreamEvent): void {
      const sequence = (sequenceByThread.get(event.threadId) ?? 0) + 1;
      sequenceByThread.set(event.threadId, sequence);
      const stamped: StreamEvent = {
        ...event,
        eventId: `${event.threadId}:${String(sequence)}`,
        sequence,
      };
      replayByThread.set(event.threadId, [...(replayByThread.get(event.threadId) ?? []), stamped]);
      handler?.(stamped);
    },
    replay(threadId: string): Promise<StreamEvent[]> {
      return Promise.resolve([...(replayByThread.get(threadId) ?? [])]);
    },
    resetReplay(threadId: string): Promise<void> {
      // Mirrors the real one: the buffer is cleared, the sequence is not.
      replayByThread.delete(threadId);
      return Promise.resolve();
    },
  };

  return bus as unknown as ChatStreamBusService;
}
