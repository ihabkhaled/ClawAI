import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  THREAD_STAGE_LABEL_KEYS,
  THREAD_STEP_STAGE_LABEL_KEYS,
} from '@/constants/thread-generation-stage.constants';
import { ThreadGenerationStage } from '@/enums/thread-generation-stage.enum';
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
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import { threadStageLabelKey } from '@/utilities/thread-generation-stage.utility';

const LOCALES = { ar, de, en, es, fa, fr, hi, it: itLocale, ja, pt, ru, th, zh };

const GENERATION_ROOT = resolve(
  __dirname,
  '../../../../claw-thread-generation-service/src/modules/generation',
);
/** Every file where the generation service names a step-row stage literally. */
const STEP_STAGE_FILES = [
  'constants/step-progress.constants.ts',
  'managers/article-formatter.ts',
  'managers/generation-pipeline.manager.ts',
  'managers/role-healer.ts',
];

function serviceStepStages(): Set<string> {
  const stages = new Set<string>();
  for (const file of STEP_STAGE_FILES) {
    const text = readFileSync(resolve(GENERATION_ROOT, file), 'utf8');
    for (const match of text.matchAll(/\bstage:\s*'([A-Z][A-Z_]+)'/gu)) {
      if (match[1] !== undefined) {
        stages.add(match[1]);
      }
    }
  }
  return stages;
}

describe('thread generation stage labels', () => {
  it('has a label key for every stage the service can report', () => {
    for (const stage of Object.values(ThreadGenerationStage)) {
      expect(threadStageLabelKey(stage), stage).toBe(THREAD_STAGE_LABEL_KEYS[stage]);
    }
  });

  it('has a label for every step stage the generation service writes, the planning step included', () => {
    const stages = serviceStepStages();
    // Guards the scanner itself: these are known to be written today.
    for (const known of ['BRIEF', 'FORMAT', 'SYSTEM']) {
      expect(stages, known).toContain(known);
    }
    const missing = [...stages].filter((stage) => threadStageLabelKey(stage) === null);
    expect(missing).toEqual([]);
  });

  it('translates the step-only stage labels instead of copying English', () => {
    for (const [code, dictionary] of Object.entries(LOCALES)) {
      if (code === 'en') {
        continue;
      }
      for (const key of Object.values(THREAD_STEP_STAGE_LABEL_KEYS)) {
        expect(resolveTranslation(dictionary, key), `${code}:${key}`).not.toBe(
          resolveTranslation(en, key),
        );
      }
    }
  });

  it('returns null for a stage this build does not know, so the UI falls back to Loading', () => {
    expect(threadStageLabelKey('SOMETHING_NEW')).toBeNull();
  });

  it('resolves every label, and the round label, to real text in all 13 locales', () => {
    const keys = [
      ...new Set([
        ...Object.values(THREAD_STAGE_LABEL_KEYS),
        ...Object.values(THREAD_STEP_STAGE_LABEL_KEYS),
      ]),
      'chat.threadStageRound',
    ];
    for (const [code, dictionary] of Object.entries(LOCALES)) {
      for (const key of keys) {
        const text = resolveTranslation(dictionary, key);
        expect(typeof text, `${code}:${key}`).toBe('string');
        expect(text, `${code}:${key}`).not.toBe(key);
        expect(String(text).length, `${code}:${key}`).toBeGreaterThan(3);
      }
    }
  });
});
