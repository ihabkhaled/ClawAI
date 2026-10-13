import { HttpException } from '@nestjs/common';

import {
  COMMENT_RATE_LIMIT_ERROR_CODE,
  COMMENT_RATE_LIMIT_MAX,
} from '../constants/comment-rate-limit.constants';
import { CommentRateLimitService } from '../services/comment-rate-limit.service';

describe('CommentRateLimitService', () => {
  it('allows a user under the limit', async () => {
    const repo = { countSince: vi.fn().mockResolvedValue(COMMENT_RATE_LIMIT_MAX - 1) };
    await expect(
      new CommentRateLimitService(repo as never).assertAllowed('u1'),
    ).resolves.toBeUndefined();
  });

  it('answers 429 with a coded body at the limit', async () => {
    const repo = { countSince: vi.fn().mockResolvedValue(COMMENT_RATE_LIMIT_MAX) };
    const error = await new CommentRateLimitService(repo as never)
      .assertAllowed('u1')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).getResponse()).toMatchObject({
      code: COMMENT_RATE_LIMIT_ERROR_CODE,
    });
  });
});
