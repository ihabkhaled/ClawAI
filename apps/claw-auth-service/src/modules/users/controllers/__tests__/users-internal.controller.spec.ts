import { vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UsersInternalController } from '../users-internal.controller';
import { UsersService } from '../../services/users.service';
import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';

describe('UsersInternalController', () => {
  const usersMock = {
    getSpeechPreferences: vi.fn(),
    getIdentity: vi.fn(),
    getPublicProfiles: vi.fn(),
    getPublicProfileByUsername: vi.fn(),
  };
  let controller: UsersInternalController;

  beforeEach(async () => {
    usersMock.getSpeechPreferences.mockReset();
    usersMock.getIdentity.mockReset();
    usersMock.getPublicProfiles.mockReset();
    usersMock.getPublicProfileByUsername.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersInternalController],
      providers: [{ provide: UsersService, useValue: usersMock }],
    })
      .overrideGuard(ServiceTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(UsersInternalController);
  });

  it('delegates to the service and returns only the voice', async () => {
    usersMock.getSpeechPreferences.mockResolvedValue({ ttsVoice: 'nova' });
    await expect(controller.getSpeechPreferences('user-1')).resolves.toEqual({ ttsVoice: 'nova' });
    expect(usersMock.getSpeechPreferences).toHaveBeenCalledWith('user-1');
  });

  it('returns the name for the feedback snapshot', async () => {
    usersMock.getIdentity.mockResolvedValue({ firstName: 'Ada', lastName: 'Lovelace' });
    await expect(controller.getIdentity('user-1')).resolves.toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(usersMock.getIdentity).toHaveBeenCalledWith('user-1');
  });

  it('returns public profiles for a batch of ids', async () => {
    const profiles = [{ id: 'u1', username: 'ada', displayName: 'Ada Lovelace' }];
    usersMock.getPublicProfiles.mockResolvedValue(profiles);
    await expect(controller.getPublicProfiles({ ids: ['u1', 'u2'] })).resolves.toEqual(profiles);
    expect(usersMock.getPublicProfiles).toHaveBeenCalledWith(['u1', 'u2']);
  });

  it('resolves one username', async () => {
    const profile = { id: 'u1', username: 'Ada', displayName: 'Ada' };
    usersMock.getPublicProfileByUsername.mockResolvedValue(profile);
    await expect(controller.getPublicProfileByUsername('ada')).resolves.toEqual(profile);
    expect(usersMock.getPublicProfileByUsername).toHaveBeenCalledWith('ada');
  });

  it('declares by-username before the :id routes', () => {
    const names = Object.getOwnPropertyNames(UsersInternalController.prototype);
    expect(names.indexOf('getPublicProfileByUsername')).toBeLessThan(names.indexOf('getIdentity'));
  });

  it('requires the inter-service token', () => {
    const guards: unknown = Reflect.getMetadata(GUARDS_METADATA, UsersInternalController);
    expect(guards).toContain(ServiceTokenGuard);
  });
});
