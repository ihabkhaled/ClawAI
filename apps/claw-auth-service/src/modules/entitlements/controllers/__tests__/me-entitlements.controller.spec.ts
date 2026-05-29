import { Test, type TestingModule } from '@nestjs/testing';
import { MeEntitlementsController } from '../me-entitlements.controller';
import { EntitlementsService } from '../../services/entitlements.service';
import { UserRole } from '../../../../common/enums';

describe('MeEntitlementsController', () => {
  let controller: MeEntitlementsController;
  let serviceMock: jest.Mocked<{ getForUser: jest.Mock }>;

  beforeEach(async () => {
    serviceMock = { getForUser: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeEntitlementsController],
      providers: [{ provide: EntitlementsService, useValue: serviceMock }],
    }).compile();
    controller = module.get<MeEntitlementsController>(MeEntitlementsController);
  });

  it('resolves entitlements for the authenticated user only', async () => {
    const expected = {
      userId: 'u1',
      role: 'USER',
      isAdmin: false,
      permissions: ['CHAT_USE'],
      plan: null,
      allowedModels: [],
      allowedProviders: [],
      quota: { dailyLimit: 50000, used: 0, remaining: 50000, unlimited: false },
    };
    serviceMock.getForUser.mockResolvedValue(expected);

    const result = await controller.getMyEntitlements({
      id: 'u1',
      email: 'a@b',
      role: UserRole.USER,
    } as never);

    // Must derive the id from the token's user, never from a client-supplied param.
    expect(serviceMock.getForUser).toHaveBeenCalledWith('u1');
    expect(result).toBe(expected);
  });
});
