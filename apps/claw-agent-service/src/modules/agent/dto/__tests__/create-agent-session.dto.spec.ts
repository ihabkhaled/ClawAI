import { createAgentSessionSchema } from '../create-agent-session.dto';

describe('createAgentSessionSchema', () => {
  const validBase = {
    hostname: 'workstation-01',
    agentVersion: '1.0.0',
  };

  it('accepts canonical windows platform values', () => {
    const result = createAgentSessionSchema.safeParse({
      ...validBase,
      platform: 'windows',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe('windows');
    }
  });

  it('normalizes win32 to windows', () => {
    const result = createAgentSessionSchema.safeParse({
      ...validBase,
      platform: 'win32',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe('windows');
    }
  });

  it('keeps darwin unchanged', () => {
    const result = createAgentSessionSchema.safeParse({
      ...validBase,
      platform: 'darwin',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe('darwin');
    }
  });
});
