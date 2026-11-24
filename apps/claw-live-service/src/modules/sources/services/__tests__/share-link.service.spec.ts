import type * as PinnedRequestModule from '../../../../common/utilities/pinned-request.utility';
import { pinnedGet, PinnedRequestError } from '../../../../common/utilities/pinned-request.utility';
import { resolvePlatformUrl } from '../../utilities/platform-registry.utility';
import { ShareLinkService } from '../share-link.service';

vi.mock('../../../../common/utilities/pinned-request.utility', async (original) => ({
  ...(await original<typeof PinnedRequestModule>()),
  pinnedGet: vi.fn(),
}));

const get = vi.mocked(pinnedGet);
const share = () => {
  const resolved = resolvePlatformUrl(new URL('https://www.facebook.com/share/v/1DpSNW9BD1/'));
  if (resolved === null) throw new Error('share link not parsed');
  return resolved;
};

describe('ShareLinkService', () => {
  const guard = { assertSafeOnSuffixes: vi.fn().mockResolvedValue(['157.240.1.35']) };
  const service = new ShareLinkService(guard as never);

  beforeEach(() => {
    get.mockReset();
    guard.assertSafeOnSuffixes.mockClear();
  });

  it('follows the one redirect of a Facebook share link to the real video page', async () => {
    get.mockRejectedValue(
      new PinnedRequestError(
        'REDIRECT',
        'https://www.facebook.com/cairo24/videos/1631584275384746/?rdid=x&share_url=y',
      ),
    );
    const followed = await service.follow(share());
    expect(followed.match).toMatchObject({
      id: '1631584275384746',
      watchUrl: 'https://www.facebook.com/cairo24/videos/1631584275384746',
    });
    expect(guard.assertSafeOnSuffixes).toHaveBeenCalledWith(
      new URL('https://www.facebook.com/share/v/1DpSNW9BD1/'),
      ['facebook.com'],
    );
  });

  it.each([
    ['another host', 'https://evil.example/cairo24/videos/1631584275384746'],
    ['a look-alike host', 'https://facebook.com.evil.example/reel/4620908104798158'],
    ['plain http', 'http://www.facebook.com/reel/4620908104798158'],
    ['another share link', 'https://www.facebook.com/share/v/OTHERCODE1/'],
    ['a page that is no video', 'https://www.facebook.com/login/'],
  ])('keeps the share link when the redirect goes to %s', async (_label, location) => {
    get.mockRejectedValue(new PinnedRequestError('REDIRECT', location));
    const original = share();
    expect(await service.follow(original)).toBe(original);
  });

  it('keeps the share link when the page answers without a redirect or the request fails', async () => {
    const original = share();
    get.mockResolvedValue({} as never);
    expect(await service.follow(original)).toBe(original);
    get.mockRejectedValue(new PinnedRequestError('FAILED'));
    expect(await service.follow(original)).toBe(original);
  });

  it('never makes a request for a link that is not a share link', async () => {
    const reel = resolvePlatformUrl(new URL('https://www.facebook.com/reel/4620908104798158'));
    if (reel === null) throw new Error('reel not parsed');
    expect(await service.follow(reel)).toBe(reel);
    expect(get).not.toHaveBeenCalled();
  });
});
