import type { AuthenticatedUser } from '@claw/shared-types';

import { PublicationRecommendedTeamController } from '../publication-recommended-team.controller';

describe('PublicationRecommendedTeamController', () => {
  it('answers with the authenticated caller own team and nothing else', async () => {
    const get = vi.fn().mockResolvedValue({ planName: 'Free', team: null, models: [] });
    const controller = new PublicationRecommendedTeamController({ get } as never);

    await expect(controller.get({ id: 'owner-1' } as AuthenticatedUser)).resolves.toEqual({
      planName: 'Free',
      team: null,
      models: [],
    });
    expect(get).toHaveBeenCalledWith('owner-1');
  });
});
