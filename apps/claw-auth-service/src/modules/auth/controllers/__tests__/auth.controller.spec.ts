import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../../../common/enums';

describe('AuthController', () => {
  let controller: AuthController;
  let serviceMock: jest.Mocked<{
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getProfile: jest.Mock;
  }>;

  beforeEach(async () => {
    serviceMock = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: serviceMock }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('login forwards email + password', async () => {
    const expected = {
      tokens: { accessToken: 'a', refreshToken: 'r' },
      user: { id: 'u1', email: 'a@b' },
    };
    serviceMock.login.mockResolvedValue(expected);
    const result = await controller.login({ email: 'a@b', password: 'p' });
    expect(serviceMock.login).toHaveBeenCalledWith('a@b', 'p');
    expect(result).toBe(expected);
  });

  it('refresh forwards token', async () => {
    const expected = { tokens: { accessToken: 'a', refreshToken: 'r' } };
    serviceMock.refresh.mockResolvedValue(expected);
    const result = await controller.refresh({ refreshToken: 'old' });
    expect(serviceMock.refresh).toHaveBeenCalledWith('old');
    expect(result).toBe(expected);
  });

  it('logout forwards user.id', async () => {
    await controller.logout({ id: 'u1', email: 'a', role: UserRole.OPERATOR } as never);
    expect(serviceMock.logout).toHaveBeenCalledWith('u1');
  });

  it('me returns profile from service', async () => {
    const profile = { id: 'u1', email: 'a@b' };
    serviceMock.getProfile.mockResolvedValue(profile);
    const result = await controller.me({ id: 'u1' } as never);
    expect(result).toBe(profile);
  });
});
