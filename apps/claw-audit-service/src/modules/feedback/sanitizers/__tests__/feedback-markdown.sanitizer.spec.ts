import { FEEDBACK_MAX_CONTENT_LENGTH } from '@claw/shared-constants';

import { sanitizeFeedbackMarkdown, toSearchText } from '../feedback-markdown.sanitizer';

// Feedback content is hostile input. These are the payloads an attacker would
// actually try, including the encoded and nested forms that defeat naive
// tag-stripping. The invariant every one of them is checked against: after
// sanitisation the stored text contains no `<`, so it contains no HTML element,
// and no link target carries an executable scheme.

const XSS_PAYLOADS: readonly string[] = [
  '<script>alert(1)</script>',
  '<SCRIPT>alert(1)</SCRIPT>',
  '<img src=x onerror=alert(1)>',
  '<img src="x" onerror="alert(1)">',
  '<svg onload=alert(1)></svg>',
  '<svg><script>alert(1)</script></svg>',
  '<iframe src="https://evil.test"></iframe>',
  '<object data="data:text/html;base64,PHNjcmlwdD4="></object>',
  '<embed src="https://evil.test/x.swf">',
  '<body onload=alert(1)>',
  '<style>@import "https://evil.test/x.css";</style>',
  '<link rel="stylesheet" href="https://evil.test/x.css">',
  '<meta http-equiv="refresh" content="0;url=https://evil.test">',
  '<form action="https://evil.test"><input name="a"></form>',
  '<a href="javascript:alert(1)">x</a>',
  '<div onclick="alert(1)">x</div>',
  '<!-- <script>alert(1)</script> -->',
  '<<div>>text',
  // Nesting: removing the inner match splices the outer into a fresh tag.
  '<scr<!-- -->ipt>alert(1)</scr<!-- -->ipt>',
  '<scr<script>ipt>alert(1)',
  '<<script>script>alert(1)',
  '<script␀>alert(1)</script>',
  '<textarea></textarea><script>alert(1)</script>',
  '<math><mtext><script>alert(1)</script></mtext></math>',
];

const DANGEROUS_LINKS: readonly string[] = [
  '[x](javascript:alert(1))',
  '[x](JaVaScRiPt:alert(1))',
  '[x](  javascript:alert(1))',
  '[x](java\tscript:alert(1))',
  '[x](java&#115;cript:alert(1))',
  '[x](java&#x73;cript:alert(1))',
  '[x](java%73cript:alert(1))',
  '[x](%6Aavascript:alert(1))',
  '[x](javascript&colon;alert(1))',
  '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
  '[x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)',
  '[x](vbscript:msgbox(1))',
  '[x](file:///etc/passwd)',
  '![x](javascript:alert(1))',
  '![x](vbscript:msgbox(1))',
];

describe('feedback markdown sanitizer — XSS and HTML injection', () => {
  it.each(XSS_PAYLOADS)('leaves no HTML element in %s', (payload) => {
    const output = sanitizeFeedbackMarkdown(payload);

    // The single invariant that makes the whole class impossible: escaping is
    // a one-pass character substitution, so no output can contain `<` and
    // therefore no output can contain a tag, whatever the nesting was.
    expect(output).not.toContain('<');
    expect(output.toLowerCase()).not.toContain('<script');
    expect(output.toLowerCase()).not.toContain('<iframe');
    expect(output.toLowerCase()).not.toContain('<svg');
  });

  it('escapes rather than deletes, so the author still sees what they wrote', () => {
    expect(sanitizeFeedbackMarkdown('<script>alert(1)</script>')).toBe(
      '&lt;script>alert(1)&lt;/script>',
    );
  });

  it('escapes ampersands before angle brackets so entities cannot be re-formed', () => {
    // If `<` were escaped first, an author writing `&lt;` would end up with a
    // string that a downstream decoder could turn back into a real `<`.
    expect(sanitizeFeedbackMarkdown('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
  });

  it('cannot be made to emit a tag by any nesting of comments and elements', () => {
    for (const payload of XSS_PAYLOADS) {
      expect(sanitizeFeedbackMarkdown(payload)).not.toMatch(/<[a-zA-Z!/]/u);
    }
  });
});

describe('feedback markdown sanitizer — URL scheme injection', () => {
  it.each(DANGEROUS_LINKS)('strips the link target in %s', (payload) => {
    const output = sanitizeFeedbackMarkdown(payload).toLowerCase();

    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('vbscript:');
    expect(output).not.toContain('data:text/html');
    expect(output).not.toContain('file://');
    // The visible text survives; only the target is discarded.
    expect(output).not.toMatch(/\]\(/u);
  });

  it('keeps a link whose scheme is explicitly allowed', () => {
    expect(sanitizeFeedbackMarkdown('[ok](https://example.test)')).toContain(
      '[ok](https://example.test)',
    );
    expect(sanitizeFeedbackMarkdown('[ok](http://example.test)')).toContain(
      '[ok](http://example.test)',
    );
    expect(sanitizeFeedbackMarkdown('[mail](mailto:a@b.test)')).toContain(
      '[mail](mailto:a@b.test)',
    );
  });

  it('keeps a relative link, which carries no scheme at all', () => {
    expect(sanitizeFeedbackMarkdown('[doc](./guide.md)')).toContain('[doc](./guide.md)');
    expect(sanitizeFeedbackMarkdown('[doc](/docs/guide.md)')).toContain('[doc](/docs/guide.md)');
  });
});

describe('feedback markdown sanitizer — control characters and resource limits', () => {
  it('removes NUL and other C0 control characters', () => {
    const withNul = `before${String.fromCharCode(0)}after`;
    const withBell = `a${String.fromCharCode(7)}b`;

    expect(sanitizeFeedbackMarkdown(withNul)).toBe('beforeafter');
    expect(sanitizeFeedbackMarkdown(withBell)).toBe('ab');
  });

  it('keeps newlines and tabs, which are legitimate in Markdown', () => {
    expect(sanitizeFeedbackMarkdown('line\nnext\tcell')).toBe('line\nnext\tcell');
  });

  it('caps the stored content at the shared limit', () => {
    const output = sanitizeFeedbackMarkdown('a'.repeat(FEEDBACK_MAX_CONTENT_LENGTH + 5_000));

    expect(output.length).toBe(FEEDBACK_MAX_CONTENT_LENGTH);
  });

  it('terminates on a self-referential encoding instead of looping', () => {
    const start = Date.now();
    sanitizeFeedbackMarkdown(`[x](${'%25'.repeat(500)}javascript:alert(1))`);

    expect(Date.now() - start).toBeLessThan(2_000);
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeFeedbackMarkdown('')).toBe('');
  });
});

describe('feedback markdown sanitizer — legitimate formatting survives', () => {
  it.each([
    ['**bold**', '**bold**'],
    ['*italic*', '*italic*'],
    ['- item', '- item'],
    ['1. item', '1. item'],
    ['# Heading', '# Heading'],
    ['## Sub heading', '## Sub heading'],
    ['`inline code`', '`inline code`'],
    ['> quoted', '> quoted'],
    ['plain sentence.', 'plain sentence.'],
  ])('preserves %s', (input, expected) => {
    expect(sanitizeFeedbackMarkdown(input)).toBe(expected);
  });

  it('preserves a fenced code block', () => {
    const block = '```ts\nconst a = 1;\n```';

    expect(sanitizeFeedbackMarkdown(block)).toBe(block);
  });
});

describe('toSearchText', () => {
  it('strips Markdown syntax', () => {
    const text = toSearchText('# Title with **bold** and `code`');

    expect(text).not.toContain('#');
    expect(text).not.toContain('**');
    expect(text).not.toContain('`');
    expect(text).toContain('title with bold and code');
  });

  it('keeps the visible text of a link and drops its target', () => {
    const text = toSearchText('[click here](https://example.test)');

    expect(text).toContain('click here');
    expect(text).not.toContain('example.test');
  });

  it('collapses whitespace and trims', () => {
    expect(toSearchText('  a   \n\n  b  ')).toBe('a b');
  });

  it('drops fenced code blocks so a paste does not swamp the index', () => {
    expect(toSearchText('before\n```\nnoise noise\n```\nafter')).toBe('before after');
  });
});
