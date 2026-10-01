import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { FeedbackType } from '@claw/shared-types';

import { FeedbackPublicManager } from '../feedback-public.manager';

import type { FeedbackRateLimitRepository } from '../../repositories/feedback-rate-limit.repository';
import type { FeedbackRepository } from '../../repositories/feedback.repository';
import type { CreatePublicFeedbackDto } from '../../dto/create-public-feedback.dto';

function setup(hits: { ip: number; email: number } = { ip: 1, email: 1 }): {
  manager: FeedbackPublicManager;
  repository: { create: Mock; nextTicketNumber: Mock };
  limits: { hitIp: Mock; hitEmail: Mock };
} {
  const repository = {
    create: vi.fn().mockResolvedValue({ id: 'abc123' }),
    nextTicketNumber: vi.fn().mockResolvedValue('FDB-000009'),
  };
  const limits = {
    hitIp: vi.fn().mockResolvedValue(hits.ip),
    hitEmail: vi.fn().mockResolvedValue(hits.email),
  };
  const manager = new FeedbackPublicManager(
    repository as unknown as FeedbackRepository,
    limits as unknown as FeedbackRateLimitRepository,
  );
  return { manager, repository, limits };
}

function dto(overrides: Partial<CreatePublicFeedbackDto> = {}): CreatePublicFeedbackDto {
  return {
    type: FeedbackType.BUG_REPORT,
    message: 'The pricing page is broken',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    ...overrides,
  };
}

describe('FeedbackPublicManager.createTicket', () => {
  it('stores a PUBLIC ticket with no user id and returns only the id', async () => {
    const { manager, repository } = setup();

    const result = await manager.createTicket(
      '203.0.113.7',
      dto({ pageUrl: 'https://claw.local/pricing', locale: 'en' }),
    );

    expect(result).toEqual({ id: 'abc123' });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'PUBLIC',
        userId: null,
        reporterName: 'Grace Hopper',
        reporterEmail: 'grace@example.com',
        status: 'OPEN',
        attachments: [],
        pageContext: { url: 'https://claw.local/pricing', locale: 'en' },
      }),
    );
  });

  it('never leaks the email, ticket number or status in the response', async () => {
    const { manager } = setup();
    const result = await manager.createTicket('203.0.113.7', dto());
    expect(JSON.stringify(result)).not.toContain('grace@example.com');
    expect(Object.keys(result)).toEqual(['id']);
  });

  it('derives a title from the message when none is given', async () => {
    const { manager, repository } = setup();
    await manager.createTicket('203.0.113.7', dto({ title: undefined }));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The pricing page is broken' }),
    );
  });

  it('derives a title when the form sent a blank one', async () => {
    const { manager, repository } = setup();
    await manager.createTicket('203.0.113.7', dto({ title: '' }));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The pricing page is broken' }),
    );
  });

  it('uses the given title when present', async () => {
    const { manager, repository } = setup();
    await manager.createTicket('203.0.113.7', dto({ title: 'Broken page' }));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Broken page' }),
    );
  });

  it('neutralises markup in the message and the name', async () => {
    const { manager, repository } = setup();
    await manager.createTicket(
      '203.0.113.7',
      dto({ message: '<script>x</script>', name: '<b>Eve</b>' }),
    );
    const stored = repository.create.mock.calls[0]?.[0] as Record<string, string>;
    expect(stored.contentMarkdown).not.toContain('<');
    expect(stored.reporterName).not.toContain('<');
  });

  it('omits page context when neither pageUrl nor locale is sent', async () => {
    const { manager, repository } = setup();
    await manager.createTicket('203.0.113.7', dto());
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ pageContext: undefined }),
    );
  });

  it('never takes a user id, role or source from the caller', async () => {
    const { manager, repository } = setup();
    await manager.createTicket('203.0.113.7', {
      ...dto(),
      userId: 'victim',
      role: 'ADMIN',
      source: 'AUTHENTICATED',
    } as unknown as CreatePublicFeedbackDto);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, source: 'PUBLIC' }),
    );
  });
});

describe('FeedbackPublicManager honeypot', () => {
  it('returns a normal-looking id, stores nothing and spends no rate budget', async () => {
    const { manager, repository, limits } = setup();

    const result = await manager.createTicket(
      '203.0.113.7',
      dto({ website: 'http://spam.example' }),
    );

    expect(result.id).toMatch(/^[0-9a-f]{24}$/);
    expect(repository.create).not.toHaveBeenCalled();
    expect(limits.hitIp).not.toHaveBeenCalled();
    expect(limits.hitEmail).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only honeypot as empty', async () => {
    const { manager, repository } = setup();
    await manager.createTicket('203.0.113.7', dto({ website: '   ' }));
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});

describe('FeedbackPublicManager rate limits', () => {
  it('allows the 5th hit from an address and the 3rd for an email', async () => {
    const { manager, repository } = setup({ ip: 5, email: 3 });
    await expect(manager.createTicket('203.0.113.7', dto())).resolves.toEqual({ id: 'abc123' });
    expect(repository.create).toHaveBeenCalled();
  });

  it('refuses the 6th hit from one address with 429 and stores nothing', async () => {
    const { manager, repository } = setup({ ip: 6, email: 1 });
    await expect(manager.createTicket('203.0.113.7', dto())).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: 'FEEDBACK_RATE_LIMITED',
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses the 4th hit for one email with the same 429', async () => {
    const { manager, repository } = setup({ ip: 1, email: 4 });
    await expect(manager.createTicket('203.0.113.7', dto())).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: 'FEEDBACK_RATE_LIMITED',
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('counts both budgets on every submission, keyed by address and email', async () => {
    const { manager, limits } = setup();
    await manager.createTicket('203.0.113.7', dto());
    expect(limits.hitIp).toHaveBeenCalledWith('203.0.113.7');
    expect(limits.hitEmail).toHaveBeenCalledWith('grace@example.com');
  });
});
