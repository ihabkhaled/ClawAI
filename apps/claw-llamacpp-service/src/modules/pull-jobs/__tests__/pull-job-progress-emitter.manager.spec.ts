import { take, toArray } from 'rxjs/operators';
import { PullJobStatus } from '../../../common/enums';
import { PullJobProgressEmitterManager } from '../managers/pull-job-progress-emitter.manager';
import { type PullJobProgressEvent } from '../types/pull-job.types';

function makeEvent(overrides: Partial<PullJobProgressEvent> = {}): PullJobProgressEvent {
  return {
    jobId: 'job-1',
    status: PullJobStatus.RUNNING,
    bytesDownloaded: 0n,
    totalBytes: 100n,
    completedFiles: 0,
    totalFiles: 1,
    currentFile: null,
    mbps: 0,
    etaSeconds: null,
    reasonCode: null,
    errorMessage: null,
    ...overrides,
  };
}

describe('PullJobProgressEmitterManager', () => {
  it('subscribers receive progress events', async () => {
    const emitter = new PullJobProgressEmitterManager();
    const subject = emitter.subscribe('job-1');
    const collected = subject.pipe(take(1), toArray()).toPromise();
    emitter.emit(makeEvent({ bytesDownloaded: 50n }));
    const events = await collected;
    expect(events).toHaveLength(1);
    expect(events?.[0]?.data.bytesDownloaded).toBe(50n);
  });

  it('replays last event from getLast()', () => {
    const emitter = new PullJobProgressEmitterManager();
    emitter.emit(makeEvent({ bytesDownloaded: 25n }));
    const last = emitter.getLast('job-1');
    expect(last?.data.bytesDownloaded).toBe(25n);
  });

  it('closes channel on terminal status', () => {
    const emitter = new PullJobProgressEmitterManager();
    emitter.emit(makeEvent({ status: PullJobStatus.COMPLETED }));
    // emitting again should be silently dropped (channel is closed)
    emitter.emit(makeEvent({ status: PullJobStatus.COMPLETED }));
    expect(emitter.getLast('job-1')?.data.status).toBe(PullJobStatus.COMPLETED);
  });
});
