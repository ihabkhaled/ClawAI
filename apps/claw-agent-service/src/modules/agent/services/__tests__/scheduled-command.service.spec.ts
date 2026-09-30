import { vi } from 'vitest';
import { BusinessException } from '../../../../common/errors/business.exception';
import { ScheduledCommandService } from '../scheduled-command.service';
import { createScheduledCommandSchema } from '../../dto/create-scheduled-command.dto';
import type { DeviceRepository } from '../../repositories/device.repository';
import type { ScheduledCommandRepository } from '../../repositories/scheduled-command.repository';

function partial<T extends object>(value: Partial<T>): T {
  return value as T;
}

function setup(device: { status: string } | null = { status: 'ACTIVE' }) {
  const repo = {
    create: vi.fn().mockImplementation((data: object) => Promise.resolve({ id: 'r1', ...data })),
  };
  const devices = { findByIdForUser: vi.fn().mockResolvedValue(device) };
  return {
    service: new ScheduledCommandService(
      partial<ScheduledCommandRepository>(repo),
      partial<DeviceRepository>(devices),
    ),
    repo,
    devices,
  };
}

describe('ScheduledCommandService.create', () => {
  it('creates a PROMPT routine with no device, de-duplicated labels', async () => {
    const { service, repo, devices } = setup();
    const dto = createScheduledCommandSchema.parse({
      kind: 'PROMPT',
      name: 'Nightly triage',
      prompt: '  Summarise failing tests  ',
      model: 'gemini-2.5-flash',
      repoRef: 'claw',
      runnerLabels: ['gpu', 'gpu'],
      intervalMinutes: 60,
    });
    await service.create('user-1', dto);
    expect(devices.findByIdForUser).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        kind: 'PROMPT',
        command: 'Summarise failing tests',
        model: 'gemini-2.5-flash',
        repoRef: 'claw',
        runnerLabels: ['gpu'],
        intervalMinutes: 60,
      }),
    );
    const data = repo.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(data['device']).toBeUndefined();
  });

  it('still creates a COMMAND routine when an older client omits kind', async () => {
    const { service, repo, devices } = setup();
    const dto = createScheduledCommandSchema.parse({
      deviceId: 'dev-1',
      name: 'tests',
      command: 'npm test',
      intervalMinutes: 30,
    });
    expect(dto.kind).toBe('COMMAND');
    await service.create('user-1', dto);
    expect(devices.findByIdForUser).toHaveBeenCalledWith('dev-1', 'user-1');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'COMMAND', device: { connect: { id: 'dev-1' } } }),
    );
  });

  it("refuses a COMMAND routine on another user's device (404)", async () => {
    const { service, repo } = setup(null);
    const dto = createScheduledCommandSchema.parse({
      deviceId: 'someone-elses',
      name: 'x',
      command: 'ls',
      intervalMinutes: 30,
    });
    await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(BusinessException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('createScheduledCommandSchema', () => {
  it('rejects a PROMPT routine whose repoRef is a path', () => {
    const parsed = createScheduledCommandSchema.safeParse({
      kind: 'PROMPT',
      name: 'x',
      prompt: 'y',
      repoRef: '../etc',
      intervalMinutes: 60,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an empty prompt and bad labels', () => {
    expect(
      createScheduledCommandSchema.safeParse({
        kind: 'PROMPT',
        name: 'x',
        prompt: '   ',
        intervalMinutes: 60,
      }).success,
    ).toBe(false);
    expect(
      createScheduledCommandSchema.safeParse({
        kind: 'PROMPT',
        name: 'x',
        prompt: 'y',
        runnerLabels: ['Not A Slug'],
        intervalMinutes: 60,
      }).success,
    ).toBe(false);
  });
});
