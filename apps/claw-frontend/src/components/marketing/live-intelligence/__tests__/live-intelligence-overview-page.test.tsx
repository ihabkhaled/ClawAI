import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiveIntelligenceOverviewPage } from '@/components/marketing/live-intelligence/live-intelligence-overview-page';
import { LiveIntelligencePlatformsPage } from '@/components/marketing/live-intelligence/live-intelligence-platforms-page';
import { LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE } from '@/constants/live-intelligence-marketing-content.constants';
import {
  LIVE_MARKETING_PLATFORM_GROUP_ORDER,
  LIVE_MARKETING_PLATFORMS,
} from '@/constants/live-intelligence-marketing-platforms.constants';
import {
  LIVE_INTELLIGENCE_MARKETING_SCREENSHOTS,
  LIVE_INTELLIGENCE_MARKETING_VIDEOS,
} from '@/constants/live-intelligence-marketing.constants';
import { LIVE_INTELLIGENCE_SEO_BY_LOCALE } from '@/constants/live-intelligence-seo.constants';
import { Locale } from '@/enums/locale.enum';

const requestLocale = vi.hoisted(() => ({ value: 'en' }));

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': requestLocale.value }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => <img src={src} alt={alt} width={width} height={height} />,
}));

const english = LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[Locale.EN];

describe('LiveIntelligenceOverviewPage', () => {
  it('renders one h1, the section headings, both videos and every screenshot', async () => {
    requestLocale.value = 'en';
    const { container } = render(await LiveIntelligenceOverviewPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const title of [english.stepsTitle, english.waysTitle, english.faqTitle]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }

    const videos = container.querySelectorAll('video');
    expect(videos).toHaveLength(LIVE_INTELLIGENCE_MARKETING_VIDEOS.length);
    for (const video of videos) {
      expect(video).toHaveAttribute('preload', 'none');
      expect(video).toHaveAttribute('poster');
      expect(video.hasAttribute('playsinline')).toBe(true);
      expect(video.hasAttribute('loop')).toBe(true);
      expect(video.getAttribute('aria-label')?.length).toBeGreaterThan(0);
    }

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(LIVE_INTELLIGENCE_MARKETING_SCREENSHOTS.length);
    for (const image of images) {
      expect(image.getAttribute('alt')?.length).toBeGreaterThan(0);
      expect(image).toHaveAttribute('width', '390');
      expect(image).toHaveAttribute('height', '844');
    }
    expect([...images].map((image) => image.getAttribute('src'))).toEqual([
      '/marketing/live-and-videos/paste-link.png',
      '/marketing/live-and-videos/live-feed.png',
      '/marketing/live-and-videos/video-summary.png',
    ]);
  });

  it('links the calls to action to /live, sign-up and the platforms page in the visitor language', async () => {
    requestLocale.value = 'ar';
    render(await LiveIntelligenceOverviewPage());
    const arabic = LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[Locale.AR];

    expect(screen.getAllByRole('link', { name: arabic.openCta })[0]).toHaveAttribute(
      'href',
      '/ar/live',
    );
    expect(screen.getAllByRole('link', { name: arabic.signUpCta })[0]).toHaveAttribute(
      'href',
      '/ar/register',
    );
    expect(screen.getByRole('link', { name: arabic.platformsCta })).toHaveAttribute(
      'href',
      '/ar/features/live-intelligence/platforms',
    );
  });

  it('states no price and no number of free minutes', async () => {
    requestLocale.value = 'en';
    const { container } = render(await LiveIntelligenceOverviewPage());
    expect(container.textContent).not.toMatch(/\$\s?\d/u);
    expect(container.textContent).not.toMatch(/\d+\s+free minutes/u);
  });
});

describe('LiveIntelligencePlatformsPage', () => {
  it('renders one h1 and every platform under its group', async () => {
    requestLocale.value = 'en';
    const { container } = render(await LiveIntelligencePlatformsPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const group of LIVE_MARKETING_PLATFORM_GROUP_ORDER) {
      expect(
        screen.getByRole('heading', { level: 3, name: english.platformsPage.groups[group].title }),
      ).toBeInTheDocument();
    }
    const rendered = [...container.querySelectorAll('[data-platform]')].map((node) =>
      node.getAttribute('data-platform'),
    );
    expect(rendered.sort()).toEqual(LIVE_MARKETING_PLATFORMS.map((p) => p.name).sort());
    expect(container.textContent).toContain(english.platformsPage.limits[1]?.title ?? '');
  });
});

describe('Live & Video Intelligence platform list', () => {
  it('names more than 15 platforms (only the ones that passed the real sweep), each once, and never Discord', () => {
    const names = LIVE_MARKETING_PLATFORMS.map((platform) => platform.name);
    expect(names.length).toBeGreaterThan(15);
    expect(new Set(names).size).toBe(names.length);
    expect(names.some((name) => /discord/iu.test(name))).toBe(false);
  });
});

describe('Live & Video Intelligence marketing content', () => {
  it('translates every locale with the same shape as English', () => {
    for (const locale of Object.values(Locale)) {
      if (locale === Locale.EN) {
        continue;
      }
      const content = LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[locale];
      expect(content.title, locale).not.toBe(english.title);
      expect(content.intro, locale).not.toBe(english.intro);
      expect(content.platformsPage.title, locale).not.toBe(english.platformsPage.title);
      for (const key of [
        'videos',
        'steps',
        'screenshots',
        'outcomes',
        'ways',
        'waysRows',
        'modes',
        'languagesParagraphs',
        'limits',
        'faq',
      ] as const) {
        expect(content[key], `${locale} ${key}`).toHaveLength(english[key].length);
      }
      for (const key of ['support', 'limits', 'faq'] as const) {
        expect(content.platformsPage[key], `${locale} platforms ${key}`).toHaveLength(
          english.platformsPage[key].length,
        );
      }
      expect(Object.keys(content.platformsPage.groups).sort()).toEqual(
        Object.keys(english.platformsPage.groups).sort(),
      );
      for (const [index, step] of content.steps.entries()) {
        expect(step.body, `${locale} step ${index}`).not.toBe(english.steps[index]?.body);
      }
    }
  });

  it('keeps the brand names and the honest facts in every locale', () => {
    for (const locale of Object.values(Locale)) {
      const content = LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[locale];
      const faq = content.faq.map((entry) => entry.question + entry.answer).join(' ');
      expect(faq, locale).toContain('YouTube');
      expect(faq, locale).toContain('Discord');
      expect(content.faq.length, locale).toBeGreaterThanOrEqual(8);
      const all = JSON.stringify(content);
      expect(all, locale).toContain('PDF');
      expect(all, locale).not.toMatch(/\$\s?\d/u);
    }
  });

  it('has SEO copy for both pages in every locale', () => {
    for (const locale of Object.values(Locale)) {
      const copy = LIVE_INTELLIGENCE_SEO_BY_LOCALE[locale];
      expect(copy['features/live-intelligence']?.description.length).toBeGreaterThan(80);
      expect(copy['features/live-intelligence/platforms']?.description.length).toBeGreaterThan(80);
    }
  });
});
