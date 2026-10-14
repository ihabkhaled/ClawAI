import { ConsentRequestState } from '../../../../common/enums/consent-request-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import {
  CALL,
  CHOICE,
  HASH,
  LATER,
  NOW,
  OWNER,
  REQUEST_ID,
  requestRow,
} from '../../__tests__/consent-card-fixtures';
import { ConsentRequestsRepository } from '../consent-requests.repository';

function dbRow(overrides: Record<string, unknown> = {}) {
  return { ...requestRow(), riskLevel: 'WRITE', status: 'PENDING', choice: null, ...overrides };
}

function build() {
  const tx = {
    pluginConsentRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    pluginChatConsent: { upsert: vi.fn().mockResolvedValue({}) },
    pluginToolConsent: { upsert: vi.fn().mockResolvedValue({}) },
    mcpServerTool: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    pluginConsentRequest: {
      findFirst: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
      findUniqueOrThrow: vi.fn().mockResolvedValue(dbRow()),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  return { prisma, tx, repository: new ConsentRequestsRepository(prisma as never) };
}

const INPUT = {
  userId: OWNER,
  installId: 'inst-1',
  serverId: null,
  pluginSlug: 'notes',
  pluginName: 'Notes',
  toolName: 'create_note',
  toolTitle: 'Create a note',
  riskLevel: RiskLevel.WRITE,
  callId: CALL,
  conversationId: 'thread-1',
  messageId: null,
  surface: 'chat',
  argsHash: HASH,
  argsPreview: '{}',
  reason: 'REQUIRED_FIRST_USE',
  expiresAt: LATER,
};

describe('ConsentRequestsRepository (binding and atomicity)', () => {
  it('consume is one conditional update bound to user, call, hash, tool, target, APPROVED and unspent', async () => {
    const { prisma, repository } = build();
    const ok = await repository.consume({
      userId: OWNER,
      requestId: REQUEST_ID,
      callId: CALL,
      argsHash: HASH,
      toolName: 'create_note',
      installId: 'inst-1',
      serverId: null,
      now: NOW,
    });
    expect(ok).toBe(true);
    expect(prisma.pluginConsentRequest.updateMany).toHaveBeenCalledWith({
      where: {
        id: REQUEST_ID,
        userId: OWNER,
        callId: CALL,
        argsHash: HASH,
        toolName: 'create_note',
        installId: 'inst-1',
        serverId: null,
        status: 'APPROVED',
        consumedAt: null,
        expiresAt: { gt: NOW },
      },
      data: { status: 'CONSUMED', consumedAt: NOW },
    });
  });

  it('consume loses when the conditional update matches nothing (spent, changed arguments, other user)', async () => {
    const { prisma, repository } = build();
    prisma.pluginConsentRequest.updateMany.mockResolvedValue({ count: 0 });
    const ok = await repository.consume({
      userId: OWNER,
      requestId: REQUEST_ID,
      callId: CALL,
      argsHash: 'c'.repeat(64),
      toolName: 'create_note',
      installId: 'inst-1',
      serverId: null,
      now: NOW,
    });
    expect(ok).toBe(false);
  });

  it('decide writes the status change and the chat grant in one transaction', async () => {
    const { tx, repository } = build();
    const won = await repository.decide({
      id: REQUEST_ID,
      userId: OWNER,
      now: NOW,
      status: ConsentRequestState.APPROVED,
      choice: CHOICE.ALLOW_CHAT,
      effect: {
        kind: 'CHAT_GRANT',
        conversationId: 'thread-1',
        targetKey: 'inst-1',
        pluginSlug: 'notes',
        toolName: 'create_note',
        riskLevel: RiskLevel.WRITE,
        expiresAt: LATER,
      },
    });
    expect(won).toBe(true);
    expect(tx.pluginConsentRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          userId: OWNER,
          expiresAt: { gt: NOW },
        }),
      }),
    );
    expect(tx.pluginChatConsent.upsert).toHaveBeenCalledTimes(1);
  });

  it('decide writes nothing else when it loses the race', async () => {
    const { tx, repository } = build();
    tx.pluginConsentRequest.updateMany.mockResolvedValue({ count: 0 });
    const won = await repository.decide({
      id: REQUEST_ID,
      userId: OWNER,
      now: NOW,
      status: ConsentRequestState.APPROVED,
      choice: CHOICE.ALWAYS_ALLOW,
      effect: {
        kind: 'INSTALL_CONSENT',
        installId: 'inst-1',
        toolName: 'create_note',
        riskLevel: RiskLevel.WRITE,
        confirmedDestructive: false,
      },
    });
    expect(won).toBe(false);
    expect(tx.pluginToolConsent.upsert).not.toHaveBeenCalled();
  });

  it('open: the same call with the same arguments returns the same request', async () => {
    const { prisma, repository } = build();
    prisma.pluginConsentRequest.findFirst.mockResolvedValue(dbRow());
    const row = await repository.open(INPUT, NOW);
    expect(row.id).toBe(REQUEST_ID);
    expect(prisma.pluginConsentRequest.createMany).not.toHaveBeenCalled();
    expect(prisma.pluginConsentRequest.updateMany).not.toHaveBeenCalled();
  });

  it('open: changed arguments reset an earlier approval to a fresh PENDING request', async () => {
    const { prisma, repository } = build();
    prisma.pluginConsentRequest.findFirst
      .mockResolvedValueOnce(dbRow({ status: 'APPROVED', choice: 'ALLOW_ONCE' }))
      .mockResolvedValueOnce(dbRow({ argsHash: 'd'.repeat(64) }));
    const row = await repository.open({ ...INPUT, argsHash: 'd'.repeat(64) }, NOW);
    expect(prisma.pluginConsentRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REQUEST_ID, userId: OWNER, argsHash: HASH },
        data: expect.objectContaining({
          status: 'PENDING',
          choice: null,
          argsHash: 'd'.repeat(64),
        }),
      }),
    );
    expect(row.argsHash).toBe('d'.repeat(64));
  });

  it('open: a denied request with the same arguments stays denied (the model cannot ask its way past a no)', async () => {
    const { prisma, repository } = build();
    prisma.pluginConsentRequest.findFirst.mockResolvedValue(
      dbRow({ status: 'DENIED', choice: 'DENY' }),
    );
    const row = await repository.open(INPUT, NOW);
    expect(row.status).toBe(ConsentRequestState.DENIED);
    expect(prisma.pluginConsentRequest.updateMany).not.toHaveBeenCalled();
  });

  it('open: a first ask inserts with skipDuplicates, so two parallel first asks end with one row', async () => {
    const { prisma, repository } = build();
    prisma.pluginConsentRequest.createMany.mockResolvedValue({ count: 0 });
    const row = await repository.open(INPUT, NOW);
    expect(prisma.pluginConsentRequest.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(row.id).toBe(REQUEST_ID);
  });

  it('open: the same question under a NEW call id gets the already-open card, not a duplicate', async () => {
    const { prisma, repository } = build();
    prisma.pluginConsentRequest.findUnique.mockResolvedValue(dbRow({ pendingKey: 'k' }));
    const row = await repository.open({ ...INPUT, callId: 'call-other' }, NOW);
    expect(row.id).toBe(REQUEST_ID);
    expect(row.callId).toBe(CALL);
    expect(prisma.pluginConsentRequest.createMany).not.toHaveBeenCalled();
  });

  it('open: a lapsed open card is closed, freeing its key, and a fresh one is created', async () => {
    const { prisma, repository } = build();
    prisma.pluginConsentRequest.findUnique.mockResolvedValue(
      dbRow({ pendingKey: 'k', expiresAt: new Date(NOW.getTime() - 1000) }),
    );
    await repository.open({ ...INPUT, callId: 'call-other' }, NOW);
    expect(prisma.pluginConsentRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED', pendingKey: null } }),
    );
    expect(prisma.pluginConsentRequest.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ callId: 'call-other', pendingKey: expect.any(String) })],
      }),
    );
  });

  it('decide clears the open key so the same question can be asked again later', async () => {
    const { tx, repository } = build();
    await repository.decide({
      id: REQUEST_ID,
      userId: OWNER,
      now: NOW,
      status: ConsentRequestState.APPROVED,
      choice: CHOICE.ALLOW_ONCE,
      effect: { kind: 'NONE' },
    });
    expect(tx.pluginConsentRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pendingKey: null }) }),
    );
  });
});
