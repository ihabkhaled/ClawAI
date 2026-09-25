import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanFeatureNotice } from '@/components/chat/plan-feature-notice';
import { PLAN_FEATURE_LABEL_KEYS } from '@/constants/upgrade-cta.constants';
import { PlanFeature } from '@/enums/plan-feature.enum';
import { ar } from '@/lib/i18n/locales/ar';
import { de } from '@/lib/i18n/locales/de';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';
import { fa } from '@/lib/i18n/locales/fa';
import { fr } from '@/lib/i18n/locales/fr';
import { hi } from '@/lib/i18n/locales/hi';
import { it as itLocale } from '@/lib/i18n/locales/it';
import { ja } from '@/lib/i18n/locales/ja';
import { pt } from '@/lib/i18n/locales/pt';
import { ru } from '@/lib/i18n/locales/ru';
import { th } from '@/lib/i18n/locales/th';
import { zh } from '@/lib/i18n/locales/zh';
import type { TranslationDictionary } from '@/types/i18n.types';
import { readPlanFeatureRefusal } from '@/utilities/plan-feature-refusal.utility';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${String(params['feature'])}` : key,
  }),
}));

// ADR-122: a media feature the plan lacks is a translated notice with a way to
// upgrade — never a raw error string in the transcript.
describe('PlanFeatureNotice (ADR-122)', () => {
  it('names the missing feature and links to the plan page', () => {
    render(<PlanFeatureNotice feature={PlanFeature.ALLOW_IMAGE_GENERATION} />);

    expect(
      screen.getByText('chat.upgrade.title:chat.upgrade.features.imageGeneration'),
    ).toBeInTheDocument();
    expect(screen.getByText('chat.limits.featureDisabledBody')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.limits.upgradeCta' })).toHaveAttribute(
      'href',
      '/plan',
    );
  });
});

describe('readPlanFeatureRefusal', () => {
  it.each([
    [
      { type: 'plan_feature_disabled', planFeature: 'allowImageGeneration' },
      PlanFeature.ALLOW_IMAGE_GENERATION,
    ],
    [{ type: 'plan_feature_disabled', planFeature: 'allowSomethingNew' }, null],
    [{ type: 'plan_feature_disabled' }, null],
    [{ type: 'image_generation', generationId: 'g1' }, null],
    [null, null],
  ])('%j → %j', (metadata, expected) => {
    expect(readPlanFeatureRefusal(metadata)).toBe(expected);
  });
});

const LOCALES: [string, TranslationDictionary][] = [
  ['en', en],
  ['ar', ar],
  ['de', de],
  ['es', es],
  ['fa', fa],
  ['fr', fr],
  ['hi', hi],
  ['it', itLocale],
  ['ja', ja],
  ['pt', pt],
  ['ru', ru],
  ['th', th],
  ['zh', zh],
];

const MEDIA_FEATURES = [
  PlanFeature.ALLOW_IMAGE_GENERATION,
  PlanFeature.ALLOW_HELPER_VISION,
  PlanFeature.ALLOW_TEXT_TO_SPEECH,
] as const;

// `t()` is not type-safe against the dictionary: a missing key renders the raw
// key. These are reached through a Record, which the key-reference guard does
// not scan, so every locale is walked here.
describe.each(LOCALES)('%s media plan-gate strings', (_name, dict) => {
  it.each(MEDIA_FEATURES)('has a feature label and an admin gate label for %s', (feature) => {
    const featureKey = PLAN_FEATURE_LABEL_KEYS[feature].split('.').at(-1) ?? '';
    const features: Record<string, string> = dict.chat.upgrade.features;
    const gates: Record<string, string> = dict.adminPlans.gate;
    expect(features[featureKey]?.trim().length).toBeGreaterThan(0);
    expect(gates[feature]?.trim().length).toBeGreaterThan(0);
  });

  it('has the admin video-length label', () => {
    expect(dict.adminPlans.form.maxVideoSeconds.trim().length).toBeGreaterThan(0);
  });
});
