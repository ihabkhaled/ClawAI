import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketingFigure } from '@/components/marketing/shared/marketing-figure';
import { MarketingRequestSceneGallery } from '@/components/marketing/shared/marketing-request-scene-gallery';
import { MarketingSceneGallery } from '@/components/marketing/shared/marketing-scene-gallery';
import { MARKETING_SCENES_CONTENT_BY_LOCALE } from '@/constants/marketing-scenes-content.constants';
import { Locale } from '@/enums/locale.enum';
import { MarketingSceneGalleryLayout } from '@/enums/marketing-scene-gallery-layout.enum';
import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import { MarketingScenePage } from '@/enums/marketing-scene-page.enum';

const headerState = vi.hoisted(() => ({ locale: 'en' as string | null }));

vi.mock('next/headers', () => ({
  headers: async (): Promise<{ get: () => string | null }> => ({
    get: (): string | null => headerState.locale,
  }),
}));

describe('MarketingFigure', () => {
  it.each(Object.values(Locale))('renders the %s alt text and caption', (locale) => {
    const copy = MARKETING_SCENES_CONTENT_BY_LOCALE[locale].scenes[MarketingSceneId.FILES];
    render(<MarketingFigure sceneId={MarketingSceneId.FILES} locale={locale} />);

    expect(screen.getByRole('img', { name: copy.alt })).toBeInTheDocument();
    expect(screen.getByText(copy.caption).tagName).toBe('FIGCAPTION');
    expect(screen.getByRole('figure')).toBeInTheDocument();
  });

  it('reserves the real size and loads lazily by default', () => {
    render(<MarketingFigure sceneId={MarketingSceneId.USAGE} locale={Locale.EN} />);
    const image = screen.getByRole('img');

    expect(image).toHaveAttribute('width', '1440');
    expect(image).toHaveAttribute('height', '900');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('sizes');
  });

  it('does not lazy-load an image marked priority', () => {
    render(<MarketingFigure sceneId={MarketingSceneId.USAGE} locale={Locale.EN} priority />);

    expect(screen.getByRole('img')).not.toHaveAttribute('loading', 'lazy');
  });

  it('keeps phone screenshots at phone size', () => {
    render(<MarketingFigure sceneId={MarketingSceneId.MOBILE_CHAT} locale={Locale.EN} />);

    expect(screen.getByRole('img')).toHaveAttribute('width', '390');
    expect(screen.getByRole('img')).toHaveAttribute('height', '844');
    expect(screen.getByRole('figure').className).toContain('max-w-');
  });

  it('renders right-to-left languages with their own text and no physical left/right classes', () => {
    const { container } = render(
      <div dir="rtl">
        <MarketingFigure sceneId={MarketingSceneId.MEMORY} locale={Locale.AR} />
      </div>,
    );

    expect(screen.getByRole('img').getAttribute('alt')).toMatch(/[؀-ۿ]/);
    expect(container.innerHTML).not.toMatch(/\b(ml|mr|pl|pr|left|right)-/);
  });

  it('renders nothing for a scene that is not in the registry', () => {
    const unknown = 'not-a-scene' as MarketingSceneId;
    const { container } = render(<MarketingFigure sceneId={unknown} locale={Locale.EN} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('MarketingSceneGallery', () => {
  it('renders a labelled section with one figure per scene and no level-one heading', () => {
    render(
      <MarketingSceneGallery
        locale={Locale.EN}
        scenes={[MarketingSceneId.FILES, MarketingSceneId.MEMORY]}
      />,
    );

    expect(screen.getByRole('region', { name: 'See it in the app' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'See it in the app' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getAllByRole('figure')).toHaveLength(2);
  });

  it('numbers the steps in the steps layout', () => {
    render(
      <MarketingSceneGallery
        locale={Locale.EN}
        scenes={[MarketingSceneId.FILES, MarketingSceneId.MEMORY]}
        layout={MarketingSceneGalleryLayout.STEPS}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('never marks a gallery image as priority', () => {
    render(<MarketingSceneGallery locale={Locale.EN} page={MarketingScenePage.HOME} />);

    for (const image of screen.getAllByRole('img')) {
      expect(image).toHaveAttribute('loading', 'lazy');
    }
  });

  it('renders nothing when there are no scenes', () => {
    const { container } = render(<MarketingSceneGallery locale={Locale.EN} scenes={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('is a sync component, so a page that contains it renders without async children', () => {
    expect(MarketingSceneGallery.constructor.name).toBe('Function');
  });
});

describe('MarketingRequestSceneGallery', () => {
  beforeEach(() => {
    headerState.locale = 'en';
  });

  it('uses the request locale', async () => {
    headerState.locale = 'de';
    render(await MarketingRequestSceneGallery({ page: MarketingScenePage.PRICING }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'In der App ansehen' }),
    ).toBeInTheDocument();
  });

  it('falls back to English for an unknown locale header', async () => {
    headerState.locale = 'xx';
    render(await MarketingRequestSceneGallery({ scenes: [MarketingSceneId.FILES] }));

    expect(
      screen.getByRole('heading', { level: 2, name: 'See it in the app' }),
    ).toBeInTheDocument();
  });
});
