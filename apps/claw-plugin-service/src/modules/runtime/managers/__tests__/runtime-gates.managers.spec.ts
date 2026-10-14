import {
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConsentDecision } from '../../../../common/enums/consent-decision.enum';
import { InvokeErrorCode } from '../../../../common/enums/invoke-error-code.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { QuotaSettlement } from '../../../../common/enums/quota-settlement.enum';
import { AppConfig } from '../../../../app/config/app.config';
import { BUILTIN_ADAPTER_KEYS } from '../../constants/adapter-registry.constants';
import { AdapterRegistryManager } from '../adapter-registry.manager';
import { CallLimiterManager } from '../call-limiter.manager';
import { ConsentGateManager } from '../consent-gate.manager';
import { PluginCallsQuotaManager } from '../plugin-calls-quota.manager';
import { RuntimePlanGateManager } from '../runtime-plan-gate.manager';
import { ToolArgumentsManager } from '../tool-arguments.manager';

describe('ConsentGateManager', () => {
  const gate = new ConsentGateManager();
  const decide = (
    riskLevel: RiskLevel,
    extra: Partial<{ consentGranted: boolean; tainted: boolean; userApproved: boolean }> = {},
  ) =>
    gate.decide({
      riskLevel,
      consentGranted: false,
      tainted: false,
      userApproved: false,
      ...extra,
    });

  it('never asks for a READ tool, even in a tainted turn', () => {
    expect(decide(RiskLevel.READ)).toEqual({
      required: false,
      decision: ConsentDecision.NOT_REQUIRED,
    });
    expect(decide(RiskLevel.READ, { tainted: true })).toEqual({
      required: false,
      decision: ConsentDecision.NOT_REQUIRED,
    });
  });

  it('asks the first time for a WRITE tool and remembers a grant', () => {
    expect(decide(RiskLevel.WRITE)).toEqual({
      required: true,
      decision: ConsentDecision.REQUIRED_FIRST_USE,
    });
    expect(decide(RiskLevel.WRITE, { consentGranted: true })).toEqual({
      required: false,
      decision: ConsentDecision.STORED_GRANT,
    });
  });

  it('asks for a DESTRUCTIVE tool every time, whatever was granted', () => {
    expect(decide(RiskLevel.DESTRUCTIVE, { consentGranted: true })).toEqual({
      required: true,
      decision: ConsentDecision.REQUIRED_EVERY_CALL,
    });
  });

  it('asks for every non-READ call after untrusted content, ignoring a standing grant (the taint rule)', () => {
    expect(decide(RiskLevel.WRITE, { consentGranted: true, tainted: true })).toEqual({
      required: true,
      decision: ConsentDecision.REQUIRED_TAINTED,
    });
    expect(decide(RiskLevel.DESTRUCTIVE, { tainted: true }).decision).toBe(
      ConsentDecision.REQUIRED_TAINTED,
    );
  });

  it('lets a call through when the user approved that call, even tainted or destructive', () => {
    for (const risk of [RiskLevel.WRITE, RiskLevel.DESTRUCTIVE]) {
      expect(decide(risk, { userApproved: true, tainted: true })).toEqual({
        required: false,
        decision: ConsentDecision.APPROVED_THIS_CALL,
      });
    }
  });
});

describe('ToolArgumentsManager', () => {
  const manager = new ToolArgumentsManager();
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 100 },
      days: { type: 'integer', minimum: 1, maximum: 7, default: 3 },
    },
    required: ['title'],
    additionalProperties: false,
  };

  it('fills defaults and returns the arguments', () => {
    expect(manager.prepare(schema, { title: 'x' })).toEqual({ title: 'x', days: 3 });
  });

  it.each([
    ['a missing required field', {}],
    ['a wrong type', { title: 5 }],
    ['an unknown field', { title: 'x', extra: 1 }],
    ['a value out of range', { title: 'x', days: 99 }],
    ['an empty string below minLength', { title: '' }],
    ['a prototype key', JSON.parse('{"title":"x","__proto__":{"a":1}}') as Record<string, unknown>],
  ])('answers 400 PLUGIN_ARGUMENTS_INVALID for %s', (_name, args) => {
    try {
      manager.prepare(schema, args);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        errorCode: InvokeErrorCode.ARGUMENTS_INVALID,
      });
    }
  });

  it('names the failing paths but never echoes a value', () => {
    try {
      manager.prepare(schema, { title: 'SECRET-VALUE-123', days: 'lots' });
    } catch (error) {
      const body = JSON.stringify((error as BadRequestException).getResponse());
      expect(body).toContain('days');
      expect(body).not.toContain('SECRET-VALUE-123');
    }
  });

  it('allows long text (a document body) that install settings would not', () => {
    const open = {
      type: 'object',
      properties: { body: { type: 'string' } },
      additionalProperties: false,
    };

    expect(manager.prepare(open, { body: 'x'.repeat(10_000) })).toEqual({
      body: 'x'.repeat(10_000),
    });
  });

  it('refuses arguments over 32 KB and strings over the cap', () => {
    const open = {
      type: 'object',
      properties: { body: { type: 'string' } },
      additionalProperties: false,
    };

    expect(() => manager.prepare(open, { body: 'x'.repeat(40_000) })).toThrow(BadRequestException);
    expect(() => manager.prepare(open, { body: 'x'.repeat(16_001) })).toThrow(BadRequestException);
  });

  it('refuses arguments nested deeper than the limit', () => {
    const nest = (levels: number, leaf: unknown): Record<string, unknown> => {
      let node = leaf;
      for (let level = 0; level < levels; level += 1) node = { child: node };
      return node as Record<string, unknown>;
    };
    const nestedSchema = (levels: number): Record<string, unknown> => {
      let inner: Record<string, unknown> = { type: 'string' };
      for (let level = 0; level < levels; level += 1) {
        inner = { type: 'object', properties: { child: inner }, additionalProperties: false };
      }
      return inner;
    };

    expect(() => manager.prepare(nestedSchema(3), nest(3, 'x'))).not.toThrow();
    expect(() => manager.prepare(nestedSchema(9), nest(9, 'x'))).toThrow(BadRequestException);
  });
});

describe('RuntimePlanGateManager', () => {
  const entitlements = (allow: boolean) => ({
    getEntitlements: vi.fn().mockResolvedValue({
      role: 'USER',
      plan: { limits: {}, featureGates: { allowPlugins: allow } },
    }),
  });

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes when the plan allows plugins', async () => {
    await expect(
      new RuntimePlanGateManager(entitlements(true) as never).assertAllowed('u'),
    ).resolves.toBeUndefined();
  });

  it('answers 403 when the plan does not', async () => {
    await expect(
      new RuntimePlanGateManager(entitlements(false) as never).assertAllowed('u'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed with 503 when auth-service cannot be reached', async () => {
    await expect(
      new RuntimePlanGateManager({
        getEntitlements: vi.fn().mockRejectedValue(new Error('down')),
      } as never).assertAllowed('u'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('PluginCallsQuotaManager', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('PLUGIN_DATABASE_URL', 'postgresql://localhost:5432/claw_plugin');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'y'.repeat(32));
    vi.stubEnv('PLUGIN_ENCRYPTION_KEY', 'e5'.repeat(32));
    AppConfig.validate();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const answer = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });

  it('holds a PLUGIN_CALLS run with the call id as the idempotency key and the service token', async () => {
    fetchMock.mockResolvedValue(answer(200, { allowed: true, reservationId: 'res-1' }));

    const decision = await new PluginCallsQuotaManager().reserve('user-1', 'call-12345678');

    expect(decision).toEqual({ allowed: true, reservationId: 'res-1' });
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://auth-service:4001/api/v1/internal/quota/features/reserve');
    expect(init.headers['Authorization']).toBe(`Service ${'y'.repeat(32)}`);
    expect(JSON.parse(init.body)).toEqual({
      userId: 'user-1',
      feature: 'PLUGIN_CALLS',
      requestId: 'plugin-call:call-12345678',
    });
  });

  it('passes through an unmetered caller (no reservation to settle)', async () => {
    fetchMock.mockResolvedValue(answer(200, { allowed: true, reservationId: null }));

    expect(await new PluginCallsQuotaManager().reserve('admin', 'call-12345678')).toEqual({
      allowed: true,
      reservationId: null,
    });
  });

  it('maps an exhausted day and a disabled feature to their codes with the numbers', async () => {
    const manager = new PluginCallsQuotaManager();
    fetchMock.mockResolvedValueOnce(
      answer(200, {
        allowed: false,
        reason: 'FEATURE_TRIAL_EXHAUSTED',
        used: 25,
        limit: 25,
        window: 'DAY',
      }),
    );
    fetchMock.mockResolvedValueOnce(
      answer(200, { allowed: false, reason: 'FEATURE_DISABLED', used: 0, limit: 0, window: null }),
    );

    expect(await manager.reserve('u', 'call-12345678')).toEqual({
      allowed: false,
      errorCode: InvokeErrorCode.CALLS_EXHAUSTED,
      detail: { used: 25, limit: 25, window: 'DAY' },
    });
    expect(await manager.reserve('u', 'call-12345678')).toMatchObject({
      allowed: false,
      errorCode: InvokeErrorCode.CALLS_DISABLED,
    });
  });

  it.each([
    ['an auth-service error status', () => fetchMock.mockResolvedValue(answer(500, {}))],
    ['a network failure', () => fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))],
    ['an unreadable decision', () => fetchMock.mockResolvedValue(answer(200, { allowed: 'yes' }))],
  ])('fails closed with 503 on %s: no answer is never "allowed"', async (_name, arrange) => {
    arrange();

    await expect(
      new PluginCallsQuotaManager().reserve('u', 'call-12345678'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('settles a hold and never throws when settling fails', async () => {
    const manager = new PluginCallsQuotaManager();
    fetchMock.mockResolvedValueOnce(answer(204, null));
    fetchMock.mockRejectedValueOnce(new Error('down'));

    await manager.settle('res-1', QuotaSettlement.CONSUME);
    await expect(manager.settle('res-1', QuotaSettlement.RELEASE)).resolves.toBeUndefined();

    expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({
      reservationId: 'res-1',
      outcome: 'CONSUME',
    });
  });
});

describe('CallLimiterManager', () => {
  const build = (recent: number) => {
    const audit = { countSince: vi.fn().mockResolvedValue(recent) };
    return { limiter: new CallLimiterManager(audit as never), audit };
  };
  const LIMITS = { ratePerMinute: 20, concurrentPerUser: 3 };

  it('counts the last minute from the audit table', async () => {
    const { limiter, audit } = build(0);
    const now = Date.parse('2026-10-14T10:00:00Z');

    await limiter.acquire('u', LIMITS, now);

    expect(audit.countSince).toHaveBeenCalledWith('u', new Date(now - 60_000));
  });

  it('refuses at the per-minute limit', async () => {
    const { limiter } = build(20);

    expect(await limiter.acquire('u', LIMITS)).toEqual({
      ok: false,
      errorCode: InvokeErrorCode.RATE_LIMITED,
    });
  });

  it('allows three in flight, refuses the fourth, and frees a slot on release', async () => {
    const { limiter } = build(0);
    const slots = [
      await limiter.acquire('u', LIMITS),
      await limiter.acquire('u', LIMITS),
      await limiter.acquire('u', LIMITS),
    ];

    expect(slots.every((slot) => slot.ok)).toBe(true);
    expect(await limiter.acquire('u', LIMITS)).toEqual({
      ok: false,
      errorCode: InvokeErrorCode.CONCURRENCY_LIMITED,
    });

    const first = slots[0];
    if (first?.ok === true) first.release();
    expect((await limiter.acquire('u', LIMITS)).ok).toBe(true);
  });

  it('releases a slot once even when release is called twice', async () => {
    const { limiter } = build(0);
    const one = { ratePerMinute: 20, concurrentPerUser: 1 };
    const slot = await limiter.acquire('u', one);
    if (slot.ok) {
      slot.release();
      slot.release();
    }
    const again = await limiter.acquire('u', one);
    expect(again.ok).toBe(true);
    expect((await limiter.acquire('u', one)).ok).toBe(false);
  });

  it('counts each user separately', async () => {
    const { limiter } = build(0);
    const one = { ratePerMinute: 20, concurrentPerUser: 1 };

    expect((await limiter.acquire('a', one)).ok).toBe(true);
    expect((await limiter.acquire('b', one)).ok).toBe(true);
    expect((await limiter.acquire('a', one)).ok).toBe(false);
  });
});

describe('AdapterRegistryManager', () => {
  const adapter = { execute: vi.fn() };
  const registry = new AdapterRegistryManager(adapter as never, adapter as never, adapter as never);

  it('has an adapter for exactly the keys manifests may use', () => {
    expect(registry.keys().sort()).toEqual([...BUILTIN_ADAPTER_KEYS].sort());
  });

  it('returns undefined for unknown and prototype-chain keys', () => {
    for (const key of ['', 'shell', 'constructor', '__proto__', 'toString', 'WEATHER']) {
      expect(registry.get(key)).toBeUndefined();
    }
    expect(registry.get('weather')).toBe(adapter);
  });
});
