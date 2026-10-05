import { PublicationDiscoveryController } from '../publication-discovery.controller';
import { Locale } from '@claw/shared-types';

describe('PublicationDiscoveryController', () => {
  it('delegates public locale discovery queries', async () => {
    const discovery = { list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const controller = new PublicationDiscoveryController(discovery as never);
    const query = { locale: Locale.EN, limit: 10 };

    await expect(controller.list(query)).resolves.toEqual({ items: [], nextCursor: null });
    expect(discovery.list).toHaveBeenCalledWith(query);
  });

  it('delegates locale sitemap queries', async () => {
    const discovery = { sitemap: vi.fn().mockResolvedValue({ total: 0, items: [] }) };
    const controller = new PublicationDiscoveryController(discovery as never);
    const query = { locale: Locale.AR, page: 0, limit: 100 };

    await expect(controller.sitemap(query)).resolves.toEqual({ total: 0, items: [] });
    expect(discovery.sitemap).toHaveBeenCalledWith(query);
  });
});
