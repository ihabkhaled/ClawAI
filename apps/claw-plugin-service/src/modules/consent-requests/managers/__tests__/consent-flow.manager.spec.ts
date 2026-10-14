import { ConsentRequestState } from '../../../../common/enums/consent-request-status.enum';
import { InvokeErrorCode } from '../../../../common/enums/invoke-error-code.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { builtinTarget, serverTarget } from '../../../runtime/__tests__/runtime-fixtures';
import {
  CALL,
  CHOICE,
  HASH,
  OWNER,
  REQUEST_ID,
  requestRow,
  STRANGER,
} from '../../__tests__/consent-card-fixtures';
import { ConsentFlowManager } from '../consent-flow.manager';

const WRITE_TARGET = builtinTarget({ riskLevel: RiskLevel.WRITE, toolName: 'create_note' });
const BODY = {
  installId: WRITE_TARGET.installId,
  toolName: 'create_note',
  args: {},
  callId: CALL,
  surface: 'chat',
  conversationId: 'thread-1',
  tainted: false,
  userApproved: false,
  consentRequestId: REQUEST_ID,
} as never;

function build() {
  const requests = {
    consume: vi.fn().mockResolvedValue(true),
    findOwned: vi.fn().mockResolvedValue(null),
    open: vi.fn(async (input: Record<string, unknown>) => requestRow(input as never)),
  };
  const grants = {
    exists: vi.fn().mockResolvedValue(false),
    hasConfirmedDestructive: vi.fn().mockResolvedValue(false),
  };
  return { flow: new ConsentFlowManager(requests as never, grants as never), requests, grants };
}

describe('ConsentFlowManager (consent card, invoke side)', () => {
  it('bound to args: the approval is spent only for this user, call id, tool, target and argument hash', async () => {
    const { flow, requests } = build();
    const review = await flow.review(OWNER, BODY, WRITE_TARGET, HASH);
    expect(review).toEqual({ redeemed: true, extraGrant: false, refusal: null });
    expect(requests.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OWNER,
        requestId: REQUEST_ID,
        callId: CALL,
        argsHash: HASH,
        toolName: 'create_note',
        installId: WRITE_TARGET.installId,
        serverId: null,
      }),
    );
  });

  it('bound to args: changed arguments (a different hash) do not redeem and do not refuse, so the gate asks again', async () => {
    const { flow, requests } = build();
    requests.consume.mockResolvedValue(false);
    requests.findOwned.mockResolvedValue(requestRow({ status: ConsentRequestState.APPROVED }));
    const review = await flow.review(OWNER, BODY, WRITE_TARGET, 'b'.repeat(64));
    expect(review).toEqual({ redeemed: false, extraGrant: false, refusal: null });
  });

  it('replay: an approval that was already spent does not redeem a second time', async () => {
    const { flow, requests } = build();
    requests.consume.mockResolvedValue(false);
    requests.findOwned.mockResolvedValue(requestRow({ status: ConsentRequestState.CONSUMED }));
    const review = await flow.review(OWNER, BODY, WRITE_TARGET, HASH);
    expect(review.redeemed).toBe(false);
    expect(review.refusal).toBeNull();
  });

  it('concurrent approvals: two resumes of one approval, exactly one wins the conditional consume', async () => {
    const { flow, requests } = build();
    requests.consume.mockResolvedValueOnce(true).mockResolvedValue(false);
    requests.findOwned.mockResolvedValue(requestRow({ status: ConsentRequestState.CONSUMED }));
    const results = await Promise.all([
      flow.review(OWNER, BODY, WRITE_TARGET, HASH),
      flow.review(OWNER, BODY, WRITE_TARGET, HASH),
    ]);
    expect(results.filter((item) => item.redeemed)).toHaveLength(1);
  });

  it('cross-user: another user naming the request id redeems nothing', async () => {
    const { flow, requests } = build();
    requests.consume.mockResolvedValue(false);
    requests.findOwned.mockResolvedValue(null);
    const review = await flow.review(STRANGER, BODY, WRITE_TARGET, HASH);
    expect(review).toEqual({ redeemed: false, extraGrant: false, refusal: null });
    expect(requests.consume).toHaveBeenCalledWith(expect.objectContaining({ userId: STRANGER }));
  });

  it('deny path: a denied request refuses the call with CONSENT_DENIED and never asks again', async () => {
    const { flow, requests } = build();
    requests.consume.mockResolvedValue(false);
    requests.findOwned.mockResolvedValue(
      requestRow({ status: ConsentRequestState.DENIED, choice: CHOICE.DENY }),
    );
    const review = await flow.review(OWNER, BODY, WRITE_TARGET, HASH);
    expect(review.refusal).toBe(InvokeErrorCode.CONSENT_DENIED);
  });

  it('expiry: a lapsed request refuses the call with CONSENT_EXPIRED', async () => {
    const { flow, requests } = build();
    requests.consume.mockResolvedValue(false);
    requests.findOwned.mockResolvedValue(
      requestRow({ expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
    );
    const review = await flow.review(OWNER, BODY, WRITE_TARGET, HASH);
    expect(review.refusal).toBe(InvokeErrorCode.CONSENT_EXPIRED);
  });

  it('chat grant: an Allow-for-this-chat grant for this install and tool counts, only for WRITE', async () => {
    const { flow, grants } = build();
    grants.exists.mockResolvedValue(true);
    const noRequest = { ...(BODY as object), consentRequestId: undefined } as never;
    const write = await flow.review(OWNER, noRequest, WRITE_TARGET, HASH);
    expect(write.extraGrant).toBe(true);
    expect(grants.exists).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OWNER,
        conversationId: 'thread-1',
        targetKey: WRITE_TARGET.installId,
        toolName: 'create_note',
      }),
    );
    const destructive = await flow.review(
      OWNER,
      noRequest,
      builtinTarget({ riskLevel: RiskLevel.DESTRUCTIVE, toolName: 'drop' }),
      HASH,
    );
    expect(destructive.extraGrant).toBe(false);
  });

  it('chat grant: another conversation (no conversation id) never matches', async () => {
    const { flow, grants } = build();
    grants.exists.mockResolvedValue(true);
    const noChat = {
      ...(BODY as object),
      consentRequestId: undefined,
      conversationId: undefined,
    } as never;
    expect((await flow.review(OWNER, noChat, WRITE_TARGET, HASH)).extraGrant).toBe(false);
  });

  it('destructive standing grant: only a confirmed one counts, and never on an own server', async () => {
    const { flow, grants } = build();
    const noRequest = { ...(BODY as object), consentRequestId: undefined } as never;
    const target = builtinTarget({ riskLevel: RiskLevel.DESTRUCTIVE, toolName: 'drop' });
    expect((await flow.review(OWNER, noRequest, target, HASH)).extraGrant).toBe(false);
    grants.hasConfirmedDestructive.mockResolvedValue(true);
    expect((await flow.review(OWNER, noRequest, target, HASH)).extraGrant).toBe(true);
    const server = serverTarget({ riskLevel: RiskLevel.DESTRUCTIVE });
    expect((await flow.review(OWNER, noRequest, server, HASH)).extraGrant).toBe(false);
  });

  it('open: stores a redacted, truncated preview and a deadline, and returns the card view without the hash', async () => {
    const { flow, requests } = build();
    const context = {
      userId: OWNER,
      callId: CALL,
      surface: 'chat',
      conversationId: 'thread-1',
      messageId: 'msg-1',
      tainted: false,
      target: WRITE_TARGET,
      argsHash: HASH,
      started: Date.now(),
    };
    const view = await flow.open(context as never, 'REQUIRED_FIRST_USE' as never, {
      title: 'x',
      apiKey: 'sk-secret-secret-secret-secret-secret-1234',
      note: 'y'.repeat(400),
    });
    const stored = requests.open.mock.calls[0]?.[0] as { argsPreview: string; expiresAt: Date };
    expect(stored.argsPreview).not.toContain('sk-secret');
    expect(stored.argsPreview.length).toBeLessThanOrEqual(513);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(view).not.toHaveProperty('argsHash');
    expect(view.options.allowChat).toBe(true);
    // The stored row's call id travels back, so a re-asked question resumes on the open card's id.
    const opened = (await Promise.resolve(requests.open.mock.results.at(0)?.value)) as {
      callId: string;
    };
    expect(view.callId).toBe(opened.callId);
  });
});
