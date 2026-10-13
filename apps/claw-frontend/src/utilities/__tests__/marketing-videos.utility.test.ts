import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import { createServerTranslator } from '@/lib/i18n/server-locale';
import {
  buildMarketingVideoView,
  buildYouTubeEmbedUrl,
  formatIsoDuration,
  getMarketingVideosForPlacement,
  toAbsoluteSiteUrl,
} from '@/utilities/marketing-videos.utility';
import { buildVideoObjectsJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

describe('getMarketingVideosForPlacement', () => {
  it('leads the home section with the English overview Short on the English site', () => {
    const ids = getMarketingVideosForPlacement(MarketingVideoPlacement.HOME_ACTION, Locale.EN).map(
      (entry) => entry.id,
    );

    expect(ids).toEqual(['ZuKqBODBH2k', 'CfxYCdcNibQ', '3tsb9axusWA']);
  });

  it('leads the home section with the Arabic Shorts on the Arabic site', () => {
    const ids = getMarketingVideosForPlacement(MarketingVideoPlacement.HOME_ACTION, Locale.AR).map(
      (entry) => entry.id,
    );

    expect(ids).toEqual(['CfxYCdcNibQ', '3tsb9axusWA', 'ZuKqBODBH2k']);
  });

  it('returns the three step clips in order', () => {
    const ids = getMarketingVideosForPlacement(
      MarketingVideoPlacement.THREADS_OVERVIEW_STEPS,
      Locale.DE,
    ).map((entry) => entry.id);

    expect(ids).toEqual(['clawai-part-1', 'clawai-part-2', 'clawai-part-3']);
  });

  it('orders Arabic-titled Shorts first on the Arabic site by title script alone', () => {
    const ids = getMarketingVideosForPlacement(MarketingVideoPlacement.PRICING, Locale.AR).map(
      (entry) => entry.id,
    );

    expect(ids).toEqual(['QvYbIApKT3M', 'm6WZLeTl80Y']);
    const home = getMarketingVideosForPlacement(MarketingVideoPlacement.HOME_ACTION, Locale.AR);
    expect(home.at(-1)?.id).toBe('ZuKqBODBH2k');
  });

  it('puts one open-source Short on each of its four pages', () => {
    const placements = [
      [MarketingVideoPlacement.LOCAL_FIRST_AI, '9sECnKbvxZE'],
      [MarketingVideoPlacement.HOW_IT_WORKS, 'zcdv4Jyo1LE'],
      [MarketingVideoPlacement.ARCHITECTURE, 'apX5d9hJPQo'],
      [MarketingVideoPlacement.INTEGRATIONS, 'VXdm870CELM'],
    ] as const;

    for (const [placement, id] of placements) {
      expect(
        getMarketingVideosForPlacement(placement, Locale.EN).map((entry) => entry.id),
        placement,
      ).toEqual([id]);
    }
  });
});

describe('buildYouTubeEmbedUrl', () => {
  it('builds the privacy-enhanced autoplay URL', () => {
    expect(buildYouTubeEmbedUrl('ZuKqBODBH2k')).toBe(
      'https://www.youtube-nocookie.com/embed/ZuKqBODBH2k?autoplay=1&rel=0&playsinline=1',
    );
  });

  it('encodes anything unexpected in the id instead of letting it escape the path', () => {
    expect(buildYouTubeEmbedUrl('a/../b?x=1')).toBe(
      'https://www.youtube-nocookie.com/embed/a%2F..%2Fb%3Fx%3D1?autoplay=1&rel=0&playsinline=1',
    );
  });
});

describe('formatIsoDuration', () => {
  it.each([
    [10, 'PT10S'],
    [30, 'PT30S'],
    [60, 'PT1M'],
    [90, 'PT1M30S'],
    [0, 'PT0S'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatIsoDuration(seconds)).toBe(expected);
  });
});

describe('buildMarketingVideoView', () => {
  const t = createServerTranslator(Locale.EN);

  it('resolves a local clip with a neutral part title and its duration', () => {
    const [part2] = getMarketingVideosForPlacement(
      MarketingVideoPlacement.THREADS_OVERVIEW_STEPS,
      Locale.EN,
    ).filter((entry) => entry.id === 'clawai-part-2');
    const view = buildMarketingVideoView(part2 as NonNullable<typeof part2>, t);

    expect(view).toMatchObject({
      kind: MarketingVideoKind.LOCAL,
      id: 'clawai-part-2',
      src: '/marketing/videos/clawai-part-2.mp4',
      posterSrc: '/marketing/videos/clawai-part-2-poster.jpg',
      title: 'ClawAI Threads video, part 2 of 3',
      durationLabel: '10 seconds',
    });
    expect(view).not.toHaveProperty('stepLabel');
  });

  it('resolves a Short with its verbatim YouTube title, accessible name and embed URL', () => {
    const [short] = getMarketingVideosForPlacement(MarketingVideoPlacement.PRICING, Locale.EN);
    const view = buildMarketingVideoView(short as NonNullable<typeof short>, t);

    expect(view).toMatchObject({
      kind: MarketingVideoKind.SHORT,
      id: 'QvYbIApKT3M',
      title: 'ذكاء اصطناعي مجاني',
      playLabel: 'Play video: ذكاء اصطناعي مجاني',
      frameTitle: 'ذكاء اصطناعي مجاني (YouTube video)',
      embedUrl: buildYouTubeEmbedUrl('QvYbIApKT3M'),
    });
    expect(view).not.toHaveProperty('languageLabel');
  });

  it('keeps the title verbatim in every locale', () => {
    const [short] = getMarketingVideosForPlacement(MarketingVideoPlacement.PRICING, Locale.DE);
    const view = buildMarketingVideoView(
      short as NonNullable<typeof short>,
      createServerTranslator(Locale.DE),
    );

    expect(view).toMatchObject({ title: 'ذكاء اصطناعي مجاني' });
  });

  it('numbers the four same-title open-source Shorts #1 to #4 and nothing more', () => {
    const titles = [
      MarketingVideoPlacement.LOCAL_FIRST_AI,
      MarketingVideoPlacement.HOW_IT_WORKS,
      MarketingVideoPlacement.ARCHITECTURE,
      MarketingVideoPlacement.INTEGRATIONS,
    ].map((placement) => {
      const [entry] = getMarketingVideosForPlacement(placement, Locale.EN);
      const view = buildMarketingVideoView(entry as NonNullable<typeof entry>, t);
      return view.kind === MarketingVideoKind.SHORT ? view.title : '';
    });

    expect(titles).toHaveLength(4);
    for (const [index, title] of titles.entries()) {
      expect(title).toBe(
        `ClawAI — منصة Open Source بتشغّل وتوجّه موديلات الـ AI محليًا وعلى الكلاود #${index + 1}`,
      );
    }
  });

  it('shows the English-titled Short with its title exactly as published', () => {
    const [short] = getMarketingVideosForPlacement(MarketingVideoPlacement.HOME_ACTION, Locale.EN);
    const view = buildMarketingVideoView(short as NonNullable<typeof short>, t);

    expect(view).toMatchObject({
      id: 'ZuKqBODBH2k',
      title: 'ClawAI — Open-Source Local-First AI Orchestration Platform',
    });
  });
});

describe('buildVideoObjectsJsonLd', () => {
  it('emits a schema.org VideoObject with absolute URLs and an ISO 8601 duration', () => {
    const siteUrl = 'https://example.test';
    const jsonLd = buildVideoObjectsJsonLd([
      {
        name: 'ClawAI Threads in 30 seconds',
        description: 'A 30-second video about ClawAI Threads.',
        thumbnailUrl: toAbsoluteSiteUrl(
          '/marketing/videos/clawai-threads-combined-poster.jpg',
          siteUrl,
        ),
        contentUrl: toAbsoluteSiteUrl('/marketing/videos/clawai-threads-combined.mp4', siteUrl),
        uploadDate: '2026-10-13',
        durationSeconds: 30,
      },
    ]);

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'VideoObject',
          name: 'ClawAI Threads in 30 seconds',
          description: 'A 30-second video about ClawAI Threads.',
          thumbnailUrl: 'https://example.test/marketing/videos/clawai-threads-combined-poster.jpg',
          contentUrl: 'https://example.test/marketing/videos/clawai-threads-combined.mp4',
          uploadDate: '2026-10-13',
          duration: 'PT30S',
        },
      ],
    });
    expect(serializeJsonLd(jsonLd)).not.toContain('<');
  });
});
