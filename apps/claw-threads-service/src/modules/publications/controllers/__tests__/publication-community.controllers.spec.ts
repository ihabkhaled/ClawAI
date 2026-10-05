import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import 'reflect-metadata';

import { PublicationCommunityController } from '../publication-community.controller';
import { PublicationModerationController } from '../publication-moderation.controller';

describe('publication community route access', () => {
  it('leaves only public readers unauthenticated', () => {
    const isPublic = (method: string) =>
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        PublicationCommunityController.prototype[method as keyof PublicationCommunityController],
      );

    expect(isPublic('listComments')).toBe(true);
    expect(isPublic('getReactionSummary')).toBe(true);
    expect(isPublic('addComment')).not.toBe(true);
    expect(isPublic('setReaction')).not.toBe(true);
    expect(isPublic('removeReaction')).not.toBe(true);
    expect(isPublic('requestChange')).not.toBe(true);
    expect(isPublic('report')).not.toBe(true);
  });

  it('requires the explicit Threads moderation permission for report access', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, PublicationModerationController)).toEqual([
      Permission.THREAD_PUBLICATIONS_MODERATE,
    ]);
  });
});
