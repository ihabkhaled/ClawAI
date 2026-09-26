import { vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UsersInternalController } from '../users-internal.controller';
import { UsersService } from '../../services/users.service';
import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';

describe('UsersInternalController', () => {
  const usersMock = { getSpeechPreferences: vi.fn() };
  let controller: UsersInternalController;

  beforeEach(async () => {
    usersMock.getSpeechPreferences.mockReset();
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

  it('requires the inter-service token', () => {
    const guards: unknown = Reflect.getMetadata(GUARDS_METADATA, UsersInternalController);
    expect(guards).toContain(ServiceTokenGuard);
  });
});
