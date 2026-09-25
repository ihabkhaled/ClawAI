// ADR-122: media features are plan-gated server-side at the executing service.
//
// Owner decision (2026-09-25): Free keeps the basics (image understanding,
// voice notes, short video); every paid tier gets image generation / edit,
// helper vision, text-to-speech and 600 s of video. The catalog feeds fresh
// installs; the migration moves existing rows. Both are checked here, because a
// catalog that says one thing and a migration that says another is exactly how
// a free account ends up with unlimited video.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import catalogData from '../../../../prisma/seeders/plan-catalog.json';

type MediaBlock = {
  imageGeneration: boolean;
  helperVision: boolean;
  textToSpeech: boolean;
  maxVideoSeconds: number | null;
};

type MediaCatalogEntry = { slug: string; monthlyMinor: number; media: MediaBlock };

const catalog = catalogData.plans as MediaCatalogEntry[];
const PAID_SLUGS = ['starter', 'plus', 'pro', 'team', 'scale', 'unlimited'];
const MIGRATION_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'prisma',
  'migrations',
  '20260925200000_add_media_plan_gates',
  'migration.sql',
);

describe('media plan gates (ADR-122)', () => {
  it('gives Free the basics only: no generation, no helper, no speech, 60 s of video', () => {
    const free = catalog.find((plan) => plan.slug === 'free');
    expect(free?.media).toEqual({
      imageGeneration: false,
      helperVision: false,
      textToSpeech: false,
      maxVideoSeconds: 60,
    });
  });

  it.each(PAID_SLUGS)('gives %s everything and 600 s of video', (slug) => {
    const plan = catalog.find((entry) => entry.slug === slug);
    expect(plan?.media).toEqual({
      imageGeneration: true,
      helperVision: true,
      textToSpeech: true,
      maxVideoSeconds: 600,
    });
  });

  it('never leaves a plan on a null video cap, which would mean unlimited', () => {
    for (const plan of catalog) {
      expect(plan.media.maxVideoSeconds).not.toBeNull();
      expect(plan.media.maxVideoSeconds).toBeGreaterThan(0);
    }
  });

  it('gates every priced plan in, and the only free plan out', () => {
    for (const plan of catalog) {
      expect(plan.media.imageGeneration).toBe(plan.monthlyMinor > 0);
    }
  });

  it('projects the media block onto the Plan columns, defaulting to Free', async () => {
    const { mediaGateProjections } =
      await import('../../../../prisma/seeders/plan-catalog.seeder.cjs');
    expect(
      mediaGateProjections({
        imageGeneration: true,
        helperVision: true,
        textToSpeech: true,
        maxVideoSeconds: 600,
      }),
    ).toEqual({
      allowImageGeneration: true,
      allowHelperVision: true,
      allowTextToSpeech: true,
      maxVideoSeconds: 600,
    });
    expect(mediaGateProjections(undefined)).toEqual({
      allowImageGeneration: false,
      allowHelperVision: false,
      allowTextToSpeech: false,
      maxVideoSeconds: 60,
    });
  });

  describe('migration 20260925200000_add_media_plan_gates', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    it('adds the four columns with opt-in defaults and a free-sized video cap', () => {
      expect(sql).toContain('"allow_image_generation" BOOLEAN NOT NULL DEFAULT false');
      expect(sql).toContain('"allow_helper_vision" BOOLEAN NOT NULL DEFAULT false');
      expect(sql).toContain('"allow_text_to_speech" BOOLEAN NOT NULL DEFAULT false');
      expect(sql).toContain('"max_video_seconds" INTEGER DEFAULT 60');
    });

    it('opts every paid slug in, matching the catalog', () => {
      const paidList = PAID_SLUGS.map((slug) => `'${slug}'`).join(', ');
      expect(sql).toContain(`WHERE "slug" IN (${paidList});`);
      expect(sql).toContain('"max_video_seconds" = 600');
    });

    it('pins free and the legacy trial row to the basics', () => {
      expect(sql).toContain(`WHERE "slug" IN ('trial', 'free');`);
      expect(sql).toContain('"max_video_seconds" = 60');
    });
  });
});
