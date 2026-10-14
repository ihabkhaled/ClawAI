import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
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
    expect(isPublic('listReplies')).toBe(true);
    expect(isPublic('setCommentReaction')).not.toBe(true);
    expect(isPublic('removeCommentReaction')).not.toBe(true);
    expect(isPublic('getReactionSummary')).toBe(true);
    expect(isPublic('addComment')).not.toBe(true);
    expect(isPublic('setReaction')).not.toBe(true);
    expect(isPublic('removeReaction')).not.toBe(true);
    expect(isPublic('requestChange')).not.toBe(true);
    expect(isPublic('report')).not.toBe(true);
  });

  it('maps the new comment routes to the right verbs and paths', () => {
    const route = (method: keyof PublicationCommunityController) => {
      const handler = PublicationCommunityController.prototype[method];
      return [
        Reflect.getMetadata(METHOD_METADATA, handler),
        Reflect.getMetadata(PATH_METADATA, handler),
      ];
    };
    expect(route('listComments')).toEqual([RequestMethod.GET, 'comments']);
    expect(route('listReplies')).toEqual([RequestMethod.GET, 'comments/:rootId/replies']);
    expect(route('addComment')).toEqual([RequestMethod.POST, 'comments']);
    expect(route('setCommentReaction')).toEqual([
      RequestMethod.PUT,
      'comments/:commentId/reaction',
    ]);
    expect(route('removeCommentReaction')).toEqual([
      RequestMethod.DELETE,
      'comments/:commentId/reaction',
    ]);
  });

  it('delegates comment calls with the signed-in user and the optional viewer', async () => {
    const comments = {
      list: vi.fn().mockResolvedValue('page'),
      listReplies: vi.fn().mockResolvedValue('replies'),
      add: vi.fn().mockResolvedValue('added'),
      react: vi.fn().mockResolvedValue('reacted'),
      unreact: vi.fn().mockResolvedValue('unreacted'),
    };
    const controller = new PublicationCommunityController({} as never, comments as never);
    const user = { id: 'u1' } as never;

    await controller.listComments('s', { page: 2, pageSize: 10 }, undefined);
    await controller.listReplies('s', 'c1', { limit: 5 }, undefined);
    await controller.addComment('s', { content: 'hi', parentId: 'c1' }, user);
    await controller.setCommentReaction('s', 'c1', { value: 'LIKE' }, user);
    await controller.removeCommentReaction('s', 'c1', user);

    expect(comments.list).toHaveBeenCalledWith('s', { page: 2, pageSize: 10 }, undefined);
    expect(comments.listReplies).toHaveBeenCalledWith('s', 'c1', { limit: 5 }, undefined);
    expect(comments.add).toHaveBeenCalledWith('s', 'u1', { content: 'hi', parentId: 'c1' });
    expect(comments.react).toHaveBeenCalledWith('s', 'c1', 'u1', { value: 'LIKE' });
    expect(comments.unreact).toHaveBeenCalledWith('s', 'c1', 'u1');
  });

  it('requires the explicit Threads moderation permission for report access', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, PublicationModerationController)).toEqual([
      Permission.THREAD_PUBLICATIONS_MODERATE,
    ]);
  });
});
