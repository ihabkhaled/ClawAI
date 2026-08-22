import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../../services/users.service';
import { UserRole } from '../../../../common/enums';
import { Permission } from '@claw/shared-types';
import { PERMISSIONS_KEY } from '../../../../app/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';
import { EmailChangeService } from '../../../auth/services/email-change.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersMock: jest.Mocked<{
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    updateUser: jest.Mock;
    deactivateUser: jest.Mock;
    reactivateUser: jest.Mock;
    changeRole: jest.Mock;
    changePassword: jest.Mock;
    updatePreferences: jest.Mock;
    updateOwnProfile: jest.Mock;
    deleteOwnAccount: jest.Mock;
  }>;
  let emailChangeMock: jest.Mocked<{
    requestEmailChange: jest.Mock;
    verifyCurrentEmail: jest.Mock;
    resendCurrentEmailOtp: jest.Mock;
    getPendingEmailChange: jest.Mock;
    cancelEmailChange: jest.Mock;
  }>;

  beforeEach(async () => {
    usersMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      updateUser: jest.fn(),
      deactivateUser: jest.fn(),
      reactivateUser: jest.fn(),
      changeRole: jest.fn(),
      changePassword: jest.fn(),
      updatePreferences: jest.fn(),
      updateOwnProfile: jest.fn(),
      deleteOwnAccount: jest.fn(),
    };
    emailChangeMock = {
      requestEmailChange: jest.fn(),
      verifyCurrentEmail: jest.fn(),
      resendCurrentEmailOtp: jest.fn(),
      getPendingEmailChange: jest.fn(),
      cancelEmailChange: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersMock },
        { provide: EmailChangeService, useValue: emailChangeMock },
      ],
    }).compile();
    controller = module.get<UsersController>(UsersController);
  });

  const adminUser = { id: 'admin-1', email: 'a@b', role: UserRole.ADMIN };

  it('create forwards body to service.create', async () => {
    const dto = { email: 'a@b', username: 'a', password: 'PWord!1secure', role: UserRole.OPERATOR };
    usersMock.create.mockResolvedValue({ id: 'u1' });
    const result = await controller.create(dto as never);
    expect(usersMock.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'u1' });
  });

  it('findAll forwards query', async () => {
    const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    usersMock.findAll.mockResolvedValue(expected);
    const result = await controller.findAll({ page: 1, limit: 20 } as never);
    expect(usersMock.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result).toBe(expected);
  });

  it('updateMyPreferences forwards user.id and body', async () => {
    const dto = { languagePreference: 'EN' };
    usersMock.updatePreferences.mockResolvedValue({ id: 'u1' });
    await controller.updateMyPreferences(adminUser as never, dto as never);
    expect(usersMock.updatePreferences).toHaveBeenCalledWith('admin-1', dto);
  });

  it('changeMyPassword forwards user.id and body', async () => {
    const dto = { currentPassword: 'old-pass', newPassword: 'PWord!1new' };
    await controller.changeMyPassword(adminUser as never, dto as never);
    expect(usersMock.changePassword).toHaveBeenCalledWith('admin-1', dto);
  });

  it('updateMyProfile forwards the authenticated user id and body', async () => {
    const dto = { currentPassword: 'CurrentPass1!', username: 'renamed' };
    await controller.updateMyProfile(adminUser as never, dto);
    expect(usersMock.updateOwnProfile).toHaveBeenCalledWith('admin-1', dto);
  });

  it('deleteMyAccount forwards the authenticated user id and body', async () => {
    const dto = { currentPassword: 'CurrentPass1!' };
    await controller.deleteMyAccount(adminUser as never, dto);
    expect(usersMock.deleteOwnAccount).toHaveBeenCalledWith('admin-1', dto);
  });

  it('scopes email-change request creation to the authenticated user', async () => {
    const dto = { currentPassword: 'CurrentPass1!', newEmail: 'new@example.com' };
    await controller.requestEmailChange(adminUser as never, dto);
    expect(emailChangeMock.requestEmailChange).toHaveBeenCalledWith(
      'admin-1',
      dto.currentPassword,
      dto.newEmail,
    );
  });

  it('scopes email-change OTP verification to the authenticated user and request', async () => {
    await controller.verifyCurrentEmail(adminUser as never, {
      requestId: 'request-1',
      otp: '123456',
    });
    expect(emailChangeMock.verifyCurrentEmail).toHaveBeenCalledWith(
      'admin-1',
      'request-1',
      '123456',
    );
  });

  it('scopes email-change resend, read, and cancellation to the authenticated user', async () => {
    await controller.resendCurrentEmailOtp(adminUser as never, { requestId: 'request-1' });
    await controller.getPendingEmailChange(adminUser as never);
    await controller.cancelEmailChange(adminUser as never, { requestId: 'request-1' });

    expect(emailChangeMock.resendCurrentEmailOtp).toHaveBeenCalledWith('admin-1', 'request-1');
    expect(emailChangeMock.getPendingEmailChange).toHaveBeenCalledWith('admin-1');
    expect(emailChangeMock.cancelEmailChange).toHaveBeenCalledWith('admin-1', 'request-1');
  });

  it.each([
    'requestEmailChange',
    'verifyCurrentEmail',
    'resendCurrentEmailOtp',
    'getPendingEmailChange',
    'cancelEmailChange',
  ] as const)('%s remains authenticated and rate-limited', (methodName) => {
    const handler = UsersController.prototype[methodName];
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(5);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
  });

  it.each(['create', 'findAll', 'findOne', 'update', 'deactivate', 'reactivate', 'changeRole'])(
    '%s requires ADMIN_USERS_MANAGE',
    (methodName) => {
      const handler = UsersController.prototype[methodName as keyof UsersController];
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        Permission.ADMIN_USERS_MANAGE,
      ]);
    },
  );

  it('findOne forwards id', async () => {
    usersMock.findById.mockResolvedValue({ id: 'u1' });
    await controller.findOne('u1');
    expect(usersMock.findById).toHaveBeenCalledWith('u1');
  });

  it('update forwards id, body, and acting user id', async () => {
    const dto = { email: 'new@b' };
    await controller.update('u1', dto as never, adminUser as never);
    expect(usersMock.updateUser).toHaveBeenCalledWith('u1', dto, 'admin-1');
  });

  it('deactivate forwards id and acting user id', async () => {
    await controller.deactivate('u1', adminUser as never);
    expect(usersMock.deactivateUser).toHaveBeenCalledWith('u1', 'admin-1');
  });

  it('reactivate forwards id and acting user id', async () => {
    await controller.reactivate('u1', adminUser as never);
    expect(usersMock.reactivateUser).toHaveBeenCalledWith('u1', 'admin-1');
  });

  it('changeRole forwards id, role, and acting user id', async () => {
    await controller.changeRole('u1', { role: UserRole.OPERATOR } as never, adminUser as never);
    expect(usersMock.changeRole).toHaveBeenCalledWith('u1', UserRole.OPERATOR, 'admin-1');
  });
});
