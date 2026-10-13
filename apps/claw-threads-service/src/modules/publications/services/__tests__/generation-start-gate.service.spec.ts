import { MAX_QUEUED_OWNER_REQUESTS } from '../../constants/generation-start-gate.constants';
import { GenerationStartGate } from '../generation-start-gate.service';

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

describe('GenerationStartGate', () => {
  it('runs one owner’s requests one at a time', async () => {
    const gate = new GenerationStartGate();
    let running = 0;
    let mostAtOnce = 0;
    const task = async () => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await pause(3);
      running -= 1;
    };

    await Promise.all([
      gate.run('owner-1', task),
      gate.run('owner-1', task),
      gate.run('owner-1', task),
    ]);

    expect(mostAtOnce).toBe(1);
  });

  it('answers 429 with a code once too many requests of one owner are waiting', async () => {
    const gate = new GenerationStartGate();
    const waiting = Array.from({ length: MAX_QUEUED_OWNER_REQUESTS }, () =>
      gate.run('owner-1', () => pause(10)),
    );

    await expect(gate.run('owner-1', () => pause(1))).rejects.toMatchObject({
      status: 429,
      response: { code: 'THREAD_GENERATION_TOO_MANY_ACTIVE', statusCode: 429 },
    });
    await expect(gate.run('owner-2', async () => 'other owner is fine')).resolves.toBe(
      'other owner is fine',
    );
    await Promise.all(waiting);
    await expect(gate.run('owner-1', async () => 'free again')).resolves.toBe('free again');
  });

  it('remembers which jobs are being attached until told otherwise', () => {
    const gate = new GenerationStartGate();

    const end = gate.beginAttach('job-1');
    expect(gate.isAttaching('job-1')).toBe(true);
    expect(gate.isAttaching('job-2')).toBe(false);
    end();
    expect(gate.isAttaching('job-1')).toBe(false);
  });
});
