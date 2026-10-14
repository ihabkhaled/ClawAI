import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';

import { ConsentRequestState } from '../../../../common/enums/consent-request-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import {
  CHOICE,
  OWNER,
  REQUEST_ID,
  requestRow,
  STRANGER,
} from '../../__tests__/consent-card-fixtures';
import { ConsentRequestsService } from '../consent-requests.service';

function build(row = requestRow()) {
  let current = row;
  const requests = {
    findOwned: vi.fn(async (userId: string, id: string) =>
      userId === current.userId && id === current.id ? current : null,
    ),
    listPending: vi.fn().mockResolvedValue([row]),
    markExpired: vi.fn().mockResolvedValue(undefined),
    decide: vi.fn().mockResolvedValue(true),
  };
  const grants = {
    listActive: vi.fn().mockResolvedValue([]),
    revoke: vi.fn().mockResolvedValue(true),
  };
  const service = new ConsentRequestsService(requests as never, grants as never);
  return {
    service,
    requests,
    grants,
    set: (next: typeof row) => {
      current = next;
    },
  };
}

describe('ConsentRequestsService (consent card decisions)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T10:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('card: Allow once approves with no stored side effect', async () => {
    const { service, requests } = build();
    await service.decide(OWNER, REQUEST_ID, {
      choice: CHOICE.ALLOW_ONCE,
      confirmDestructive: false,
    });
    expect(requests.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ConsentRequestState.APPROVED,
        choice: CHOICE.ALLOW_ONCE,
        effect: { kind: 'NONE' },
      }),
    );
  });

  it('card: Deny records DENIED and stores nothing else', async () => {
    const { service, requests } = build();
    await service.decide(OWNER, REQUEST_ID, { choice: CHOICE.DENY, confirmDestructive: false });
    expect(requests.decide).toHaveBeenCalledWith(
      expect.objectContaining({ status: ConsentRequestState.DENIED, effect: { kind: 'NONE' } }),
    );
  });

  it('card: Allow for this chat stores a conversation-scoped grant pinned to the install and tool', async () => {
    const { service, requests } = build();
    await service.decide(OWNER, REQUEST_ID, {
      choice: CHOICE.ALLOW_CHAT,
      confirmDestructive: false,
    });
    const effect = requests.decide.mock.calls[0]?.[0].effect;
    expect(effect).toMatchObject({
      kind: 'CHAT_GRANT',
      conversationId: 'thread-1',
      targetKey: '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10',
      toolName: 'create_note',
    });
  });

  it('card: Allow for this chat is refused when there is no conversation or the tool is destructive', async () => {
    const noChat = build(requestRow({ conversationId: null }));
    await expect(
      noChat.service.decide(OWNER, REQUEST_ID, {
        choice: CHOICE.ALLOW_CHAT,
        confirmDestructive: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const destructive = build(requestRow({ riskLevel: RiskLevel.DESTRUCTIVE }));
    await expect(
      destructive.service.decide(OWNER, REQUEST_ID, {
        choice: CHOICE.ALLOW_CHAT,
        confirmDestructive: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(destructive.requests.decide).not.toHaveBeenCalled();
  });

  it('card: Always allow stores the install consent for a WRITE tool', async () => {
    const { service, requests } = build();
    await service.decide(OWNER, REQUEST_ID, {
      choice: CHOICE.ALWAYS_ALLOW,
      confirmDestructive: false,
    });
    expect(requests.decide.mock.calls[0]?.[0].effect).toMatchObject({
      kind: 'INSTALL_CONSENT',
      riskLevel: RiskLevel.WRITE,
      confirmedDestructive: false,
    });
  });

  it('card: Always allow on a DESTRUCTIVE tool needs the second confirmation', async () => {
    const { service, requests } = build(requestRow({ riskLevel: RiskLevel.DESTRUCTIVE }));
    await expect(
      service.decide(OWNER, REQUEST_ID, { choice: CHOICE.ALWAYS_ALLOW, confirmDestructive: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(requests.decide).not.toHaveBeenCalled();
    await service.decide(OWNER, REQUEST_ID, {
      choice: CHOICE.ALWAYS_ALLOW,
      confirmDestructive: true,
    });
    expect(requests.decide.mock.calls[0]?.[0].effect).toMatchObject({
      kind: 'INSTALL_CONSENT',
      confirmedDestructive: true,
    });
  });

  it('card: Always allow on an own-server tool marks the server tool, WRITE only', async () => {
    const server = build(requestRow({ installId: null, serverId: 'srv-1' }));
    await server.service.decide(OWNER, REQUEST_ID, {
      choice: CHOICE.ALWAYS_ALLOW,
      confirmDestructive: false,
    });
    expect(server.requests.decide.mock.calls[0]?.[0].effect).toMatchObject({
      kind: 'SERVER_TOOL',
      serverId: 'srv-1',
      userId: OWNER,
    });
    const destructive = build(
      requestRow({ installId: null, serverId: 'srv-1', riskLevel: RiskLevel.DESTRUCTIVE }),
    );
    await expect(
      destructive.service.decide(OWNER, REQUEST_ID, {
        choice: CHOICE.ALWAYS_ALLOW,
        confirmDestructive: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cross-user: another user cannot read, decide or wait on the request (404, nothing written)', async () => {
    const { service, requests } = build();
    await expect(service.get(STRANGER, REQUEST_ID)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.decide(STRANGER, REQUEST_ID, {
        choice: CHOICE.ALLOW_ONCE,
        confirmDestructive: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.wait(STRANGER, REQUEST_ID, 0)).rejects.toBeInstanceOf(NotFoundException);
    expect(requests.decide).not.toHaveBeenCalled();
  });

  it('expiry: a request past its deadline answers 410 and is marked EXPIRED, never approved', async () => {
    const { service, requests } = build(
      requestRow({ expiresAt: new Date('2026-10-15T09:59:00.000Z') }),
    );
    await expect(
      service.decide(OWNER, REQUEST_ID, { choice: CHOICE.ALLOW_ONCE, confirmDestructive: false }),
    ).rejects.toBeInstanceOf(GoneException);
    expect(requests.markExpired).toHaveBeenCalled();
    expect(requests.decide).not.toHaveBeenCalled();
  });

  it('replay: deciding an already-decided request with the same choice is a clean repeat, a different one is 409', async () => {
    const decided = requestRow({ status: ConsentRequestState.APPROVED, choice: CHOICE.ALLOW_ONCE });
    const { service, requests } = build(decided);
    const again = await service.decide(OWNER, REQUEST_ID, {
      choice: CHOICE.ALLOW_ONCE,
      confirmDestructive: false,
    });
    expect(again.status).toBe(ConsentRequestState.APPROVED);
    await expect(
      service.decide(OWNER, REQUEST_ID, { choice: CHOICE.DENY, confirmDestructive: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(requests.decide).not.toHaveBeenCalled();
  });

  it('concurrent approvals: the loser of the conditional update gets the winner state, not a second effect', async () => {
    const { service, requests, set } = build();
    requests.decide.mockImplementationOnce(async () => {
      set(requestRow({ status: ConsentRequestState.APPROVED, choice: CHOICE.ALLOW_ONCE }));
      return false;
    });
    const same = await service.decide(OWNER, REQUEST_ID, {
      choice: CHOICE.ALLOW_ONCE,
      confirmDestructive: false,
    });
    expect(same.status).toBe(ConsentRequestState.APPROVED);

    set(requestRow());
    requests.decide.mockImplementationOnce(async () => {
      set(requestRow({ status: ConsentRequestState.DENIED, choice: CHOICE.DENY }));
      return false;
    });
    await expect(
      service.decide(OWNER, REQUEST_ID, { choice: CHOICE.ALLOW_ONCE, confirmDestructive: false }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reconnect: the open questions come back from the list after the stream dropped', async () => {
    const { service, requests } = build();
    const pending = await service.listPending(OWNER, 'thread-1');
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ id: REQUEST_ID, status: ConsentRequestState.PENDING });
    expect(pending[0]).not.toHaveProperty('argsHash');
    expect(pending[0]).not.toHaveProperty('callId');
    expect(requests.listPending).toHaveBeenCalledWith(OWNER, expect.any(Date), 20, 'thread-1');
  });

  it('reconnect: a wait that starts after the user already answered returns at once', async () => {
    const { service } = build(
      requestRow({ status: ConsentRequestState.DENIED, choice: CHOICE.DENY }),
    );
    const view = await service.wait(OWNER, REQUEST_ID, 20_000);
    expect(view.status).toBe(ConsentRequestState.DENIED);
  });

  it('wait: a still-pending request returns PENDING when the bounded wait runs out', async () => {
    vi.useRealTimers();
    const { service } = build();
    const view = await service.wait(OWNER, REQUEST_ID, 30);
    expect(view.status).toBe(ConsentRequestState.PENDING);
  });

  it('chat grants: revoke is owner-scoped and a missing grant is 404', async () => {
    const { service, grants } = build();
    await service.revokeGrant(OWNER, REQUEST_ID);
    expect(grants.revoke).toHaveBeenCalledWith(OWNER, REQUEST_ID);
    grants.revoke.mockResolvedValueOnce(false);
    await expect(service.revokeGrant(STRANGER, REQUEST_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
