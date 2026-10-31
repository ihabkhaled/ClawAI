import { HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import {
  PROGRESS_STREAM_HEARTBEAT_MS,
  PROGRESS_STREAM_MAX_LIFETIME_MS,
  PROGRESS_STREAM_MAX_PER_PUBLICATION,
  PROGRESS_STREAM_MAX_PER_USER,
} from '../../constants/generation-progress-stream.constants';
import { toProgressSnapshot } from '../../utilities/generation-progress-snapshot.utility';
import { GenerationProgressStreamService } from '../generation-progress-stream.service';

type Frame = {
  id?: string;
  data: { type: string; progress?: { steps: unknown[]; status: string } };
};

function progress(steps: number, status = 'RUNNING') {
  return {
    jobId: 'job-1',
    status,
    stage: 'DRAFT',
    steps: Array.from({ length: steps }, (_, i) => ({ seq: i + 1 })),
  };
}

function setup(initial = progress(1)) {
  const owner = {
    getOwnedJobId: vi.fn().mockResolvedValue('job-1'),
  };
  const generation = { getProgress: vi.fn().mockResolvedValue(initial) };
  const service = new GenerationProgressStreamService(owner as never, generation as never);
  return { service, owner, generation };
}

async function connect(
  service: GenerationProgressStreamService,
  options: { pub?: string; user?: string; last?: string; backedUp?: () => boolean } = {},
) {
  const observable = await service.open(
    options.pub ?? 'pub-1',
    options.user ?? 'owner-1',
    options.last,
    options.backedUp,
  );
  const frames: Frame[] = [];
  const state = { completed: false };
  const subscription = observable.subscribe({
    next: (event) =>
      frames.push({
        id: event.id,
        data: JSON.parse(String(event.data)) as Frame['data'],
      }),
    complete: () => {
      state.completed = true;
    },
  });
  return { frames, state, subscription };
}

describe('GenerationProgressStreamService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends a full snapshot at once, with a content id', async () => {
    const { service } = setup();
    const { frames, subscription } = await connect(service);
    expect(frames).toHaveLength(1);
    expect(frames[0]?.data.type).toBe('progress');
    expect(frames[0]?.data.progress?.steps).toHaveLength(1);
    expect(frames[0]?.id).toBe(
      toProgressSnapshot({ publicationId: 'pub-1', ...progress(1) } as never).id,
    );
    subscription.unsubscribe();
  });

  it('pushes a new snapshot within one poll of a change and not for an unchanged job', async () => {
    const { service, generation } = setup();
    const { frames, subscription } = await connect(service);
    await vi.advanceTimersByTimeAsync(450);
    expect(frames).toHaveLength(1);
    generation.getProgress.mockResolvedValue(progress(2));
    await vi.advanceTimersByTimeAsync(450);
    expect(frames).toHaveLength(2);
    expect(frames[1]?.data.progress?.steps).toHaveLength(2);
    expect(frames[1]?.id).not.toBe(frames[0]?.id);
    subscription.unsubscribe();
  });

  it('shares one upstream reader between tabs and stops it when the last tab leaves', async () => {
    const { service, generation } = setup();
    const a = await connect(service);
    const b = await connect(service);
    expect(service.watcherCount).toBe(1);
    generation.getProgress.mockClear();
    await vi.advanceTimersByTimeAsync(1000);
    // Two tabs, but about two reads in a second, not four.
    expect(generation.getProgress.mock.calls.length).toBeLessThanOrEqual(3);
    a.subscription.unsubscribe();
    expect(service.watcherCount).toBe(1);
    b.subscription.unsubscribe();
    expect(service.watcherCount).toBe(0);
    generation.getProgress.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(generation.getProgress).not.toHaveBeenCalled();
  });

  it('resumes: Last-Event-ID naming the current snapshot sends nothing twice', async () => {
    const { service } = setup();
    const first = await connect(service);
    const id = first.frames[0]?.id;
    first.subscription.unsubscribe();
    const resumed = await connect(service, { last: id });
    expect(resumed.frames).toHaveLength(0);
    resumed.subscription.unsubscribe();
    const stale = await connect(service, { last: '0000000000000000' });
    expect(stale.frames).toHaveLength(1);
    stale.subscription.unsubscribe();
  });

  it('ends with a terminal event after the final snapshot, then closes', async () => {
    const { service, generation } = setup();
    const { frames, state } = await connect(service);
    generation.getProgress.mockResolvedValue(progress(3, 'FAILED'));
    await vi.advanceTimersByTimeAsync(450);
    expect(frames.map((f) => f.data.type)).toEqual(['progress', 'progress', 'terminal']);
    expect(frames[1]?.data.progress?.status).toBe('FAILED');
    expect(state.completed).toBe(true);
    expect(service.watcherCount).toBe(0);
  });

  it('sends snapshot and terminal at once when the job is already terminal', async () => {
    const { service, generation } = setup(progress(4, 'COMPLETED'));
    const { frames, state } = await connect(service);
    expect(frames.map((f) => f.data.type)).toEqual(['progress', 'terminal']);
    expect(state.completed).toBe(true);
    expect(service.watcherCount).toBe(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(generation.getProgress).toHaveBeenCalledTimes(1);
  });

  it('a terminal job reconnect with its own id gets only the terminal event', async () => {
    const { service } = setup(progress(4, 'COMPLETED'));
    const first = await connect(service);
    const resumed = await connect(service, { last: first.frames[0]?.id });
    expect(resumed.frames.map((f) => f.data.type)).toEqual(['terminal']);
  });

  it('answers 404 for a stranger before any stream exists and reads nothing upstream', async () => {
    const { service, owner, generation } = setup();
    owner.getOwnedJobId.mockRejectedValue(new NotFoundException('Publication not found'));
    await expect(service.open('pub-1', 'stranger', undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(generation.getProgress).not.toHaveBeenCalled();
    expect(owner.getOwnedJobId).toHaveBeenCalledWith('pub-1', 'stranger');
  });

  it('answers 404 when the upstream job is gone', async () => {
    const { service, generation } = setup();
    generation.getProgress.mockRejectedValue(new NotFoundException('x'));
    await expect(service.open('pub-1', 'owner-1', undefined)).rejects.toThrow(
      'Publication not found',
    );
  });

  it('refuses a seventh stream of one user and a fourth of one publication with 429', async () => {
    const { service } = setup();
    const open: Awaited<ReturnType<typeof connect>>[] = [];
    for (let i = 0; i < PROGRESS_STREAM_MAX_PER_PUBLICATION; i += 1) {
      open.push(await connect(service));
    }
    await expect(connect(service)).rejects.toMatchObject({ status: 429 });
    for (let i = 0; open.length < PROGRESS_STREAM_MAX_PER_USER; i += 1) {
      open.push(await connect(service, { pub: `pub-${String(i + 10)}` }));
    }
    const refused = connect(service, { pub: 'pub-99' });
    await expect(refused).rejects.toBeInstanceOf(HttpException);
    // Another user is not affected by the first user's streams.
    const other = await connect(service, { user: 'owner-2', pub: 'pub-77' });
    expect(other.frames).toHaveLength(1);
    for (const c of open) c.subscription.unsubscribe();
    other.subscription.unsubscribe();
    const again = await connect(service);
    expect(again.frames).toHaveLength(1);
    again.subscription.unsubscribe();
  });

  it('sends a heartbeat every 15 seconds', async () => {
    const { service } = setup();
    const { frames, subscription } = await connect(service);
    await vi.advanceTimersByTimeAsync(PROGRESS_STREAM_HEARTBEAT_MS + 10);
    expect(frames.some((f) => f.data.type === 'heartbeat')).toBe(true);
    subscription.unsubscribe();
  });

  it('closes after the maximum lifetime with a reconnect event', async () => {
    const { service } = setup();
    const { frames, state } = await connect(service);
    await vi.advanceTimersByTimeAsync(PROGRESS_STREAM_MAX_LIFETIME_MS + 10);
    expect(frames.at(-1)?.data.type).toBe('reconnect');
    expect(state.completed).toBe(true);
  });

  it('ends with an error event after repeated upstream failures and keeps no timers', async () => {
    const { service, generation } = setup();
    const { frames, state } = await connect(service);
    generation.getProgress.mockRejectedValue(new ServiceUnavailableException('down'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(frames.at(-1)?.data).toEqual({ type: 'error', code: 'UPSTREAM_UNAVAILABLE' });
    expect(state.completed).toBe(true);
    expect(service.watcherCount).toBe(0);
    generation.getProgress.mockClear();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(generation.getProgress).not.toHaveBeenCalled();
  });

  it('survives a single failed read and keeps streaming', async () => {
    const { service, generation } = setup();
    const { frames, subscription } = await connect(service);
    generation.getProgress.mockRejectedValueOnce(new ServiceUnavailableException('blip'));
    await vi.advanceTimersByTimeAsync(450);
    generation.getProgress.mockResolvedValue(progress(2));
    await vi.advanceTimersByTimeAsync(2500);
    expect(frames.at(-1)?.data.progress?.steps).toHaveLength(2);
    subscription.unsubscribe();
  });

  it('tells the stream the job is gone when it is deleted mid-run', async () => {
    const { service, generation } = setup();
    const { frames, state } = await connect(service);
    generation.getProgress.mockRejectedValue(new NotFoundException('x'));
    await vi.advanceTimersByTimeAsync(450);
    expect(frames.at(-1)?.data.type).toBe('gone');
    expect(state.completed).toBe(true);
  });

  it('holds back a snapshot for a backed-up reader and sends the newest one later', async () => {
    const { service, generation } = setup();
    let backedUp = false;
    const { frames, subscription } = await connect(service, { backedUp: () => backedUp });
    backedUp = true;
    generation.getProgress.mockResolvedValue(progress(2));
    await vi.advanceTimersByTimeAsync(450);
    generation.getProgress.mockResolvedValue(progress(3));
    await vi.advanceTimersByTimeAsync(450);
    expect(frames).toHaveLength(1);
    backedUp = false;
    await vi.advanceTimersByTimeAsync(600);
    expect(frames).toHaveLength(2);
    expect(frames[1]?.data.progress?.steps).toHaveLength(3);
    subscription.unsubscribe();
  });

  it('gives heartbeat and terminal frames the newest snapshot id, never a bare counter', async () => {
    const { service, generation } = setup();
    const { frames } = await connect(service);
    await vi.advanceTimersByTimeAsync(PROGRESS_STREAM_HEARTBEAT_MS + 10);
    generation.getProgress.mockResolvedValue(progress(2, 'COMPLETED'));
    await vi.advanceTimersByTimeAsync(450);
    const lastSnapshot = [...frames].reverse().find((f) => f.data.type === 'progress');
    for (const frame of frames) {
      expect(frame.id).toMatch(/^[a-f0-9]{16}$/);
    }
    expect(frames.at(-1)?.id).toBe(lastSnapshot?.id);
  });
});
