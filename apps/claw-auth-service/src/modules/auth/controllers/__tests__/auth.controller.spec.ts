import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../services/auth.service';
import { PasswordResetService } from '../../services/password-reset.service';
import { UserRole } from '../../../../common/enums';
import { SessionClientKind } from '../../enums/session-client-kind.enum';
import { EmailVerificationService } from '../../services/email-verification.service';
import { EmailChangeService } from '../../services/email-change.service';
import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  let serviceMock: {
    register: Mock;
    login: Mock;
    refresh: Mock;
    logout: Mock;
    getProfile: Mock;
  };
  let passwordResetServiceMock: {
    requestReset: Mock;
    confirmReset: Mock;
  };
  let emailChangeServiceMock: { confirmEmailChange: Mock };

  beforeEach(async () => {
    serviceMock = {
      register: vi.fn(),
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      getProfile: vi.fn(),
    };
    passwordResetServiceMock = {
      requestReset: vi.fn(),
      confirmReset: vi.fn(),
    };
    emailChangeServiceMock = { confirmEmailChange: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: serviceMock },
        { provide: PasswordResetService, useValue: passwordResetServiceMock },
        { provide: EmailChangeService, useValue: emailChangeServiceMock },
        {
          provide: EmailVerificationService,
          useValue: { resend: vi.fn(), verify: vi.fn() },
        },
      ],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('register forwards the whole DTO', async () => {
    const dto = {
      email: 'new@example.com',
      password: 'SecurePass1!',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+1234567890',
    };
    serviceMock.register.mockResolvedValue({ userId: 'u1', message: 'created' });

    await controller.register(dto);

    expect(serviceMock.register).toHaveBeenCalledWith(dto);
  });

  it('login forwards email + password', async () => {
    const expected = {
      tokens: { accessToken: 'a', refreshToken: 'r' },
      user: { id: 'u1', email: 'a@b' },
    };
    serviceMock.login.mockResolvedValue(expected);
    const result = await controller.login({ email: 'a@b', password: 'p' });
    expect(serviceMock.login).toHaveBeenCalledWith('a@b', 'p', {
      kind: SessionClientKind.WEB,
      name: 'ClawAI Web',
    });
    expect(result).toBe(expected);
  });

  it('forwards validated VS Code session provenance', async () => {
    serviceMock.login.mockResolvedValue({
      tokens: { accessToken: 'a', refreshToken: 'r' },
      user: { id: 'u1', email: 'a@b' },
    });

    await controller.login({
      email: 'a@b',
      password: 'p',
      clientKind: SessionClientKind.VSCODE,
      clientName: 'ClawAI for VS Code',
    });

    expect(serviceMock.login).toHaveBeenCalledWith('a@b', 'p', {
      kind: SessionClientKind.VSCODE,
      name: 'ClawAI for VS Code',
    });
  });

  it('refresh forwards token', async () => {
    const expected = { tokens: { accessToken: 'a', refreshToken: 'r' } };
    serviceMock.refresh.mockResolvedValue(expected);
    const result = await controller.refresh({ refreshToken: 'old' });
    expect(serviceMock.refresh).toHaveBeenCalledWith('old');
    expect(result).toBe(expected);
  });

  it('logout forwards the authenticated user and session IDs', async () => {
    await controller.logout({
      id: 'u1',
      email: 'a',
      role: UserRole.OPERATOR,
      sessionId: 'session-1',
    });
    expect(serviceMock.logout).toHaveBeenCalledWith('u1', 'session-1');
  });

  it('me returns profile from service', async () => {
    const profile = { id: 'u1', email: 'a@b' };
    serviceMock.getProfile.mockResolvedValue(profile);
    const result = await controller.me({ id: 'u1' } as never);
    expect(result).toBe(profile);
  });

  it('public email-change confirmation delegates the raw token', async () => {
    emailChangeServiceMock.confirmEmailChange.mockResolvedValue({ changed: true });

    await expect(controller.confirmEmailChange({ token: 'raw-token' })).resolves.toEqual({
      changed: true,
    });
    expect(emailChangeServiceMock.confirmEmailChange).toHaveBeenCalledWith('raw-token');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.confirmEmailChange)).toBe(
      true,
    );
  });
});
