import { FeedbackStatus, FeedbackType } from '@claw/shared-types';
import { vi } from 'vitest';

import { FeedbackSource } from '../../../../common/enums';
import { FeedbackManager } from '../feedback.manager';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ FILE_SERVICE_URL: 'https://file-service:4006' }) },
}));

const input = {
  externalKey: 'threads-generation:job-1',
  type: FeedbackType.BUG_REPORT,
  title: 'Threads generation failed at JUDGE (job job-1)',
  contentMarkdown: '| Field | Value |\n| --- | --- |\n| Job | job-1 |',
};

function build(existing: unknown = null) {
  const repository = {
    findByExternalKey: vi.fn().mockResolvedValue(existing),
    nextTicketNumber: vi.fn().mockResolvedValue('FDB-000042'),
    create: vi.fn().mockResolvedValue({ id: 'id-42', ticketNumber: 'FDB-000042' }),
  };
  const manager = new FeedbackManager(repository as never, {} as never);
  return { manager, repository };
}

describe('FeedbackManager system tickets', () => {
  it('opens an OPEN ticket from the system, not from a person', async () => {
    const { manager, repository } = build();

    await expect(manager.createSystemTicket(input)).resolves.toEqual({
      id: 'id-42',
      ticketNumber: 'FDB-000042',
      created: true,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        externalKey: 'threads-generation:job-1',
        source: FeedbackSource.SYSTEM,
        status: FeedbackStatus.OPEN,
        userId: null,
        reporterEmail: 'system@claw.local',
        attachments: [],
      }),
    );
  });

  it('returns the ticket it already opened when the event is redelivered', async () => {
    const { manager, repository } = build({ id: 'id-1', ticketNumber: 'FDB-000001' });

    await expect(manager.createSystemTicket(input)).resolves.toEqual({
      id: 'id-1',
      ticketNumber: 'FDB-000001',
      created: false,
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('records the system as the actor in the ticket history', async () => {
    const { manager, repository } = build();

    await manager.createSystemTicket(input);

    const created = repository.create.mock.calls[0]?.[0] as { history: Array<{ actorId: string }> };
    expect(created.history[0]?.actorId).toBe('system');
  });
});
