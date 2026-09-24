import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownRenderer } from '@/lib/markdown/markdown-renderer';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

// Production (claw-ai.co, 2026-09-24, Arabic thread, Kimi via AUTO): a quiz
// answer wrapped in <details><summary>الإجابة</summary>…</details> rendered as
// RAW TEXT, tags and all. Models emit this shape constantly. The renderer now
// parses a small allowlist of inline/disclosure HTML and sanitises everything
// else away.
const QUIZ_ANSWER = [
  'السؤال 1: ما هو ناتج 2 + 2؟',
  '',
  '<details>',
  '<summary>الإجابة</summary>',
  '',
  '<strong>B. 4</strong>',
  '',
  '</details>',
].join('\n');

describe('MarkdownRenderer — allowlisted HTML', () => {
  it('renders <details>/<summary> as a real collapsible, not raw tag text', () => {
    const { container } = render(<MarkdownRenderer content={QUIZ_ANSWER} />);

    expect(container.textContent).not.toContain('<details>');
    expect(container.textContent).not.toContain('<summary>');
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    const summary = details?.querySelector('summary');
    expect(summary).toHaveTextContent('الإجابة');
    expect(details?.querySelector('strong')).toHaveTextContent('B. 4');
  });

  it('starts collapsed and toggles open from the summary', () => {
    const { container } = render(<MarkdownRenderer content={QUIZ_ANSWER} />);
    const details = container.querySelector('details');

    expect(details).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('الإجابة'));
    // jsdom implements the details toggle on summary activation.
    expect(details?.open).toBe(true);
  });

  it('styles the disclosure with theme tokens and a focusable summary', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'<details>\n<summary>S</summary>\n\n<kbd>K</kbd> <mark>M</mark>\n</details>'}
      />,
    );
    expect(container.querySelector('details')).toHaveClass('rounded-lg', 'border-border');
    expect(container.querySelector('summary')).toHaveClass(
      'cursor-pointer',
      'focus-visible:ring-2',
    );
    expect(container.querySelector('kbd')).toHaveClass('font-mono');
    expect(container.querySelector('mark')).toHaveClass('rounded');
  });

  it('keeps a model-supplied open attribute', () => {
    const { container } = render(
      <MarkdownRenderer content={'<details open>\n<summary>Hint</summary>\n\nx\n</details>'} />,
    );
    expect(container.querySelector('details')).toHaveAttribute('open');
  });

  it('renders the inline allowlist: strong, b, em, i, br, sub, sup, kbd, mark', () => {
    const { container } = render(
      <MarkdownRenderer content="a <strong>s</strong> <b>b</b> <em>e</em> <i>i</i> H<sub>2</sub>O x<sup>2</sup> <kbd>Ctrl</kbd> <mark>hi</mark><br>next" />,
    );
    for (const tag of ['strong', 'b', 'em', 'i', 'sub', 'sup', 'kbd', 'mark', 'br']) {
      expect(container.querySelector(tag), tag).not.toBeNull();
    }
    expect(container.textContent).not.toContain('<kbd>');
  });

  it('still renders markdown inside a details block', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'<details>\n<summary>S</summary>\n\n- one\n- **two**\n\n</details>'}
      />,
    );
    expect(container.querySelectorAll('details li')).toHaveLength(2);
    expect(container.querySelector('details li strong')).toHaveTextContent('two');
  });
});

describe('MarkdownRenderer — XSS', () => {
  it('drops <script> entirely, including its body', () => {
    const { container } = render(
      <MarkdownRenderer content="hi <script>window.pwned = 1</script> there" />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('window.pwned');
  });

  it('strips on* event handler attributes', () => {
    const { container } = render(
      <MarkdownRenderer
        content={
          '<details ontoggle="alert(1)" open><summary onclick="alert(2)">S</summary>x</details>\n\n<img src="x" onerror="alert(3)">'
        }
      />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain('ontoggle');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(');
  });

  it('removes iframe, object, embed, style, form and svg payloads', () => {
    const { container } = render(
      <MarkdownRenderer
        content={[
          '<iframe src="https://evil.example"></iframe>',
          '<object data="x"></object><embed src="x">',
          '<style>body{display:none}</style>',
          '<form action="https://evil.example"><input name="p"></form>',
          '<svg><script>alert(1)</script></svg>',
        ].join('\n\n')}
      />,
    );
    for (const tag of ['iframe', 'object', 'embed', 'style', 'form', 'svg', 'script']) {
      expect(container.querySelector(tag), tag).toBeNull();
    }
    expect(container.textContent).not.toContain('display:none');
  });

  it('strips inline style and arbitrary class attributes from allowed tags', () => {
    const { container } = render(
      <MarkdownRenderer content='<mark style="position:fixed;inset:0" class="fixed inset-0">x</mark>' />,
    );
    const mark = container.querySelector('mark');
    expect(mark).not.toHaveAttribute('style');
    expect(mark?.className ?? '').not.toContain('inset-0');
  });

  it('neutralises javascript: and data: URLs in raw anchors and markdown links', () => {
    const { container } = render(
      <MarkdownRenderer content='<a href="javascript:alert(1)">a</a> [b](javascript:alert(2)) <a href="data:text/html,<script>alert(3)</script>">c</a>' />,
    );
    for (const anchor of Array.from(container.querySelectorAll('a'))) {
      const href = (anchor.getAttribute('href') ?? '').toLowerCase();
      expect(href.startsWith('javascript:')).toBe(false);
      expect(href.startsWith('data:')).toBe(false);
    }
  });

  it('refuses raw ids that could clobber window globals', () => {
    const { container } = render(<MarkdownRenderer content='<b id="__NEXT_DATA__">x</b>' />);
    expect(container.querySelector('#__NEXT_DATA__')).toBeNull();
  });

  it('keeps GFM footnote links working (ids and hrefs still match)', () => {
    const { container } = render(<MarkdownRenderer content={'Claim[^1]\n\n[^1]: Source'} />);
    const ref = container.querySelector('a[data-footnote-ref]');
    const target = ref?.getAttribute('href')?.slice(1) ?? '';
    expect(target.length).toBeGreaterThan(0);
    expect(container.querySelector(`[id="${target}"]`)).not.toBeNull();
  });

  it('keeps fenced code highlighting and GFM task lists intact', () => {
    const { container } = render(
      <MarkdownRenderer content={'```ts\nconst a = 1;\n```\n\n- [x] done\n- [ ] todo'} />,
    );
    expect(container.querySelector('code.language-ts')).not.toBeNull();
    expect(container.querySelector('code .hljs-keyword')).not.toBeNull();
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  });

  it('keeps relative generated-image markdown working', () => {
    render(<MarkdownRenderer content="![cat](/api/v1/files/download/abc)" />);
    expect(screen.getByRole('img', { name: 'cat' }).getAttribute('src')).toContain(
      '/api/v1/files/download/abc',
    );
  });
});
