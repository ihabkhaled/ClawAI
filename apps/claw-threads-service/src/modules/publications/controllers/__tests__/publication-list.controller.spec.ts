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
    const ownerList = {
      list: vi
        .fn()
        .mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 }),
    };
    const controller = new PublicationListController(
      lifecycle as never,
      views as never,
      ownerList as never,
    );
    return { controller, lifecycle, views, ownerList };
  }

  it('maps the three list routes to fixed paths that the owner routes (`:publicationId/...`) cannot swallow', () => {
    const route = (method: keyof PublicationListController) => {
      const handler = PublicationListController.prototype[method];
      return [
        Reflect.getMetadata(METHOD_METADATA, handler),
        Reflect.getMetadata(PATH_METADATA, handler),
      ];
    };
    expect(route('listOwned')).toEqual([RequestMethod.GET, 'mine']);
    expect(route('listOwnedPage')).toEqual([RequestMethod.GET, 'mine/page']);
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

  it('the old mine endpoint is unchanged: it still returns the lifecycle list and ignores paging', async () => {
    const { controller, lifecycle, ownerList } = setup();
    await controller.listOwned(user);
    expect(lifecycle.listOwned).toHaveBeenCalledTimes(1);
    expect(ownerList.list).not.toHaveBeenCalled();
  });

  it('the paged list asks for the signed-in person only, with the validated query', async () => {
    const { controller, ownerList, lifecycle } = setup();
    const query = { page: 2, pageSize: 25, q: 'rust', status: 'READY' as const };
    await controller.listOwnedPage(query, user);
    expect(ownerList.list).toHaveBeenCalledWith('user-1', query);
    expect(lifecycle.listOwned).not.toHaveBeenCalled();
  });
});
