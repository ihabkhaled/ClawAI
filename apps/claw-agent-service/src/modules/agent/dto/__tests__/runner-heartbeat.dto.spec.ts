import { runnerHeartbeatSchema } from '../register-runner.dto';

describe('runnerHeartbeatSchema (F100 report at heartbeat)', () => {
  it('treats a missing body as an empty report, so existing runners keep working', () => {
    const result = runnerHeartbeatSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({});
  });

  it('accepts an empty object', () => {
    expect(runnerHeartbeatSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a version and a platform and normalises win32 to windows', () => {
    const result = runnerHeartbeatSchema.safeParse({ agentVersion: '1.90.0', platform: 'win32' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ agentVersion: '1.90.0', platform: 'windows' });
    }
  });

  it('accepts the version alone', () => {
    const result = runnerHeartbeatSchema.safeParse({ agentVersion: '2.0.0-beta.1' });
    expect(result.success).toBe(true);
  });

  it.each([
    ['empty version', { agentVersion: '' }],
    ['overlong version', { agentVersion: 'v'.repeat(51) }],
    ['null version', { agentVersion: null }],
    ['numeric version', { agentVersion: 1 }],
    ['unknown platform', { platform: 'plan9' }],
    ['empty platform', { platform: '' }],
    ['null platform', { platform: null }],
  ])('rejects %s', (_label, body) => {
    expect(runnerHeartbeatSchema.safeParse(body).success).toBe(false);
  });

  it('boundary: a 50 character version is accepted', () => {
    expect(runnerHeartbeatSchema.safeParse({ agentVersion: 'v'.repeat(50) }).success).toBe(true);
  });

  it('drops unknown keys so a runner cannot write other session columns', () => {
    const result = runnerHeartbeatSchema.safeParse({
      agentVersion: '1.0.0',
      status: 'CONNECTED',
      userId: 'someone-else',
      metadata: { kind: 'runner' },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ agentVersion: '1.0.0' });
  });
});
