import { vi, type Mock } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { HeadlessFetchAdapter } from '../headless-fetch.adapter';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));
vi.mock('playwright', () => ({
  chromium: { launch: vi.fn() },
}));

type RouteHandler = (route: {
  request: () => { url: () => string; resourceType: () => string };
  abort: () => Promise<void>;
  continue: () => Promise<void>;
}) => void;

const { chromium } = await vi.importMock('playwright') as {
  chromium: { launch: Mock };
};

/**
 * `chromium.launch` is mocked entirely — this suite proves the adapter's OWN
 * logic (one browser shared across calls, extraction reuses `extractHtml`,
 * every in-page request goes through the same anti-SSRF check the top-level
 * navigation gets), not Playwright's own behavior.
 */
describe('HeadlessFetchAdapter.fetchPage', () => {
  const appConfigGet = AppConfig.get as Mock;
  let adapter: HeadlessFetchAdapter;
  let newContextMock: Mock;
  let closeContextMock: Mock;
  let closeBrowserMock: Mock;
  let routeHandler: RouteHandler | null;
  let gotoMock: Mock;
  let urlMock: Mock;
  let contentMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({ RESEARCH_DOMAIN_ALLOWLIST: [] });
    routeHandler = null;

    gotoMock = vi.fn().mockResolvedValue({ status: () => 200 });
    urlMock = vi.fn().mockReturnValue('https://example.com/');
    contentMock = vi
      .fn()
      .mockResolvedValue(
        '<html><head><title>Rendered</title></head><body><p>Rendered content here</p></body></html>',
      );
    const fakePage = {
      route: vi.fn((_pattern: string, handler: RouteHandler) => {
        routeHandler = handler;
        return Promise.resolve();
      }),
      goto: gotoMock,
      url: urlMock,
      content: contentMock,
    };
    closeContextMock = vi.fn().mockResolvedValue(undefined);
    newContextMock = vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(fakePage),
      close: closeContextMock,
    });
    closeBrowserMock = vi.fn().mockResolvedValue(undefined);
    chromium.launch.mockResolvedValue({ newContext: newContextMock, close: closeBrowserMock });
    adapter = new HeadlessFetchAdapter();
  });

  it('renders the page and extracts its content', async () => {
    const result = await adapter.fetchPage({ url: 'https://example.com/' });

    expect(result.title).toBe('Rendered');
    expect(result.content).toContain('Rendered content here');
    expect(result.renderedWithHeadlessBrowser).toBe(true);
    expect(result.finalUrl).toBe('https://example.com/');
  });

  it('launches the browser only once across multiple fetches', async () => {
    await adapter.fetchPage({ url: 'https://example.com/a' });
    await adapter.fetchPage({ url: 'https://example.com/b' });

    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(newContextMock).toHaveBeenCalledTimes(2);
  });

  it('closes the browser context even when navigation throws', async () => {
    gotoMock.mockRejectedValue(new Error('navigation timeout'));

    await expect(adapter.fetchPage({ url: 'https://example.com/' })).rejects.toThrow(
      'navigation timeout',
    );
    expect(closeContextMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a private-host URL before opening a browser context', async () => {
    await expect(adapter.fetchPage({ url: 'http://127.0.0.1:8080/' })).rejects.toThrow(
      /private\/loopback/u,
    );
    expect(newContextMock).not.toHaveBeenCalled();
  });

  it('closes the shared browser on module destroy', async () => {
    await adapter.fetchPage({ url: 'https://example.com/' });
    await adapter.onModuleDestroy();

    expect(closeBrowserMock).toHaveBeenCalledTimes(1);
  });

  it('aborts an in-page request to a private host the page itself tries to reach', async () => {
    await adapter.fetchPage({ url: 'https://example.com/' });
    expect(routeHandler).not.toBeNull();

    const abort = vi.fn().mockResolvedValue(undefined);
    const continueRoute = vi.fn().mockResolvedValue(undefined);
    routeHandler?.({
      request: () => ({
        url: () => 'http://169.254.169.254/latest/meta-data/',
        resourceType: () => 'fetch',
      }),
      abort,
      continue: continueRoute,
    });

    expect(abort).toHaveBeenCalledTimes(1);
    expect(continueRoute).not.toHaveBeenCalled();
  });

  it('allows an in-page request to a safe public host', async () => {
    await adapter.fetchPage({ url: 'https://example.com/' });

    const abort = vi.fn().mockResolvedValue(undefined);
    const continueRoute = vi.fn().mockResolvedValue(undefined);
    routeHandler?.({
      request: () => ({ url: () => 'https://example.com/api/data', resourceType: () => 'xhr' }),
      abort,
      continue: continueRoute,
    });

    expect(continueRoute).toHaveBeenCalledTimes(1);
    expect(abort).not.toHaveBeenCalled();
  });

  it('aborts an image/media/font/stylesheet request regardless of host safety', async () => {
    await adapter.fetchPage({ url: 'https://example.com/' });

    const abort = vi.fn().mockResolvedValue(undefined);
    const continueRoute = vi.fn().mockResolvedValue(undefined);
    routeHandler?.({
      request: () => ({ url: () => 'https://example.com/logo.png', resourceType: () => 'image' }),
      abort,
      continue: continueRoute,
    });

    expect(abort).toHaveBeenCalledTimes(1);
    expect(continueRoute).not.toHaveBeenCalled();
  });

  it('re-checks the final URL after navigation, not just the requested one', async () => {
    urlMock.mockReturnValue('http://127.0.0.1:9999/internal');

    await expect(adapter.fetchPage({ url: 'https://example.com/' })).rejects.toThrow(
      /private\/loopback/u,
    );
  });
});
