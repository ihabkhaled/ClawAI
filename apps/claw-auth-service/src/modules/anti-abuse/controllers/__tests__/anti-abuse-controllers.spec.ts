import { type Mock, vi } from 'vitest';
import { Permission } from '@claw/shared-types';

import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';
import { BotCheckController } from '../../../auth/controllers/bot-check.controller';
import { AUTH_RATE_LIMIT_METADATA_KEY } from '../../../auth/constants/auth-rate-limit.constants';
import { AuthRateLimitPolicy } from '../../../auth/enums/auth-rate-limit-policy.enum';
import { type BotCheckService } from '../../services/bot-check.service';
import { type LinkedAccountsService } from '../../services/linked-accounts.service';
import { AdminLinkedAccountsController } from '../admin-linked-accounts.controller';

describe('BotCheckController', () => {
  let getConfig: Mock;
  let issueChallenge: Mock;
  let controller: BotCheckController;

  beforeEach(() => {
    getConfig = vi.fn().mockResolvedValue({ pow: { enabled: true, difficulty: 18 } });
    issueChallenge = vi.fn().mockResolvedValue({ token: 't' });
    controller = new BotCheckController({
      getConfig,
      issueChallenge,
    } as unknown as BotCheckService);
  });

  it('delegates config with the requested action and the challenge as is', async () => {
    await controller.config({});
    await controller.config({ action: 'login' as never });
    await controller.challenge();
    expect(getConfig).toHaveBeenNthCalledWith(1, undefined);
    expect(getConfig).toHaveBeenNthCalledWith(2, 'login');
    expect(issueChallenge).toHaveBeenCalledTimes(1);
  });

  it('keeps both routes public and under their own rate-limit policies', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, BotCheckController.prototype.config)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, BotCheckController.prototype.challenge)).toBe(true);
    expect(
      Reflect.getMetadata(AUTH_RATE_LIMIT_METADATA_KEY, BotCheckController.prototype.config),
    ).toBe(AuthRateLimitPolicy.BOT_CHECK_CONFIG);
    expect(
      Reflect.getMetadata(AUTH_RATE_LIMIT_METADATA_KEY, BotCheckController.prototype.challenge),
    ).toBe(AuthRateLimitPolicy.BOT_CHECK_CHALLENGE);
  });
});

describe('AdminLinkedAccountsController', () => {
  it('delegates to the service and is ADMIN + ADMIN_USERS_MANAGE only', async () => {
    const list = vi.fn().mockResolvedValue({ accounts: [] });
    const controller = new AdminLinkedAccountsController({
      list,
    } as unknown as LinkedAccountsService);

    await expect(controller.list({ userId: 'u1' })).resolves.toEqual({ accounts: [] });
    expect(list).toHaveBeenCalledWith('u1');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AdminLinkedAccountsController)).toBeUndefined();
    const metadataKeys = Reflect.getMetadataKeys(AdminLinkedAccountsController) as string[];
    const values = metadataKeys.map((key) =>
      Reflect.getMetadata(key, AdminLinkedAccountsController),
    );
    expect(JSON.stringify(values)).toContain(Permission.ADMIN_USERS_MANAGE);
    expect(JSON.stringify(values)).toContain('ADMIN');
  });
});
