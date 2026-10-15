import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import type { AuthenticatedUser } from '@claw/shared-types';
import 'reflect-metadata';

import { PublicationListController } from '../publication-list.controller';

describe('PublicationListController', () => {
  const user = { id: 'user-1' } as AuthenticatedUser;

  function setup() {
    const lifecycle = { listOwned: vi.fn().mockResolvedValue([]) };
    const views = { listMine: vi.fn().mockResolvedValue([]) };
    const controller = new PublicationListController(lifecycle as never, views as never);
    return { controller, lifecycle, views };
  }

  it('maps the two list routes to fixed paths that the owner routes (`:publicationId/...`) cannot swallow', () => {
    const route = (method: keyof PublicationListController) => {
      const handler = PublicationListController.prototype[method];
      return [
        Reflect.getMetadata(METHOD_METADATA, handler),
        Reflect.getMetadata(PATH_METADATA, handler),
      ];
    };
    expect(route('listOwned')).toEqual([RequestMethod.GET, 'mine']);
    expect(route('listMyChangeRequests')).toEqual([RequestMethod.GET, 'change-requests/mine']);
  });

  it("lists only the signed-in person's own Threads", async () => {
    const { controller, lifecycle } = setup();
    await controller.listOwned(user);
    expect(lifecycle.listOwned).toHaveBeenCalledWith('user-1');
  });

  it("lists only the signed-in person's own suggestions, never another user's", async () => {
    const { controller, views } = setup();
    await controller.listMyChangeRequests(user);
    expect(views.listMine).toHaveBeenCalledTimes(1);
    expect(views.listMine).toHaveBeenCalledWith('user-1');
  });
});
