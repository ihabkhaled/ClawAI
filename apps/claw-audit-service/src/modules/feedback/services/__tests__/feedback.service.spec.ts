import { vi } from 'vitest';
import { FeedbackService } from '../feedback.service';

import type { FeedbackManager } from '../../managers/feedback.manager';
import type { FeedbackPublicManager } from '../../managers/feedback-public.manager';
import type { CreatePublicFeedbackDto } from '../../dto/create-public-feedback.dto';

describe('FeedbackService', () => {
  it('routes a public submission to the public manager only', async () => {
    const createTicket = vi.fn().mockResolvedValue({ id: 'p1' });
    const guarded = vi.fn();
    const service = new FeedbackService(
      { createTicket: guarded } as unknown as FeedbackManager,
      { createTicket } as unknown as FeedbackPublicManager,
    );
    const dto = {} as CreatePublicFeedbackDto;

    await expect(service.createPublicTicket('203.0.113.7', dto)).resolves.toEqual({ id: 'p1' });
    expect(createTicket).toHaveBeenCalledWith('203.0.113.7', dto);
    expect(guarded).not.toHaveBeenCalled();
  });

  it('routes an authenticated submission to the guarded manager only', async () => {
    const createTicket = vi.fn().mockResolvedValue({ id: 'a1' });
    const publicCreate = vi.fn();
    const service = new FeedbackService(
      { createTicket } as unknown as FeedbackManager,
      { createTicket: publicCreate } as unknown as FeedbackPublicManager,
    );

    await service.createTicket('u1', 'u@x.co', {} as never);
    expect(createTicket).toHaveBeenCalledWith('u1', 'u@x.co', {});
    expect(publicCreate).not.toHaveBeenCalled();
  });
});
