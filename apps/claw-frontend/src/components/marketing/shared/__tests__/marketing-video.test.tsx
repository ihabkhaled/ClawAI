import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketingVideo } from '@/components/marketing/shared/marketing-video';
import { MarketingVideoGallery } from '@/components/marketing/shared/marketing-video-gallery';
import { MarketingVideoSection } from '@/components/marketing/shared/marketing-video-section';
import { YouTubeShortFacade } from '@/components/marketing/shared/youtube-short-facade';
import { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import { MarketingVideoLayout } from '@/enums/marketing-video-layout.enum';
import { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import type {
  MarketingLocalVideoView,
  MarketingShortVideoView,
} from '@/types/marketing-videos.types';
import { buildYouTubeEmbedUrl } from '@/utilities/marketing-videos.utility';

const headerState = vi.hoisted(() => ({ locale: 'en' as string | null }));

vi.mock('next/headers', () => ({
  headers: async (): Promise<{ get: () => string | null }> => ({
    get: (): string | null => headerState.locale,
  }),
}));

const SHORT: MarketingShortVideoView = {
  kind: MarketingVideoKind.SHORT,
  id: 'ZuKqBODBH2k',
  thumbnailSrc: '/marketing/videos/shorts/ZuKqBODBH2k.jpg',
  title: 'ClawAI overview',
  playLabel: 'Play video: ClawAI overview',
  frameTitle: 'ClawAI overview (YouTube video)',
  embedUrl: buildYouTubeEmbedUrl('ZuKqBODBH2k'),
};

const LOCAL: MarketingLocalVideoView = {
  kind: MarketingVideoKind.LOCAL,
  id: 'clawai-part-1',
  src: '/marketing/videos/clawai-part-1.mp4',
  posterSrc: '/marketing/videos/clawai-part-1-poster.jpg',
  width: 1280,
  height: 720,
  title: 'ClawAI Threads video, part 1 of 3',
  description: 'One of three short clips from ClawAI Threads.',
  durationLabel: '10 seconds',
};

beforeEach(() => {
  headerState.locale = 'en';
});

describe('YouTubeShortFacade', () => {
  it('shows a named play button and no iframe before the click', () => {
    const { container } = render(<YouTubeShortFacade short={SHORT} />);

    expect(screen.getByRole('button', { name: SHORT.playLabel })).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toContain('youtube');
  });

  it('shows our own thumbnail, not a YouTube one', () => {
    const { container } = render(<YouTubeShortFacade short={SHORT} />);
    const image = container.querySelector('img');

    expect(decodeURIComponent(image?.getAttribute('src') ?? '')).toContain(SHORT.thumbnailSrc);
  });

  it('shows the title as given and no language badge', () => {
    const { container } = render(<YouTubeShortFacade short={SHORT} />);

    expect(screen.getByText(SHORT.title)).toBeInTheDocument();
    expect(container.querySelectorAll('figcaption > span')).toHaveLength(1);
  });

  it('keeps the focus ring inside the clipped box so it stays visible', () => {
    render(<YouTubeShortFacade short={SHORT} />);

    expect(screen.getByRole('button', { name: SHORT.playLabel }).className).toContain(
      'focus-visible:ring-inset',
    );
  });

  it('swaps the button for the privacy-enhanced iframe on click', async () => {
    const user = userEvent.setup();
    const { container } = render(<YouTubeShortFacade short={SHORT} />);

    await user.click(screen.getByRole('button', { name: SHORT.playLabel }));

    const frame = container.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/ZuKqBODBH2k?autoplay=1&rel=0&playsinline=1',
    );
    expect(frame).toHaveAttribute('title', SHORT.frameTitle);
    expect(frame).toHaveAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    expect(frame).toHaveAttribute('loading', 'lazy');
    expect(screen.queryByRole('button', { name: SHORT.playLabel })).toBeNull();
  });

  it.each(['{Enter}', ' '])('starts from the keyboard with %j', async (key) => {
    const user = userEvent.setup();
    const { container } = render(<YouTubeShortFacade short={SHORT} />);

    await user.tab();
    expect(screen.getByRole('button', { name: SHORT.playLabel })).toHaveFocus();
    await user.keyboard(key);

    expect(container.querySelector('iframe')).not.toBeNull();
  });

  it('moves focus into the frame so keyboard users are not dropped', async () => {
    const user = userEvent.setup();
    const { container } = render(<YouTubeShortFacade short={SHORT} />);

    await user.click(screen.getByRole('button', { name: SHORT.playLabel }));

    expect(container.querySelector('iframe')).toHaveFocus();
  });

  it('reserves a 9:16 box so the swap shifts nothing', () => {
    const { container } = render(<YouTubeShortFacade short={SHORT} />);

    expect(container.querySelector('.aspect-\\[9\\/16\\]')).not.toBeNull();
  });
});

describe('MarketingVideo', () => {
  it('renders a named play button over a lazy poster and no video before the click', () => {
    const { container } = render(<MarketingVideo video={LOCAL} />);
    const image = container.querySelector('img');

    expect(screen.getByRole('button', { name: LOCAL.title })).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('source')).toBeNull();
    expect(container.innerHTML).not.toContain('.mp4');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(decodeURIComponent(image?.getAttribute('src') ?? '')).toContain(LOCAL.posterSrc);
  });

  it('swaps in the player on click and moves focus to it', async () => {
    const user = userEvent.setup();
    const { container } = render(<MarketingVideo video={LOCAL} />);

    await user.click(screen.getByRole('button', { name: LOCAL.title }));

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video?.autoplay).toBe(true);
    expect(video?.querySelector('source')).toHaveAttribute('src', LOCAL.src);
    expect(video).toHaveFocus();
    expect(screen.queryByRole('button', { name: LOCAL.title })).toBeNull();
  });

  it.each(['{Enter}', ' '])('starts from the keyboard with %j', async (key) => {
    const user = userEvent.setup();
    const { container } = render(<MarketingVideo video={LOCAL} />);

    await user.tab();
    expect(screen.getByRole('button', { name: LOCAL.title })).toHaveFocus();
    await user.keyboard(key);

    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('video')).toHaveFocus();
  });

  it('gives the player a name and points it at the visible description', async () => {
    const user = userEvent.setup();
    const { container } = render(<MarketingVideo video={LOCAL} />);
    const description = container.querySelector(`#${LOCAL.id}-description`);

    expect(screen.getByRole('button', { name: LOCAL.title })).toHaveAttribute(
      'aria-describedby',
      `${LOCAL.id}-description`,
    );
    await user.click(screen.getByRole('button', { name: LOCAL.title }));
    const video = container.querySelector('video');

    expect(video).toHaveAttribute('aria-label', LOCAL.title);
    expect(video).toHaveAttribute('aria-describedby', `${LOCAL.id}-description`);
    expect(description).toHaveTextContent(LOCAL.description);
    expect(description).toHaveTextContent('10 seconds');
    expect(description).not.toHaveTextContent('Step');
  });

  it('keeps the focus ring inside the clipped box on the button and the player', async () => {
    const user = userEvent.setup();
    const { container } = render(<MarketingVideo video={LOCAL} />);

    expect(screen.getByRole('button', { name: LOCAL.title }).className).toContain(
      'focus-visible:ring-inset',
    );
    await user.click(screen.getByRole('button', { name: LOCAL.title }));

    expect(container.querySelector('video')?.className).toContain('focus-visible:ring-inset');
  });

  it('reserves a 16:9 box with no fixed pixel height', () => {
    const { container } = render(<MarketingVideo video={LOCAL} />);

    expect(container.querySelector('.aspect-video')).not.toBeNull();
    expect(container.innerHTML).not.toMatch(/\bh-\[\d+px\]|height:\s*\d+px/u);
  });
});

describe('MarketingVideoGallery', () => {
  it('lays the clips out as an ordered list of parts', () => {
    render(
      <MarketingVideoGallery
        layout={MarketingVideoLayout.STEPS}
        items={[LOCAL, { ...LOCAL, id: 'b' }]}
      />,
    );

    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('lays Shorts out as a list of facades', () => {
    render(<MarketingVideoGallery layout={MarketingVideoLayout.SHORTS} items={[SHORT]} />);

    expect(screen.getByRole('button', { name: SHORT.playLabel })).toBeInTheDocument();
    expect(screen.getByRole('list').tagName).toBe('UL');
  });

  it('shows a feature explainer as a single play button, with no player yet', () => {
    const { container } = render(
      <MarketingVideoGallery layout={MarketingVideoLayout.FEATURE} items={[LOCAL]} />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container.querySelectorAll('video')).toHaveLength(0);
  });
});

async function renderSection(
  placement: MarketingVideoPlacement,
  contained?: boolean,
): Promise<ReturnType<typeof render>> {
  const element = await MarketingVideoSection({ placement, contained });
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(element ?? <div />);
  });
  if (result === undefined) {
    throw new Error('render did not run');
  }
  return result;
}

function jsonLdOf(container: HTMLElement): Array<Record<string, unknown>> {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(
    (script) => JSON.parse(script.textContent ?? '{}') as Record<string, unknown>,
  );
}

describe('MarketingVideoSection', () => {
  it('renders the combined explainer on the Threads overview, with VideoObject data', async () => {
    const { container } = await renderSection(MarketingVideoPlacement.THREADS_OVERVIEW, false);

    expect(container.querySelector('video')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'ClawAI Threads in 30 seconds' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'ClawAI Threads in 30 seconds',
    );
    const [data] = jsonLdOf(container);
    const graph = (data?.['@graph'] ?? []) as Array<Record<string, string>>;
    expect(graph).toHaveLength(1);
    expect(graph[0]).toMatchObject({
      '@type': 'VideoObject',
      uploadDate: '2026-10-13',
      duration: 'PT30S',
    });
    expect(graph[0]?.contentUrl).toMatch(
      /^https?:\/\/.+\/marketing\/videos\/clawai-threads-combined\.mp4$/u,
    );
    expect(graph[0]?.thumbnailUrl).toMatch(
      /^https?:\/\/.+\/marketing\/videos\/clawai-threads-combined-poster\.jpg$/u,
    );
  });

  it('renders the three parts as a neutral numbered strip with one VideoObject each', async () => {
    const { container } = await renderSection(
      MarketingVideoPlacement.THREADS_OVERVIEW_STEPS,
      false,
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Watch the ClawAI Threads video in three parts',
    );
    expect(container.querySelectorAll('ol > li button')).toHaveLength(3);
    expect(container.querySelectorAll('video')).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'ClawAI Threads video, part 1 of 3' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ClawAI Threads video, part 3 of 3' }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bStep\b|approve|authors/iu);
    const graph = (jsonLdOf(container)[0]?.['@graph'] ?? []) as unknown[];
    expect(graph).toHaveLength(3);
  });

  it('renders the home band explainer with no extra heading', async () => {
    const { container } = await renderSection(MarketingVideoPlacement.HOME_THREADS, false);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('renders the home section with three Shorts and no language badges or VideoObject', async () => {
    const { container } = await renderSection(MarketingVideoPlacement.HOME_ACTION);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('See ClawAI in action');
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText('Arabic')).toBeNull();
    expect(screen.queryByText('English')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(jsonLdOf(container)).toEqual([]);
  });

  it('leads the home section with the Arabic Shorts on the Arabic site', async () => {
    headerState.locale = 'ar';
    await renderSection(MarketingVideoPlacement.HOME_ACTION);

    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));
    expect(names).toHaveLength(3);
    expect(names[0]).toContain('clawai بيجمعلك موديلات ذكااء اصطناعي في مكان واحد');
    expect(names[1]).toContain('مكان واحد في موديلات ذكاء اصطناعي كثيرة ClawAI');
    expect(names[2]).toContain('ClawAI — Open-Source Local-First AI Orchestration Platform');
    expect(screen.queryByText('العربية')).toBeNull();
  });

  it.each([
    [MarketingVideoPlacement.PRICING, 2],
    [MarketingVideoPlacement.SUPPORTED_MODELS, 2],
    [MarketingVideoPlacement.MODEL_PROVIDERS, 2],
    [MarketingVideoPlacement.LOCAL_FIRST_AI, 1],
    [MarketingVideoPlacement.HOW_IT_WORKS, 1],
    [MarketingVideoPlacement.ARCHITECTURE, 1],
    [MarketingVideoPlacement.INTEGRATIONS, 1],
  ])('renders the %s Shorts (%i) as facades with no iframe', async (placement, count) => {
    const { container } = await renderSection(placement);

    expect(screen.getAllByRole('button')).toHaveLength(count);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('section h2')).not.toBeNull();
  });

  it('contains the section by default and leaves the container to the host when asked', async () => {
    const contained = await renderSection(MarketingVideoPlacement.PRICING);
    expect(contained.container.querySelector('section')?.className).toContain('max-w-7xl');
    contained.unmount();

    const bare = await renderSection(MarketingVideoPlacement.PRICING, false);
    expect(bare.container.querySelector('section')?.className).not.toContain('max-w-7xl');
  });

  it('names each section by its heading', async () => {
    const { container } = await renderSection(MarketingVideoPlacement.PRICING);
    const section = container.querySelector('section');
    const heading = container.querySelector('h2');

    expect(section?.getAttribute('aria-labelledby')).toBe(heading?.id);
  });

  it('falls back to English for an unknown locale header', async () => {
    headerState.locale = 'xx';
    await renderSection(MarketingVideoPlacement.HOME_ACTION);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('See ClawAI in action');
  });
});
