import { BreakerDecision } from '../../../../common/enums/breaker-decision.enum';
import { ConsentDecision } from '../../../../common/enums/consent-decision.enum';
import { InvokeErrorCode } from '../../../../common/enums/invoke-error-code.enum';
import { InvokeOutcome } from '../../../../common/enums/invoke-outcome.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { ConsentGateManager } from '../../managers/consent-gate.manager';
import { ToolArgumentsManager } from '../../managers/tool-arguments.manager';
import { builtinTarget, CALL_ID, INSTALL, USER } from '../../__tests__/runtime-fixtures';
import { PluginInvokeService } from '../plugin-invoke.service';

const SETTINGS = {
  userServersEnabled: true,
  requireApproval: false,
  callTimeoutMs: 30_000,
  maxResultBytes: 262_144,
  ratePerMinute: 20,
  concurrentPerUser: 3,
};
const BODY = {
  installId: INSTALL,
  toolName: 'get_weather',
  args: { location: 'Cairo' },
  callId: CALL_ID,
  surface: 'chat',
  conversationId: 'thread-1',
  tainted: false,
  userApproved: false,
} as never;

function build(flow: Record<string, unknown>, risk = RiskLevel.WRITE) {
  const target = builtinTarget({ riskLevel: risk });
  const run = vi.fn().mockResolvedValue({
    outcome: InvokeOutcome.OK,
    text: 'done',
    errorCode: null,
    serverFault: false,
    truncated: false,
  });
  const audit = {
    record: vi.fn().mockResolvedValue(undefined),
    alreadyRecorded: vi.fn().mockResolvedValue(false),
  };
  const service = new PluginInvokeService(
    { resolve: vi.fn().mockResolvedValue({ target, blocked: null }) } as never,
    { assertAllowed: vi.fn().mockResolvedValue(undefined) } as never,
    new ToolArgumentsManager(),
    new ConsentGateManager(),
    { load: vi.fn().mockResolvedValue(SETTINGS) } as never,
    { acquire: vi.fn().mockResolvedValue({ ok: true, release: vi.fn() }) } as never,
    {
      reserve: vi.fn().mockResolvedValue({ allowed: true, reservationId: 'res-1' }),
      settle: vi.fn().mockResolvedValue(undefined),
    } as never,
    { execute: run } as never,
    { execute: run } as never,
    {
      admit: vi.fn().mockResolvedValue(BreakerDecision.ALLOW),
      succeeded: vi.fn(),
      failed: vi.fn(),
    } as never,
    audit as never,
    flow as never,
  );
  return { service, run, audit };
}

const signal = (): AbortSignal => new AbortController().signal;
const OPEN_VIEW = {
  id: 'req-1',
  expiresAt: '2026-10-15T10:02:00.000Z',
  options: { allowChat: true, always: true, alwaysNeedsConfirmation: false },
};

describe('PluginInvokeService with the in-chat consent card', () => {
  it('pauses a WRITE call: answers CONSENT_REQUIRED with the open request, runs nothing, audits nothing', async () => {
    const flow = {
      review: vi.fn().mockResolvedValue({ redeemed: false, extraGrant: false, refusal: null }),
      open: vi.fn().mockResolvedValue(OPEN_VIEW),
    };
    const { service, run, audit } = build(flow);

    const response = await service.invoke(USER, BODY, signal());

    expect(response.status).toBe(InvokeOutcome.CONSENT_REQUIRED);
    expect(response.consent).toMatchObject({
      reason: ConsentDecision.REQUIRED_FIRST_USE,
      requestId: 'req-1',
      expiresAt: OPEN_VIEW.expiresAt,
      options: OPEN_VIEW.options,
    });
    expect(run).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('resumes the SAME call once the approval is redeemed: runs exactly once and audits one row', async () => {
    const flow = {
      review: vi.fn().mockResolvedValue({ redeemed: true, extraGrant: false, refusal: null }),
      open: vi.fn(),
    };
    const { service, run, audit } = build(flow);

    const response = await service.invoke(
      USER,
      { ...(BODY as object), consentRequestId: 'req-1' } as never,
      signal(),
    );

    expect(response.status).toBe(InvokeOutcome.OK);
    expect(run).toHaveBeenCalledTimes(1);
    expect(flow.open).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ consentDecision: ConsentDecision.APPROVED_THIS_CALL }),
    );
  });

  it('deny path: a denied request refuses the call as BLOCKED with CONSENT_DENIED and runs nothing', async () => {
    const flow = {
      review: vi.fn().mockResolvedValue({
        redeemed: false,
        extraGrant: false,
        refusal: InvokeErrorCode.CONSENT_DENIED,
      }),
      open: vi.fn(),
    };
    const { service, run } = build(flow);

    const response = await service.invoke(USER, BODY, signal());

    expect(response).toMatchObject({
      status: InvokeOutcome.BLOCKED,
      errorCode: InvokeErrorCode.CONSENT_DENIED,
      content: null,
    });
    expect(run).not.toHaveBeenCalled();
    expect(flow.open).not.toHaveBeenCalled();
  });

  it('expiry: a lapsed request refuses with CONSENT_EXPIRED', async () => {
    const flow = {
      review: vi.fn().mockResolvedValue({
        redeemed: false,
        extraGrant: false,
        refusal: InvokeErrorCode.CONSENT_EXPIRED,
      }),
      open: vi.fn(),
    };
    const { service } = build(flow);
    expect((await service.invoke(USER, BODY, signal())).errorCode).toBe(
      InvokeErrorCode.CONSENT_EXPIRED,
    );
  });

  it('chat grant: an Allow-for-this-chat grant lets a WRITE call through without a card', async () => {
    const flow = {
      review: vi.fn().mockResolvedValue({ redeemed: false, extraGrant: true, refusal: null }),
      open: vi.fn(),
    };
    const { service, run } = build(flow);
    const response = await service.invoke(USER, BODY, signal());
    expect(response.status).toBe(InvokeOutcome.OK);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('taint rule: a tainted turn still asks even with a chat grant', async () => {
    const flow = {
      review: vi.fn().mockResolvedValue({ redeemed: false, extraGrant: true, refusal: null }),
      open: vi.fn().mockResolvedValue(OPEN_VIEW),
    };
    const { service, run } = build(flow);
    const response = await service.invoke(
      USER,
      { ...(BODY as object), tainted: true } as never,
      signal(),
    );
    expect(response.consent?.reason).toBe(ConsentDecision.REQUIRED_TAINTED);
    expect(run).not.toHaveBeenCalled();
  });

  it('READ tools stay frictionless: the consent flow is never consulted', async () => {
    const flow = { review: vi.fn(), open: vi.fn() };
    const { service, run } = build(flow, RiskLevel.READ);
    expect((await service.invoke(USER, BODY, signal())).status).toBe(InvokeOutcome.OK);
    expect(run).toHaveBeenCalledTimes(1);
    expect(flow.review).not.toHaveBeenCalled();
    expect(flow.open).not.toHaveBeenCalled();
  });

  it('DESTRUCTIVE asks every call; only a confirmed standing grant skips it', async () => {
    const ask = {
      review: vi.fn().mockResolvedValue({ redeemed: false, extraGrant: false, refusal: null }),
      open: vi.fn().mockResolvedValue({
        ...OPEN_VIEW,
        options: { ...OPEN_VIEW.options, alwaysNeedsConfirmation: true },
      }),
    };
    const asked = build(ask, RiskLevel.DESTRUCTIVE);
    expect((await asked.service.invoke(USER, BODY, signal())).consent?.reason).toBe(
      ConsentDecision.REQUIRED_EVERY_CALL,
    );
    const standing = {
      review: vi.fn().mockResolvedValue({ redeemed: false, extraGrant: true, refusal: null }),
      open: vi.fn(),
    };
    const allowed = build(standing, RiskLevel.DESTRUCTIVE);
    expect((await allowed.service.invoke(USER, BODY, signal())).status).toBe(InvokeOutcome.OK);
  });
});
