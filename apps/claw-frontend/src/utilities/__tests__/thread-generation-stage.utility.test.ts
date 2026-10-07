import { describe, expect, it } from 'vitest';

import { THREAD_STAGE_LABEL_KEYS } from '@/constants/thread-generation-stage.constants';
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

describe('thread generation stage labels', () => {
  it('has a label key for every stage the service can report', () => {
    for (const stage of Object.values(ThreadGenerationStage)) {
      expect(threadStageLabelKey(stage), stage).toBe(THREAD_STAGE_LABEL_KEYS[stage]);
    }
  });

  it('returns null for a stage this build does not know, so the UI falls back to Loading', () => {
    expect(threadStageLabelKey('SOMETHING_NEW')).toBeNull();
  });

  it('resolves every label, and the round label, to real text in all 13 locales', () => {
    const keys = [...new Set(Object.values(THREAD_STAGE_LABEL_KEYS)), 'chat.threadStageRound'];
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
