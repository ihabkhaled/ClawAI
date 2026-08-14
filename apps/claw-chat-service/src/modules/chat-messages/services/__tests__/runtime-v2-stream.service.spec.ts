import { firstValueFrom, type Observable, toArray } from 'rxjs';

import { RUNTIME_V2_POLL_FAILURE_TOLERANCE } from '../../constants/runtime-v2-stream.constants';
import { RuntimeV2StreamService } from '../runtime-v2-stream.service';

// A poll that fails is not a run that died. The read loop polls Redis every
// 350ms; any error from that poll used to escape the generator and end the SSE
// stream, which the client renders as RUNTIME_STATE_UNAVAILABLE. Observed
// repeatedly while the agent ran `git commit`, whose pre-commit hook takes
// minutes: one poll reported `Connection is closed` while Redis answered PING
// and the service had not restarted, and the run's completed work was lost.
// Polls re-read from the same cursor, so retrying is free and loses no events.

interface StubPage {
  readonly events: readonly { readonly sequence: number }[];
  readonly terminal: boolean;
}

function serviceWith(readEvents: jest.Mock): RuntimeV2StreamService {
  const store = {
    resolveBinding: jest
      .fn()
      .mockResolvedValue({ runId: 'run:0123456789abcdef', generation: 'gen:0123456789abcdef' }),
    readEvents,
  };
  return new RuntimeV2StreamService(store as never, { streamEvents: jest.fn() } as never);
}

function events(service: RuntimeV2StreamService): Promise<unknown[]> {
  const stream = service.selectEvents('owner:0123456789ab', 'thread:0123456789ab', {
    protocol: 'v2',
    runId: 'run:0123456789abcdef',
    generation: 'gen:0123456789abcdef',
    after: '0',
  } as never);
  return firstValueFrom((stream as never as Observable<unknown>).pipe(toArray()));
}

describe('RuntimeV2StreamService poll resilience', () => {
  it('survives a transient poll failure and delivers the events that follow', async () => {
    const terminal: StubPage = { events: [{ sequence: 1 }], terminal: true };
    const readEvents = jest
      .fn()
      .mockRejectedValueOnce(new Error('Connection is closed.'))
      .mockResolvedValueOnce(terminal);

    const delivered = await events(serviceWith(readEvents));

    expect(readEvents).toHaveBeenCalledTimes(2);
    expect(delivered).toHaveLength(1);
  });

  it('does not lose or duplicate an event when a poll is retried', async () => {
    // The retry re-reads from the SAME cursor, so the caller must see each
    // sequence exactly once.
    const readEvents = jest
      .fn()
      .mockResolvedValueOnce({ events: [{ sequence: 1 }], terminal: false })
      .mockRejectedValueOnce(new Error('Connection is closed.'))
      .mockResolvedValueOnce({ events: [{ sequence: 2 }], terminal: true });

    const delivered = (await events(serviceWith(readEvents))) as { sequence: number }[];

    expect(delivered.map((event) => event.sequence)).toEqual([1, 2]);
  });

  it('gives up once failures are sustained rather than retrying forever', async () => {
    // Tolerance guards a blip, not an outage: a Redis that never comes back
    // must still end the stream instead of spinning.
    const readEvents = jest.fn().mockRejectedValue(new Error('Connection is closed.'));

    await expect(events(serviceWith(readEvents))).rejects.toThrow('Connection is closed.');
    expect(readEvents).toHaveBeenCalledTimes(RUNTIME_V2_POLL_FAILURE_TOLERANCE + 1);
  });

  it('resets the failure count after a poll succeeds', async () => {
    // Otherwise scattered blips across a long run would eventually add up to
    // the tolerance and kill a stream that was healthy throughout.
    const readEvents = jest.fn();
    for (let index = 0; index < RUNTIME_V2_POLL_FAILURE_TOLERANCE; index += 1) {
      readEvents.mockRejectedValueOnce(new Error('Connection is closed.'));
    }
    readEvents.mockResolvedValueOnce({ events: [], terminal: false });
    for (let index = 0; index < RUNTIME_V2_POLL_FAILURE_TOLERANCE; index += 1) {
      readEvents.mockRejectedValueOnce(new Error('Connection is closed.'));
    }
    readEvents.mockResolvedValueOnce({ events: [{ sequence: 9 }], terminal: true });

    const delivered = (await events(serviceWith(readEvents))) as { sequence: number }[];

    expect(delivered.map((event) => event.sequence)).toEqual([9]);
  });
});
