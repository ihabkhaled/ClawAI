import {
  detectConfirmationLocale,
  previewOf,
  renderSaveConfirmation,
  savedPackName,
} from '../save-confirmation.utility';
import { SAVE_CONFIRMATIONS } from '../../constants/save-to-context.constants';

describe('detectConfirmationLocale', () => {
  it.each([
    ['Remember this: I work at Myoncare.', 'en'],
    ['تذكر هذا: اسمي إيهاب', 'ar'],
    ['این را به خاطر بسپار: من در Myoncare کار می‌کنم.', 'fa'],
    ['Merk dir das: ich arbeite bei Myoncare.', 'de'],
    ['Souviens-toi de ça : je travaille chez Myoncare.', 'fr'],
    ['Recuerda esto: trabajo en Myoncare.', 'es'],
    ['Ricorda questo: lavoro in Myoncare.', 'it'],
    ['Lembre-se disso: trabalho na Myoncare.', 'pt'],
    ['Запомни это: я работаю в Myoncare.', 'ru'],
    ['इसे याद रखो: मैं Myoncare में काम करता हूँ।', 'hi'],
    ['これを覚えて：私はMyoncareで働いています。', 'ja'],
    ['记住这个：我在Myoncare工作。', 'zh'],
    ['จำสิ่งนี้ไว้: ฉันทำงานที่ Myoncare', 'th'],
  ])('"%s" → %s', (text, locale) => {
    expect(detectConfirmationLocale(text)).toBe(locale);
  });
});

describe('renderSaveConfirmation', () => {
  it('has every template, reason and type filled for all 13 locales', () => {
    const locales = Object.keys(SAVE_CONFIRMATIONS);
    expect(locales.sort()).toEqual(
      ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'it', 'ja', 'pt', 'ru', 'th', 'zh'].sort(),
    );
    for (const locale of locales as Array<keyof typeof SAVE_CONFIRMATIONS>) {
      const memory = renderSaveConfirmation(
        {
          kind: 'MEMORY',
          memoryId: 'm',
          memoryType: 'INSTRUCTION',
          size: 45_000,
          preview: 'p',
          created: true,
        },
        locale,
      );
      const pack = renderSaveConfirmation(
        { kind: 'PACK', packId: 'p', name: 'Myoncare QA', size: 250_000, created: true },
        locale,
      );
      const failed = renderSaveConfirmation({ kind: 'FAILED', reason: 'LIMIT' }, locale);
      for (const text of [memory, pack, failed]) expect(text).not.toMatch(/\{\w+\}/u);
      expect(memory).toContain('(/memory)');
      expect(memory).toContain(SAVE_CONFIRMATIONS[locale].types.INSTRUCTION);
      expect(pack).toContain('(/context)');
      expect(pack).toContain('Myoncare QA');
      expect(renderSaveConfirmation({ kind: 'ASK' }, locale).length).toBeGreaterThan(10);
    }
  });

  it("formats the size in the reader's locale", () => {
    const text = renderSaveConfirmation(
      { kind: 'PACK', packId: 'p', name: 'X', size: 45_000, created: true },
      'en',
    );
    expect(text).toContain('45,000 characters');
  });
});

describe('savedPackName / previewOf', () => {
  it('names a pack after its first heading, without markdown marks', () => {
    expect(savedPackName('intro\n\n# **MYONCARE** QA PACK\n\nbody')).toBe('MYONCARE QA PACK');
    expect(savedPackName('First line only\nsecond')).toBe('First line only');
    expect(savedPackName('   ')).toBe('Saved from chat');
  });

  it('previews one line of at most 80 characters', () => {
    const preview = previewOf(`line one\nline two ${'x'.repeat(200)}`);
    expect(preview.length).toBeLessThanOrEqual(80);
    expect(preview.startsWith('line one line two')).toBe(true);
  });
});
