import 'reflect-metadata';
import { vi } from 'vitest';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { FeedbackType } from '@claw/shared-types';

import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';
import { FeedbackPublicController } from '../feedback-public.controller';

import type { FeedbackService } from '../../services/feedback.service';
import type { CreatePublicFeedbackDto } from '../../dto/create-public-feedback.dto';

describe('FeedbackPublicController', () => {
  it('is public: no JWT, and no permission is demanded', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, FeedbackPublicController)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, FeedbackPublicController)).toBeUndefined();
  });

  it('hands the nginx-set address and the body to the service', async () => {
    const createPublicTicket = vi.fn().mockResolvedValue({ id: 'x' });
    const controller = new FeedbackPublicController({
      createPublicTicket,
    } as unknown as FeedbackService);
    const dto = { type: FeedbackType.BUG_REPORT } as CreatePublicFeedbackDto;

    await expect(
      controller.create({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.1.1.1' }, dto),
    ).resolves.toEqual({ id: 'x' });
    expect(createPublicTicket).toHaveBeenCalledWith('203.0.113.7', dto);
  });
});
