import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImageMaskRefusalNotice } from '@/components/chat/image-mask-refusal-notice';
import { ImageMaskRefusalCode } from '@/enums/image-mask-refusal-code.enum';
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

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ImageMaskRefusalNotice', () => {
  it('explains an invalid mask', () => {
    render(<ImageMaskRefusalNotice code={ImageMaskRefusalCode.MaskInvalid} />);

    expect(screen.getByText('chat.maskEdit.refusal.title')).toBeInTheDocument();
    expect(screen.getByText('chat.maskEdit.refusal.invalid')).toBeInTheDocument();
  });

  it('explains a model that cannot take a mask', () => {
    render(<ImageMaskRefusalNotice code={ImageMaskRefusalCode.MaskNotSupported} />);

    expect(screen.getByText('chat.maskEdit.refusal.notSupported')).toBeInTheDocument();
    expect(screen.queryByText('chat.maskEdit.refusal.invalid')).not.toBeInTheDocument();
  });
});

describe('chat.maskEdit — real translations in all 13 locales', () => {
  const locales = { ar, de, en, es, fa, fr, hi, it: itLocale, ja, pt, ru, th, zh };

  it.each(Object.entries(locales))(
    '%s has every key, and translates it (not English)',
    (name, dict) => {
      const block = dict.chat.maskEdit;
      const keys = Object.keys(en.chat.maskEdit).sort();

      expect(Object.keys(block).sort()).toEqual(keys);
      expect(Object.keys(block.refusal).sort()).toEqual(
        Object.keys(en.chat.maskEdit.refusal).sort(),
      );
      if (name !== 'en') {
        expect(block.title).not.toBe(en.chat.maskEdit.title);
        expect(block.refusal.notSupported).not.toBe(en.chat.maskEdit.refusal.notSupported);
      }
      expect(block.actionFor).toContain('{name}');
    },
  );
});
