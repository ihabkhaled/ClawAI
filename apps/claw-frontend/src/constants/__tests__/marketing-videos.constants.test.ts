import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MARKETING_LOCAL_VIDEO_HEIGHT,
  MARKETING_LOCAL_VIDEO_WIDTH,
  MARKETING_VIDEO_PLACEMENTS,
  MARKETING_VIDEOS,
  YOUTUBE_EMBED_ORIGIN,
} from '@/constants/marketing-videos.constants';
import { Locale } from '@/enums/locale.enum';
import { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import { MarketingVideoLayout } from '@/enums/marketing-video-layout.enum';
import { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import { getTranslation } from '@/lib/i18n/translations';
import { isLocalVideo } from '@/utilities/marketing-videos.utility';

const PUBLIC_DIRECTORY = path.join(process.cwd(), 'public');
const SRC_DIRECTORY = path.join(process.cwd(), 'src');
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u;

/** The source file that must name each placement, so a placement cannot be defined but unused. */
const PLACEMENT_HOSTS: Readonly<Record<MarketingVideoPlacement, string>> = {
  [MarketingVideoPlacement.HOME_ACTION]: 'app/(marketing)/page.tsx',
  [MarketingVideoPlacement.HOME_THREADS]: 'app/(marketing)/page.tsx',
  [MarketingVideoPlacement.THREADS_OVERVIEW]:
    'components/marketing/threads/threads-overview-page.tsx',
  [MarketingVideoPlacement.THREADS_OVERVIEW_STEPS]:
    'components/marketing/threads/threads-overview-page.tsx',
  [MarketingVideoPlacement.THREADS_DISCOVER]: 'app/(marketing)/threads/discover/page.tsx',
  [MarketingVideoPlacement.PRICING]: 'app/(marketing)/pricing/page.tsx',
  [MarketingVideoPlacement.SUPPORTED_MODELS]: 'app/(marketing)/supported-models/page.tsx',
  [MarketingVideoPlacement.MODEL_PROVIDERS]: 'app/(marketing)/model-providers/page.tsx',
  [MarketingVideoPlacement.LOCAL_FIRST_AI]: 'app/(marketing)/local-first-ai/page.tsx',
  [MarketingVideoPlacement.HOW_IT_WORKS]: 'app/(marketing)/how-it-works/page.tsx',
  [MarketingVideoPlacement.ARCHITECTURE]: 'app/(marketing)/architecture/page.tsx',
  [MarketingVideoPlacement.INTEGRATIONS]: 'app/(marketing)/integrations/page.tsx',
};

describe('MARKETING_VIDEOS registry', () => {
  it('has no duplicate ids', () => {
    const ids = MARKETING_VIDEOS.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the four local videos and the nine Shorts', () => {
    const local = MARKETING_VIDEOS.filter(isLocalVideo);
    const shorts = MARKETING_VIDEOS.filter((entry) => entry.kind === MarketingVideoKind.SHORT);

    expect(local.map((entry) => entry.id)).toEqual([
      'clawai-threads-combined',
      'clawai-part-1',
      'clawai-part-2',
      'clawai-part-3',
    ]);
    expect(shorts).toHaveLength(9);
  });

  it('points every local video and poster at a file that exists in public/', () => {
    for (const entry of MARKETING_VIDEOS.filter(isLocalVideo)) {
      expect(existsSync(path.join(PUBLIC_DIRECTORY, entry.src)), `${entry.src} is missing`).toBe(
        true,
      );
      expect(
        existsSync(path.join(PUBLIC_DIRECTORY, entry.posterSrc)),
        `${entry.posterSrc} is missing`,
      ).toBe(true);
      expect(entry.src.endsWith('.mp4')).toBe(true);
      expect(entry.width).toBe(MARKETING_LOCAL_VIDEO_WIDTH);
      expect(entry.height).toBe(MARKETING_LOCAL_VIDEO_HEIGHT);
      expect(entry.durationSeconds).toBeGreaterThan(0);
    }
  });

  it('gives every Short a real YouTube id and a thumbnail that exists in public/', () => {
    for (const entry of MARKETING_VIDEOS.filter((item) => item.kind === MarketingVideoKind.SHORT)) {
      expect(entry.id).toMatch(YOUTUBE_ID_PATTERN);
      if (entry.kind === MarketingVideoKind.SHORT) {
        expect(entry.thumbnailSrc).toBe(`/marketing/videos/shorts/${entry.id}.jpg`);
        expect(
          existsSync(path.join(PUBLIC_DIRECTORY, entry.thumbnailSrc)),
          `${entry.thumbnailSrc} is missing`,
        ).toBe(true);
      }
    }
  });

  it('sizes the three step clips 10 seconds each and the combined one 30', () => {
    const durations = Object.fromEntries(
      MARKETING_VIDEOS.filter(isLocalVideo).map((entry) => [entry.id, entry.durationSeconds]),
    );

    expect(durations).toEqual({
      'clawai-threads-combined': 30,
      'clawai-part-1': 10,
      'clawai-part-2': 10,
      'clawai-part-3': 10,
    });
  });

  it('numbers the three part clips 1 to 3 and the four open-source Shorts 1 to 4', () => {
    const steps = MARKETING_VIDEOS.filter(isLocalVideo)
      .map((entry) => entry.part)
      .filter((part) => part !== undefined);
    const parts = MARKETING_VIDEOS.flatMap((entry) =>
      entry.kind === MarketingVideoKind.SHORT && entry.part !== undefined ? [entry.part] : [],
    );

    expect(steps).toEqual([1, 2, 3]);
    expect(parts).toEqual([1, 2, 3, 4]);
  });

  it('puts at least one video on every placement', () => {
    for (const placement of Object.values(MarketingVideoPlacement)) {
      expect(
        MARKETING_VIDEOS.some((entry) => entry.placements.includes(placement)),
        placement,
      ).toBe(true);
    }
  });

  it('keeps Shorts out of the 16:9 layouts and local clips out of the Shorts layout', () => {
    for (const entry of MARKETING_VIDEOS) {
      for (const placement of entry.placements) {
        const { layout } = MARKETING_VIDEO_PLACEMENTS[placement];
        expect(layout === MarketingVideoLayout.SHORTS, `${entry.id} on ${placement}`).toBe(
          entry.kind === MarketingVideoKind.SHORT,
        );
      }
    }
  });

  it('gives every Short its YouTube title verbatim, as plain text and not a key', () => {
    const titles = Object.fromEntries(
      MARKETING_VIDEOS.flatMap((entry) =>
        entry.kind === MarketingVideoKind.SHORT ? [[entry.id, entry.title]] : [],
      ),
    );
    const openSource = 'ClawAI — منصة Open Source بتشغّل وتوجّه موديلات الـ AI محليًا وعلى الكلاود';

    expect(titles).toEqual({
      ZuKqBODBH2k: 'ClawAI — Open-Source Local-First AI Orchestration Platform',
      CfxYCdcNibQ: 'clawai بيجمعلك موديلات ذكااء اصطناعي في مكان واحد',
      '3tsb9axusWA': 'مكان واحد في موديلات ذكاء اصطناعي كثيرة ClawAI',
      QvYbIApKT3M: 'ذكاء اصطناعي مجاني',
      m6WZLeTl80Y: 'ذكاء اصطناعي مجاني موديلات الصينية',
      '9sECnKbvxZE': openSource,
      zcdv4Jyo1LE: openSource,
      apX5d9hJPQo: openSource,
      VXdm870CELM: openSource,
    });
  });

  it('resolves every local title and description key to real text in all 13 locales', () => {
    for (const locale of Object.values(Locale)) {
      for (const entry of MARKETING_VIDEOS.filter(isLocalVideo)) {
        for (const key of [entry.titleKey, entry.descriptionKey]) {
          const text = getTranslation(locale, key);
          expect(text, `${locale} ${key}`).not.toBe(key);
          expect(text.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
        }
      }
      for (const config of Object.values(MARKETING_VIDEO_PLACEMENTS)) {
        for (const key of [config.headingKey, config.introKey]) {
          if (key !== null) {
            expect(getTranslation(locale, key), `${locale} ${key}`).not.toBe(key);
          }
        }
      }
    }
  });

  it('names no creator, and never frames a host other than the privacy-enhanced one', () => {
    expect(YOUTUBE_EMBED_ORIGIN).toBe('https://www.youtube-nocookie.com');
    const source = JSON.stringify(MARKETING_VIDEOS);

    expect(source).not.toMatch(/youtube\.com|youtu\.be|creator|channel/iu);
  });

  it('is placed on every page the brief names', () => {
    const placed = (id: string): ReadonlyArray<MarketingVideoPlacement> =>
      MARKETING_VIDEOS.find((entry) => entry.id === id)?.placements ?? [];

    expect(placed('clawai-threads-combined')).toEqual([
      MarketingVideoPlacement.HOME_THREADS,
      MarketingVideoPlacement.THREADS_OVERVIEW,
      MarketingVideoPlacement.THREADS_DISCOVER,
    ]);
    expect(placed('clawai-part-2')).toEqual([MarketingVideoPlacement.THREADS_OVERVIEW_STEPS]);
    expect(placed('ZuKqBODBH2k')).toEqual([MarketingVideoPlacement.HOME_ACTION]);
    expect(placed('CfxYCdcNibQ')).toEqual([MarketingVideoPlacement.HOME_ACTION]);
    expect(placed('3tsb9axusWA')).toEqual([MarketingVideoPlacement.HOME_ACTION]);
    for (const id of ['QvYbIApKT3M', 'm6WZLeTl80Y']) {
      expect(placed(id)).toEqual([
        MarketingVideoPlacement.PRICING,
        MarketingVideoPlacement.SUPPORTED_MODELS,
        MarketingVideoPlacement.MODEL_PROVIDERS,
      ]);
    }
    expect(placed('9sECnKbvxZE')).toEqual([MarketingVideoPlacement.LOCAL_FIRST_AI]);
    expect(placed('zcdv4Jyo1LE')).toEqual([MarketingVideoPlacement.HOW_IT_WORKS]);
    expect(placed('apX5d9hJPQo')).toEqual([MarketingVideoPlacement.ARCHITECTURE]);
    expect(placed('VXdm870CELM')).toEqual([MarketingVideoPlacement.INTEGRATIONS]);
  });

  it.each(Object.values(MarketingVideoPlacement))(
    'renders the %s placement from the page that hosts it',
    (placement) => {
      const source = readFileSync(path.join(SRC_DIRECTORY, PLACEMENT_HOSTS[placement]), 'utf8');

      expect(source).toContain('MarketingVideoSection');
      expect(source).toContain(`MarketingVideoPlacement.${placementKey(placement)}`);
    },
  );
});

function placementKey(placement: MarketingVideoPlacement): string {
  const entry = Object.entries(MarketingVideoPlacement).find(([, value]) => value === placement);
  return entry?.[0] ?? placement;
}
