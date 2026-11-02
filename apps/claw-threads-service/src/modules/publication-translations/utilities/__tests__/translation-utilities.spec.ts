import { Locale } from '@claw/shared-types';

import { splitMarkdownForTranslation } from '../translation-chunks.utility';
import {
  addsNoLinksOrMarkup,
  isPlausibleTranslation,
  parseBodyChunk,
  parseTitledChunk,
  stripOuterFence,
  stripReasoning,
} from '../translation-output.utility';
import { buildTranslationPrompt } from '../translation-prompt.utility';

describe('splitMarkdownForTranslation', () => {
  it('keeps a short article whole', () => {
    expect(splitMarkdownForTranslation('# A\n\nText.', 5000)).toEqual(['# A\n\nText.']);
  });

  it('splits at blank lines once a chunk is full and loses nothing', () => {
    const paragraphs = Array.from(
      { length: 6 },
      (_, index) => `Paragraph ${String(index)} ${'x'.repeat(40)}`,
    );
    const chunks = splitMarkdownForTranslation(paragraphs.join('\n\n'), 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('\n\n').replaceAll(/\n{2,}/gu, '\n\n')).toBe(paragraphs.join('\n\n'));
  });

  it('never cuts inside a code fence', () => {
    const markdown = [
      'intro text here',
      '',
      '```',
      'line one',
      '',
      'line two',
      '```',
      '',
      'after',
    ].join('\n');
    const chunks = splitMarkdownForTranslation(markdown, 5);
    const fenced = chunks.find((chunk) => chunk.includes('line one'));
    expect(fenced).toContain('line two');
  });
});

describe('translation output parsing', () => {
  it('reads the title and the body of the first chunk', () => {
    expect(parseTitledChunk('TITLE:\nعنوان\n\nBODY:\n# نص')).toEqual({
      title: 'عنوان',
      body: '# نص',
    });
  });

  it('refuses a first chunk without the markers or with an empty part', () => {
    expect(parseTitledChunk('just a translation')).toBeNull();
    expect(parseTitledChunk('TITLE:\n\nBODY:\ntext')).toBeNull();
    expect(parseTitledChunk('TITLE:\nt\n\nBODY:\n')).toBeNull();
  });

  it('strips a fence the model wrapped around the whole answer, and only that', () => {
    expect(stripOuterFence('```markdown\nhello\n```')).toBe('hello');
    expect(stripOuterFence('hello\n\n```js\ncode\n```')).toBe('hello\n\n```js\ncode\n```');
  });

  it('takes a continuation chunk as is, dropping a repeated BODY marker', () => {
    expect(parseBodyChunk('BODY:\nmore')).toBe('more');
    expect(parseBodyChunk('more')).toBe('more');
    expect(parseBodyChunk('  ')).toBeNull();
  });

  it('rejects empty, runaway, truncated and fence-broken translations', () => {
    const source = 'word '.repeat(200);
    expect(isPlausibleTranslation(source, 'translated '.repeat(190))).toBe(true);
    expect(isPlausibleTranslation(source, '')).toBe(false);
    expect(isPlausibleTranslation(source, 'ok')).toBe(false);
    expect(isPlausibleTranslation(source, 'x'.repeat(source.length * 6))).toBe(false);
    expect(isPlausibleTranslation('a ```\ncode\n``` b', 'a ``` b')).toBe(false);
  });
});

describe('addsNoLinksOrMarkup', () => {
  const source = 'See [the docs](https://example.org/a) and https://example.org/b.';

  it('accepts a translation that keeps the same links', () => {
    expect(
      addsNoLinksOrMarkup(source, 'Voir [la doc](https://example.org/a) et https://example.org/b.'),
    ).toBe(true);
  });

  it('rejects a link the source did not have, even inside Markdown', () => {
    expect(addsNoLinksOrMarkup(source, 'Voir [la doc](https://evil.example/x).')).toBe(false);
    expect(addsNoLinksOrMarkup('plain text', 'texte https://evil.example')).toBe(false);
  });

  it('finds links the way a renderer does: other letter case, www, protocol-relative, any scheme', () => {
    for (const added of [
      'texte HTTPS://EVIL.example/x',
      'texte www.evil.example',
      'texte [x](//evil.example/x)',
      'texte [x](mailto:a@evil.example)',
      'texte [x](data:text/html;base64,AAAA)',
      'texte [x](&#104;ttps://evil.example/x)',
      'texte [x](java\\script:alert(1))',
      'texte [x](/relative/but/new)',
      'texte\n\n[ref]: ftp://evil.example/x',
    ]) {
      expect(addsNoLinksOrMarkup('plain text', added), added).toBe(false);
    }
  });

  it('does not read the punctuation of Japanese, Hindi or Arabic text as part of a link', () => {
    const sourceText = 'المصدر https://arxiv.org/pdf/2209.13085، وكذلك www.example.org/a.';
    expect(
      addsNoLinksOrMarkup(
        sourceText,
        '出典 https://arxiv.org/pdf/2209.13085。また www.example.org/a。',
      ),
    ).toBe(true);
    expect(
      addsNoLinksOrMarkup(
        sourceText,
        'स्रोत https://arxiv.org/pdf/2209.13085। और www.example.org/a।',
      ),
    ).toBe(true);
    expect(addsNoLinksOrMarkup(sourceText, '出典 https://evil.example/x。')).toBe(false);
  });

  it('rejects a link whose host starts with a non-ASCII letter, which the link pattern cannot read', () => {
    for (const added of [
      'texte https://évil.example/x',
      'texte //экзамен.example',
      'texte www.пример.рф',
    ]) {
      expect(addsNoLinksOrMarkup('plain text', added), added).toBe(false);
    }
    expect(addsNoLinksOrMarkup('see https://пример.рф/a', 'voir https://пример.рф/a')).toBe(true);
  });

  it('keeps the same link written in another letter case and relative links', () => {
    expect(
      addsNoLinksOrMarkup(source, 'Voir [la doc](HTTPS://EXAMPLE.ORG/a) et https://example.org/b'),
    ).toBe(true);
    expect(addsNoLinksOrMarkup('see [x](#intro)', 'voir [x](#introduction) et [y](/en/page)')).toBe(
      false,
    );
    expect(addsNoLinksOrMarkup('see [x](#intro)', 'voir [x](#introduction)')).toBe(true);
  });

  it('rejects added tags and script addresses but keeps the source own tags', () => {
    expect(addsNoLinksOrMarkup('text', 'texte <script>alert(1)</script>')).toBe(false);
    expect(addsNoLinksOrMarkup('text', '[x](javascript:alert(1))')).toBe(false);
    expect(addsNoLinksOrMarkup('a <b>bold</b> word', 'un mot <b>gras</b>')).toBe(true);
  });
});

describe('stripReasoning', () => {
  it('keeps only the answer after the reasoning block, whose notes repeat the markers', () => {
    const reply = '<thought>TITLE: draft\nBODY: draft</thought>TITLE:\nعنوان\n\nBODY:\nنص';
    expect(stripReasoning(reply)).toBe('TITLE:\nعنوان\n\nBODY:\nنص');
    expect(parseTitledChunk(reply)).toEqual({ title: 'عنوان', body: 'نص' });
  });

  it('treats a reasoning block that never closes as a cut-off reply', () => {
    expect(stripReasoning('<thought>still thinking about the')).toBe('');
    expect(parseBodyChunk('<think>half')).toBeNull();
  });

  it('leaves a reply without reasoning alone', () => {
    expect(stripReasoning('plain')).toBe('plain');
  });
});

describe('buildTranslationPrompt', () => {
  it('asks for the title and the body on the first chunk', () => {
    const prompt = buildTranslationPrompt({
      from: Locale.EN,
      to: Locale.AR,
      chunk: 'Body text',
      title: 'My title',
    });
    expect(prompt).toContain('from English to Arabic');
    expect(prompt).toContain('TITLE:\nMy title');
    expect(prompt).toContain('BODY:\nBody text');
  });

  it('sends only the text on a continuation chunk', () => {
    const prompt = buildTranslationPrompt({
      from: Locale.EN,
      to: Locale.TH,
      chunk: 'More',
      title: null,
    });
    expect(prompt).toContain('to Thai');
    expect(prompt).not.toContain('TITLE:');
  });
});
