import { PIPES_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';

import { UserRole } from '../../../../common/enums';
import { VscodeAuthorizationService } from '../../services/vscode-authorization.service';
import { VscodeAuthorizationController } from '../vscode-authorization.controller';

describe('VscodeAuthorizationController', () => {
  let controller: VscodeAuthorizationController;
  let authorizationMock: jest.Mocked<{
    approve: jest.Mock;
    details: jest.Mock;
    exchange: jest.Mock;
    initialize: jest.Mock;
  }>;

  beforeEach(async () => {
    authorizationMock = {
      approve: jest.fn(),
      details: jest.fn(),
      exchange: jest.fn(),
      initialize: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VscodeAuthorizationController],
      providers: [{ provide: VscodeAuthorizationService, useValue: authorizationMock }],
    }).compile();
    controller = module.get<VscodeAuthorizationController>(VscodeAuthorizationController);
  });

  it('validates only the request body instead of the authenticated user parameter', () => {
    expect(Reflect.getMetadata(PIPES_METADATA, controller.approve)).toBeUndefined();
  });

  it('approves the request for the authenticated user', async () => {
    const approval = {
      redirectUri: 'vscode://clawai.clawai-coding-agent/auth/callback?code=code&state=state',
    };
    authorizationMock.approve.mockResolvedValue(approval);

    await expect(
      controller.approve(
        { requestId: 'request-id' },
        {
          id: 'user-1',
          email: 'user@claw.local',
          role: UserRole.ADMIN,
          sessionId: 'session-1',
        },
      ),
    ).resolves.toBe(approval);
    expect(authorizationMock.approve).toHaveBeenCalledWith('request-id', 'user-1');
  });
});
