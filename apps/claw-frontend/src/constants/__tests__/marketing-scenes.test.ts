import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MARKETING_SCENES_CONTENT_BY_LOCALE } from '@/constants/marketing-scenes-content.constants';
import {
  FEATURE_CAPABILITY_SCENES,
  MARKETING_PAGE_SCENES,
  MARKETING_SCENES,
  USE_CASE_TASK_SCENES,
} from '@/constants/marketing-scenes.constants';
import { FeatureCapability } from '@/enums/feature-capability.enum';
import { Locale } from '@/enums/locale.enum';
import { MarketingSceneId } from '@/enums/marketing-scene-id.enum';
import { MarketingScenePage } from '@/enums/marketing-scene-page.enum';
import { UseCaseTask } from '@/enums/use-case-task.enum';

const SCENE_IDS = Object.values(MarketingSceneId);
const LOCALES = Object.values(Locale);
const PUBLIC_DIRECTORY = path.resolve(__dirname, '../../../public');
const PNG_HEADER_BYTES = 24;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

describe('marketing scene registry', () => {
  it('has an asset for every scene id and nothing extra', () => {
    expect(Object.keys(MARKETING_SCENES).sort()).toEqual([...SCENE_IDS].sort());
  });

  it('uses 1440x900 for desktop and 390x844 for phone scenes', () => {
    for (const id of SCENE_IDS) {
      const isMobile =
        id === MarketingSceneId.MOBILE_CHAT || id === MarketingSceneId.MOBILE_DASHBOARD;
      const expected = isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
      expect(MARKETING_SCENES[id]).toMatchObject(expected);
    }
  });

  it('points every scene at an existing file under public/', () => {
    for (const id of SCENE_IDS) {
      const { src } = MARKETING_SCENES[id];
      expect(src).toBe(`/marketing/app/${id}.png`);
      expect(existsSync(path.join(PUBLIC_DIRECTORY, src)), `${src} is missing`).toBe(true);
    }
  });

  it('declares the true pixel size of every file, so nothing shifts while it loads', () => {
    for (const id of SCENE_IDS) {
      const { src, width, height } = MARKETING_SCENES[id];
      const file = path.join(PUBLIC_DIRECTORY, src);
      if (!existsSync(file)) {
        continue;
      }
      const header = readFileSync(file).subarray(0, PNG_HEADER_BYTES);
      expect(header.readUInt32BE(PNG_WIDTH_OFFSET), `${src} width`).toBe(width);
      expect(header.readUInt32BE(PNG_HEIGHT_OFFSET), `${src} height`).toBe(height);
    }
  });
});

describe('marketing scene translations', () => {
  it('covers every locale', () => {
    expect(Object.keys(MARKETING_SCENES_CONTENT_BY_LOCALE).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)('has a heading, alt and caption for every scene in %s', (locale) => {
    const content = MARKETING_SCENES_CONTENT_BY_LOCALE[locale];
    expect(content.heading.trim()).not.toBe('');
    for (const id of SCENE_IDS) {
      expect(content.scenes[id].alt.trim(), `${locale}/${id} alt`).not.toBe('');
      expect(content.scenes[id].caption.trim(), `${locale}/${id} caption`).not.toBe('');
    }
  });

  it.each(LOCALES.filter((locale) => locale !== Locale.EN))(
    'does not leave English text in %s',
    (locale) => {
      const english = MARKETING_SCENES_CONTENT_BY_LOCALE[Locale.EN];
      const content = MARKETING_SCENES_CONTENT_BY_LOCALE[locale];
      expect(content.heading).not.toBe(english.heading);
      for (const id of SCENE_IDS) {
        expect(content.scenes[id].alt, `${locale}/${id} alt`).not.toBe(english.scenes[id].alt);
        expect(content.scenes[id].caption, `${locale}/${id} caption`).not.toBe(
          english.scenes[id].caption,
        );
      }
    },
  );

  it('writes alt text as a description, not as a keyword list', () => {
    for (const locale of LOCALES) {
      for (const id of SCENE_IDS) {
        const { alt } = MARKETING_SCENES_CONTENT_BY_LOCALE[locale].scenes[id];
        expect(alt, `${locale}/${id}`).not.toContain(',,');
        expect(alt.length, `${locale}/${id}`).toBeLessThanOrEqual(260);
      }
    }
  });
});

describe('marketing scene placement maps', () => {
  it('maps every feature capability to at least one known scene', () => {
    for (const capability of Object.values(FeatureCapability)) {
      const scenes = FEATURE_CAPABILITY_SCENES[capability];
      expect(scenes.length, capability).toBeGreaterThan(0);
      for (const id of scenes) {
        expect(SCENE_IDS).toContain(id);
      }
    }
  });

  it('maps every use-case task to at least one known scene', () => {
    for (const task of Object.values(UseCaseTask)) {
      expect(USE_CASE_TASK_SCENES[task].length, task).toBeGreaterThan(0);
    }
  });

  it('gives every page key known scenes, with no duplicate in one page', () => {
    for (const page of Object.values(MarketingScenePage)) {
      const scenes = MARKETING_PAGE_SCENES[page];
      expect(scenes.length, page).toBeGreaterThan(0);
      expect(new Set(scenes).size, page).toBe(scenes.length);
    }
  });

  it('uses every scene somewhere', () => {
    const used = new Set<MarketingSceneId>([
      ...Object.values(MARKETING_PAGE_SCENES).flat(),
      ...Object.values(FEATURE_CAPABILITY_SCENES).flat(),
      ...Object.values(USE_CASE_TASK_SCENES).flat(),
    ]);
    const unused = SCENE_IDS.filter((id) => !used.has(id));
    expect(unused).toEqual([]);
  });
});
