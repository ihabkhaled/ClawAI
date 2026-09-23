import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { FeedbackStatus, FeedbackType } from '@claw/shared-types';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';

import { FeedbackManager } from '../feedback.manager';

import type { FeedbackRepository } from '../../repositories/feedback.repository';

const FILE_SERVICE_URL = 'https://file-service:4006';

// Mutable so the URL-guard tests can point FILE_SERVICE_URL somewhere hostile.
const mockConfig = vi.hoisted(() => ({
  FILE_SERVICE_URL: 'https://file-service:4006',
  INTER_SERVICE_AUTH_TOKEN: 'test-token',
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => mockConfig,
  },
}));

// The manager is the only place that decides who may see what, so these are
// authorisation tests rather than unit tests of convenience. Each one describes
// an attack: a caller reaching for another tenant's data, or a file they do not
// own, or a state change the lifecycle forbids.

type RepositoryMock = {
  [K in keyof FeedbackRepository]: Mock;
};

function repositoryMock(): RepositoryMock {
  return {
    nextTicketNumber: vi.fn().mockResolvedValue('FDB-000001'),
    create: vi.fn().mockResolvedValue({ id: 'id-1', ticketNumber: 'FDB-000001', status: 'OPEN' }),
    findById: vi.fn(),
    findByIdForUser: vi.fn(),
    findByTicketNumber: vi.fn(),
    findPaginated: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    countsByStatus: vi.fn().mockResolvedValue({}),
    applyStatusChange: vi.fn().mockResolvedValue(undefined),
  } as unknown as RepositoryMock;
}

const listQuery = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt' as const,
  sortDir: 'desc' as const,
};

describe('feedback authorisation — cross-tenant reads', () => {
  it('scopes the own-ticket LIST to the caller inside the query', async () => {
    const repository = repositoryMock();
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await manager.listOwn('user-a', listQuery);

    // The regression this guards: userId was accepted by listOwn and then
    // dropped when the filter was built, so every caller saw every ticket.
    expect(repository.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-a' }),
    );
  });

  it('scopes the own-ticket READ to the caller inside the query, not after the fetch', async () => {
    const repository = repositoryMock();
    repository.findByIdForUser.mockResolvedValue(null);
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.getOwn('user-a', 'ticket-owned-by-b')).rejects.toMatchObject({
      code: 'FEEDBACK_NOT_FOUND',
    });
    expect(repository.findByIdForUser).toHaveBeenCalledWith('ticket-owned-by-b', 'user-a');
    // findById would return another tenant's ticket; it must not be used here.
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('answers a foreign ticket id with not-found, so ids cannot be enumerated', async () => {
    const repository = repositoryMock();
    repository.findByIdForUser.mockResolvedValue(null);
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.getOwn('user-a', 'any-id')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });
});

describe('feedback authorisation — attachments', () => {
  const attachment = {
    fileId: 'file-1',
    filename: 'shot.png',
    mimeType: 'image/png',
    sizeBytes: 1_024,
    isScreenshot: true,
  };

  function createDto(overrides: Record<string, unknown> = {}) {
    return {
      type: FeedbackType.BUG_REPORT,
      title: 'Title',
      contentMarkdown: 'body',
      attachments: [attachment],
      ...overrides,
    } as never;
  }

  function mockFileService(metadata: Record<string, unknown>, ok = true): void {
    mockFileServiceBody(JSON.stringify(metadata), ok);
  }

  // The manager reads the peer response as text and parses it itself, because
  // file-service does not always answer an ok status with a JSON body.
  function mockFileServiceBody(body: string, ok = true): void {
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      text: async () => body,
    }) as unknown as typeof fetch;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // file-service answers 200 with an empty body for an id that does not exist.
  // Before this was handled, referencing a bogus fileId crashed the request
  // with an unhandled SyntaxError, so the caller saw a 500 and the ownership
  // check never ran at all.
  it('refuses an attachment when the file service answers ok with an empty body', async () => {
    const repository = repositoryMock();
    mockFileServiceBody('');
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', createDto())).rejects.toMatchObject({
      code: 'FEEDBACK_ATTACHMENT_INVALID',
      status: HttpStatus.BAD_REQUEST,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses an attachment when the file service answers ok with a non-JSON body', async () => {
    const repository = repositoryMock();
    mockFileServiceBody('<html>gateway error</html>');
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', createDto())).rejects.toMatchObject({
      code: 'FEEDBACK_ATTACHMENT_INVALID',
    });
  });

  it('refuses an attachment when the file service answers ok with JSON null', async () => {
    const repository = repositoryMock();
    mockFileServiceBody('null');
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', createDto())).rejects.toMatchObject({
      code: 'FEEDBACK_ATTACHMENT_INVALID',
    });
  });

  it('refuses metadata that is missing the owner, rather than reading undefined', async () => {
    const repository = repositoryMock();
    mockFileService({
      id: 'file-1',
      filename: 'shot.png',
      mimeType: 'image/png',
      sizeBytes: 1_024,
    });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', createDto())).rejects.toMatchObject({
      code: 'FEEDBACK_ATTACHMENT_INVALID',
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses a file that belongs to another user', async () => {
    const repository = repositoryMock();
    mockFileService({
      id: 'file-1',
      userId: 'someone-else',
      filename: 'shot.png',
      mimeType: 'image/png',
      sizeBytes: 1_024,
    });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', createDto())).rejects.toMatchObject({
      code: 'FEEDBACK_ATTACHMENT_INVALID',
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses a file whose real type is not an allowed image, whatever the request claimed', async () => {
    const repository = repositoryMock();
    mockFileService({
      id: 'file-1',
      userId: 'user-a',
      filename: 'payload.html',
      mimeType: 'text/html',
      sizeBytes: 10,
    });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', createDto())).rejects.toMatchObject({
      code: 'FEEDBACK_ATTACHMENT_INVALID',
    });
  });

  it('refuses a file larger than the cap, whatever size the request claimed', async () => {
    const repository = repositoryMock();
    mockFileService({
      id: 'file-1',
      userId: 'user-a',
      filename: 'huge.png',
      mimeType: 'image/png',
      sizeBytes: 500 * 1_024 * 1_024,
    });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', createDto())).rejects.toMatchObject({
      code: 'FEEDBACK_ATTACHMENT_INVALID',
    });
  });

  it('stores the file service metadata, never the caller-supplied claim', async () => {
    const repository = repositoryMock();
    mockFileService({
      id: 'file-1',
      userId: 'user-a',
      filename: 'real-name.png',
      mimeType: 'image/png',
      sizeBytes: 2_048,
    });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await manager.createTicket(
      'user-a',
      'a@test',
      createDto({
        attachments: [
          { ...attachment, filename: 'lie.svg', mimeType: 'image/svg+xml', sizeBytes: 1 },
        ],
      }),
    );

    const storedCall = repository.create.mock.calls[0];
    expect(storedCall).toBeDefined();
    const stored = storedCall?.[0].attachments[0];
    expect(stored.mimeType).toBe('image/png');
    expect(stored.filename).toBe('real-name.png');
    expect(stored.sizeBytes).toBe(2_048);
  });

  it('reduces a traversal-shaped filename to its basename', async () => {
    const repository = repositoryMock();
    mockFileService({
      id: 'file-1',
      userId: 'user-a',
      filename: '../../etc/passwd.png',
      mimeType: 'image/png',
      sizeBytes: 10,
    });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await manager.createTicket('user-a', 'a@test', createDto());

    const storedCall = repository.create.mock.calls[0];
    expect(storedCall).toBeDefined();
    const stored = storedCall?.[0].attachments[0];
    expect(stored.filename).toBe('passwd.png');
    expect(stored.filename).not.toContain('..');
    expect(stored.filename).not.toContain('/');
  });

  it('refuses to stream a file that is not attached to the ticket', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue({ attachments: [{ fileId: 'file-1' }] });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(
      manager.streamAttachment('ticket-1', 'file-belonging-elsewhere', {} as never),
    ).rejects.toMatchObject({ code: 'FEEDBACK_NOT_FOUND' });
  });
});

describe('feedback lifecycle — only declared transitions are possible', () => {
  const cases: ReadonlyArray<[FeedbackStatus, FeedbackStatus, boolean]> = [
    [FeedbackStatus.OPEN, FeedbackStatus.IN_PROGRESS, true],
    [FeedbackStatus.OPEN, FeedbackStatus.RESOLVED, true],
    [FeedbackStatus.IN_PROGRESS, FeedbackStatus.RESOLVED, true],
    [FeedbackStatus.RESOLVED, FeedbackStatus.CLOSED, true],
    [FeedbackStatus.RESOLVED, FeedbackStatus.OPEN, true],
    [FeedbackStatus.CLOSED, FeedbackStatus.ARCHIVED, true],
    [FeedbackStatus.ARCHIVED, FeedbackStatus.OPEN, true],
    [FeedbackStatus.ARCHIVED, FeedbackStatus.RESOLVED, false],
    [FeedbackStatus.ARCHIVED, FeedbackStatus.CLOSED, false],
    [FeedbackStatus.CLOSED, FeedbackStatus.RESOLVED, false],
    [FeedbackStatus.IN_PROGRESS, FeedbackStatus.ARCHIVED, false],
  ];

  it.each(cases)('%s -> %s allowed=%s', async (from, to, allowed) => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue({ status: from, attachments: [] });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    const act = manager.changeStatus('admin-1', 'admin@test', 'ticket-1', {
      status: to,
    } as never);

    if (allowed) {
      await expect(act).resolves.toBeUndefined();
      expect(repository.applyStatusChange).toHaveBeenCalled();
    } else {
      await expect(act).rejects.toMatchObject({ code: 'FEEDBACK_INVALID_TRANSITION' });
      expect(repository.applyStatusChange).not.toHaveBeenCalled();
    }
  });

  it('stamps the matching timestamp and appends exactly one history entry', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue({ status: FeedbackStatus.OPEN, attachments: [] });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await manager.changeStatus('admin-1', 'admin@test', 'ticket-1', {
      status: FeedbackStatus.RESOLVED,
    } as never);

    const statusCall = repository.applyStatusChange.mock.calls[0];
    expect(statusCall).toBeDefined();
    const patch = statusCall?.[1];
    expect(patch.set.resolvedAt).toBeInstanceOf(Date);
    expect(patch.set.status).toBe(FeedbackStatus.RESOLVED);
    expect(patch.history).toMatchObject({
      action: 'STATUS_CHANGED',
      fromStatus: FeedbackStatus.OPEN,
      toStatus: FeedbackStatus.RESOLVED,
      actorId: 'admin-1',
      actorEmail: 'admin@test',
    });
  });

  it('records a reopen when a closed ticket returns to open', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue({ status: FeedbackStatus.CLOSED, attachments: [] });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await manager.changeStatus('admin-1', 'admin@test', 'ticket-1', {
      status: FeedbackStatus.OPEN,
    } as never);

    const statusCall = repository.applyStatusChange.mock.calls[0];
    expect(statusCall).toBeDefined();
    const patch = statusCall?.[1];
    expect(patch.set.reopenedAt).toBeInstanceOf(Date);
  });

  it('refuses a status change on a ticket that does not exist', async () => {
    const repository = repositoryMock();
    repository.findById.mockResolvedValue(null);
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(
      manager.changeStatus('admin-1', 'admin@test', 'nope', {
        status: FeedbackStatus.RESOLVED,
      } as never),
    ).rejects.toMatchObject({ code: 'FEEDBACK_NOT_FOUND' });
  });
});

describe('feedback content is sanitised before it is stored', () => {
  it('never persists raw markup, even though the renderer is already safe', async () => {
    const repository = repositoryMock();
    global.fetch = vi.fn() as unknown as typeof fetch;
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await manager.createTicket('user-a', 'a@test', {
      type: FeedbackType.SECURITY_CONCERN,
      title: 'Title',
      contentMarkdown: '<script>alert(1)</script> and [x](javascript:alert(1))',
    } as never);

    const storedCall = repository.create.mock.calls[0];
    expect(storedCall).toBeDefined();
    const stored = storedCall?.[0];
    expect(stored.contentMarkdown).not.toContain('<');
    expect(stored.contentMarkdown.toLowerCase()).not.toContain('javascript:');
    expect(stored.searchText).not.toContain('<');
  });
});

// TD-040. Both file-service calls carry the inter-service token, so the URL is
// checked before the token leaves the process. The first test runs with a
// CI-shaped environment — a GitHub runner defines `*_ENDPOINT` variables, which
// makes the host check ENFORCE rather than stand down — so it proves the real
// destination is still allowed, not merely that the check was skipped.
describe('feedback file-service calls go through the outbound URL guard', () => {
  const attachment = {
    fileId: 'file-1',
    filename: 'shot.png',
    mimeType: 'image/png',
    sizeBytes: 1_024,
    isScreenshot: true,
  };
  const dto = {
    type: FeedbackType.BUG_REPORT,
    title: 'Title',
    contentMarkdown: 'body',
    attachments: [attachment],
  } as never;

  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: 'file-1',
          userId: 'user-a',
          filename: 'shot.png',
          mimeType: 'image/png',
          sizeBytes: 1_024,
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    mockConfig.FILE_SERVICE_URL = FILE_SERVICE_URL;
    vi.unstubAllEnvs();
    resetInternalHostAllowlist();
    vi.restoreAllMocks();
  });

  it('reaches the configured file-service with enforcement on, and never follows a redirect', async () => {
    vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
    resetInternalHostAllowlist();
    const manager = new FeedbackManager(repositoryMock() as unknown as FeedbackRepository);

    await manager.createTicket('user-a', 'a@test', dto);

    const [target, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(target)).toBe(
      `${FILE_SERVICE_URL}/api/v1/internal/files/metadata-internal/file-1`,
    );
    expect(init.redirect).toBe('error');
  });

  it.each([
    ['a file: URL', 'file:///etc'],
    ['embedded credentials', 'https://user:pass@file-service:4006'],
    ['the cloud metadata address', 'http://169.254.169.254'],
  ])('refuses %s before the token is sent', async (_label, hostile) => {
    mockConfig.FILE_SERVICE_URL = hostile;
    const repository = repositoryMock();
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.createTicket('user-a', 'a@test', dto)).rejects.toThrow(/httpRequest/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses a hostile file-service URL when streaming an attachment, too', async () => {
    mockConfig.FILE_SERVICE_URL = 'http://169.254.169.254';
    const repository = repositoryMock();
    repository.findById.mockResolvedValue({ attachments: [attachment] });
    const manager = new FeedbackManager(repository as unknown as FeedbackRepository);

    await expect(manager.streamAttachment('ticket-1', 'file-1', {} as never)).rejects.toMatchObject(
      { code: 'FEEDBACK_ATTACHMENT_UNAVAILABLE' },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
