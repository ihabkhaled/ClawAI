import { resolveClientAddress } from '@claw/shared-auth';
import { vi } from 'vitest';

import {
  AGENT_AUTH_RATE_LIMIT_KEY_PREFIX,
  UNKNOWN_CLIENT_IP,
} from '../constants/agent-auth-rate-limit.constants';
import { AgentAuthRateLimitPolicy } from '../enums/agent-auth-rate-limit-policy.enum';
import { AgentAuthRateLimitScope } from '../enums/agent-auth-rate-limit-scope.enum';
import {
  buildAgentAuthRateLimitKey,
  hashRateLimitPart,
  readPairingCode,
  resolveClientIp,
} from '../utilities/agent-auth-rate-limit-key.utility';

vi.mock('@claw/shared-auth', () => ({ resolveClientAddress: vi.fn() }));

const mockedResolve = vi.mocked(resolveClientAddress);

describe('resolveClientIp', () => {
  beforeEach(() => {
    mockedResolve.mockReset();
  });

  it('delegates to the shared resolver, so every limiter keys the same address', async () => {
    mockedResolve.mockResolvedValue({ address: '203.0.113.7', viaProxy: true });
    const headers = { 'x-real-ip': '203.0.113.7' };
    await expect(resolveClientIp(headers, '172.18.0.29')).resolves.toBe('203.0.113.7');
    expect(mockedResolve).toHaveBeenCalledWith(headers, '172.18.0.29');
  });

  it('keys a LAN peer that spoofs X-Real-IP on its own address', async () => {
    mockedResolve.mockResolvedValue({ address: '192.168.1.50', viaProxy: false });
    await expect(resolveClientIp({ 'x-real-ip': '203.0.113.7' }, '192.168.1.50')).resolves.toBe(
      '192.168.1.50',
    );
  });

  it('falls back to the unknown bucket when nothing is usable', async () => {
    mockedResolve.mockResolvedValue(null);
    await expect(resolveClientIp({}, undefined)).resolves.toBe(UNKNOWN_CLIENT_IP);
  });
});

describe('readPairingCode', () => {
  it('reads a non-empty string code only', () => {
    expect(readPairingCode({ pairingCode: 'abc' })).toBe('abc');
    expect(readPairingCode({ pairingCode: '' })).toBeNull();
    expect(readPairingCode({ pairingCode: ['a'] })).toBeNull();
    expect(readPairingCode(undefined)).toBeNull();
  });
});

describe('buildAgentAuthRateLimitKey', () => {
  const subject = { ip: '203.0.113.7', pairingCode: 'secret-pairing-code' };

  it('hashes the IP and the pairing code into the key', () => {
    const ipKey = buildAgentAuthRateLimitKey(
      AgentAuthRateLimitPolicy.PAIR_INIT,
      AgentAuthRateLimitScope.IP,
      subject,
    );
    const codeKey = buildAgentAuthRateLimitKey(
      AgentAuthRateLimitPolicy.PAIR_POLL,
      AgentAuthRateLimitScope.PAIRING_CODE,
      subject,
    );
    expect(ipKey).toBe(
      `${AGENT_AUTH_RATE_LIMIT_KEY_PREFIX}pair-init:ip:${hashRateLimitPart('203.0.113.7')}`,
    );
    expect(codeKey).toBe(
      `${AGENT_AUTH_RATE_LIMIT_KEY_PREFIX}pair-poll:pairing-code:${hashRateLimitPart(
        'secret-pairing-code',
      )}`,
    );
    expect(`${ipKey}${codeKey}`).not.toMatch(/203\.0\.113\.7|secret-pairing-code/u);
  });

  it('skips the code window when the request has no code', () => {
    expect(
      buildAgentAuthRateLimitKey(
        AgentAuthRateLimitPolicy.PAIR_POLL,
        AgentAuthRateLimitScope.PAIRING_CODE,
        { ip: '203.0.113.7', pairingCode: null },
      ),
    ).toBeNull();
  });
});
