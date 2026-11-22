import { EventEmitter } from 'node:events';

import { HttpStatus } from '@nestjs/common';

import { LiveStatusCode } from '../../../../common/enums/live-status-code.enum';
import { LiveStreamEventType } from '../../../../common/enums/live-stream-event-type.enum';
import { LiveSessionState } from '../../../../generated/prisma';
import type { LiveEventEnvelope, LiveEventListener } from '../../types/live-event-bus.types';
import { LiveSseManager } from '../live-sse.manager';

function frame(seq: number, overrides: Partial<LiveEventEnvelope> = {}): LiveEventEnvelope {
  return {
    id: `run1:${String(seq)}`,
    seq,
    type: LiveStreamEventType.CAPTION,
    runId: 'run1',
    startAt: seq,
    data: {},
    ...overrides,
  };
}

function setup(view: Record<string, unknown> | null = {}) {
  const listeners: LiveEventListener[] = [];
  const unsubscribe = vi.fn();
  const bus = {
    subscribe: vi.fn(async (_runId: string, listener: LiveEventListener) => {
      listeners.push(listener);
      return unsubscribe;
    }),
    replay: vi.fn().mockResolvedValue([]),
  };
  const baseView = {
    sessionId: 's1',
    userId: 'u1',
    runId: 'run1',
    language: 'en',
    state: LiveSessionState.ACTIVE,
  };
  const sessions = {
    findOwned: vi.fn().mockResolvedValue(view === null ? null : { ...baseView, ...view }),
  };
  const written: string[] = [];
  const response = {
    writeHead: vi.fn(),
    write: vi.fn((chunk: string) => written.push(chunk)),
    end: vi.fn(),
  };
  const request = new EventEmitter();
  const manager = new LiveSseManager(bus as never, sessions as never);
  const emit = (event: LiveEventEnvelope) => {
    for (const listener of listeners) listener(event);
  };
  return { manager, bus, sessions, response, request, written, emit, unsubscribe };
}

const ids = (written: string[]) =>
  written.filter((w) => w.startsWith('id: ')).map((w) => w.split('\n')[0]);

describe('LiveSseManager', () => {
  it('answers 404 for a session the caller does not own, before writing anything', async () => {
    const { manager, response } = setup(null);
    await expect(
      manager.open('s1', 'intruder', undefined, {} as never, response as never),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    expect(response.writeHead).not.toHaveBeenCalled();
  });

  it('replays after Last-Event-ID, then streams live frames without duplicates', async () => {
    const { manager, bus, response, request, written, emit } = setup();
    bus.replay.mockResolvedValue([frame(6), frame(7)]);
    const connection = await manager.open(
      's1',
      'u1',
      'run1:5',
      request as never,
      response as never,
    );
    expect(bus.replay).toHaveBeenCalledWith('run1', 5);
    emit(frame(7));
    emit(frame(8));
    expect(ids(written)).toEqual(['id: run1:6', 'id: run1:7', 'id: run1:8']);
    expect(response.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ 'Content-Type': 'text/event-stream; charset=utf-8' }),
    );
    connection.close();
  });

  it('ignores a Last-Event-ID of another run and replays from the start', async () => {
    const { manager, bus, response, request } = setup();
    const connection = await manager.open(
      's1',
      'u1',
      'run-old:99',
      request as never,
      response as never,
    );
    expect(bus.replay).toHaveBeenCalledWith('run1', 0);
    connection.close();
  });

  it('filters translations by language and blocks AI events once credits are required', async () => {
    const { manager, response, request, written, emit } = setup({ language: 'fr' });
    const connection = await manager.open(
      's1',
      'u1',
      undefined,
      request as never,
      response as never,
    );
    emit(frame(1, { type: LiveStreamEventType.CAPTION_TRANSLATION, language: 'de' }));
    emit(frame(2, { type: LiveStreamEventType.CAPTION_TRANSLATION, language: 'fr' }));
    emit(
      frame(3, {
        type: LiveStreamEventType.STATUS,
        status: LiveStatusCode.CREDITS_REQUIRED,
        data: { sessionId: 's1', sessionState: LiveSessionState.CREDITS_REQUIRED },
      }),
    );
    emit(frame(4));
    emit(frame(5, { type: LiveStreamEventType.STATUS, status: LiveStatusCode.DELAYED }));
    expect(ids(written)).toEqual(['id: run1:2', 'id: run1:3', 'id: run1:5']);
    connection.close();
  });

  it('ends the stream when its session is detached', async () => {
    const { manager, response, request, emit, unsubscribe } = setup();
    const connection = await manager.open(
      's1',
      'u1',
      undefined,
      request as never,
      response as never,
    );
    emit(
      frame(1, {
        type: LiveStreamEventType.STATUS,
        status: LiveStatusCode.COMPLETED,
        data: { sessionId: 's1', sessionState: LiveSessionState.DETACHED },
      }),
    );
    expect(connection.isClosed).toBe(true);
    expect(response.end).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('closes immediately for an already-detached session and on client disconnect', async () => {
    const detached = setup({ state: LiveSessionState.DETACHED });
    const closed = await detached.manager.open(
      's1',
      'u1',
      undefined,
      detached.request as never,
      detached.response as never,
    );
    expect(closed.isClosed).toBe(true);
    expect(detached.bus.subscribe).not.toHaveBeenCalled();

    const live = setup();
    const connection = await live.manager.open(
      's1',
      'u1',
      undefined,
      live.request as never,
      live.response as never,
    );
    live.request.emit('close');
    expect(connection.isClosed).toBe(true);
  });

  it('refresh follows a run switch and closes when the session is gone', async () => {
    const { manager, sessions, bus, response, request, unsubscribe } = setup();
    const connection = await manager.open(
      's1',
      'u1',
      undefined,
      request as never,
      response as never,
    );
    sessions.findOwned.mockResolvedValueOnce({
      sessionId: 's1',
      userId: 'u1',
      runId: 'run2',
      language: 'en',
      state: LiveSessionState.ACTIVE,
    });
    await connection.refresh();
    expect(unsubscribe).toHaveBeenCalled();
    expect(bus.subscribe).toHaveBeenLastCalledWith('run2', expect.any(Function));
    sessions.findOwned.mockResolvedValueOnce(null);
    await connection.refresh();
    expect(connection.isClosed).toBe(true);
  });

  it('survives a failed refresh read', async () => {
    const { manager, sessions, response, request } = setup();
    const connection = await manager.open(
      's1',
      'u1',
      undefined,
      request as never,
      response as never,
    );
    sessions.findOwned.mockRejectedValueOnce(new Error('db'));
    await connection.refresh();
    expect(connection.isClosed).toBe(false);
    connection.close();
  });
});
