import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThreadArticleBody } from '@/components/threads/article/thread-article-body';
import { ThreadArticleMarkdown } from '@/components/threads/article/thread-article-markdown';
import type { ThreadArticleLabels } from '@/types/thread-article.types';
import { extractThreadToc } from '@/utilities/thread-article-toc.utility';

const labels: ThreadArticleLabels = {
  toc: 'On this page',
  copyLink: 'Copy link to this section',
  linkCopied: 'Link copied',
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
};

function renderArticle(markdown: string, title?: string): HTMLElement {
  const { container } = render(
    <ThreadArticleMarkdown
      markdown={markdown}
      title={title}
      labels={labels}
      truncatedLabel="cut"
    />,
  );
  return container;
}

const RICH = [
  '# Solar costs',
  '',
  '## Key takeaways',
  '',
  '- Cheaper than ever',
  '- Pays back in 8 years',
  '',
  '## Panel types',
  '',
  '| Type | Efficiency |',
  '| --- | ---: |',
  '| Mono | 22% |',
  '| Poly | 17% |',
  '',
  '1. Compare quotes',
  '2. Check the roof',
  '',
  '> **Note:** Prices vary by region.',
  '',
  '> **Tip:** Ask for three quotes.',
  '',
  '> **Warning:** Old roofs may need repair.',
  '',
  '> An ordinary quotation.',
  '',
  '```ts',
  'const x = 1;',
  '```',
  '',
  '---',
  '',
  '### Sources',
  '',
  'See [the source](https://example.com/a) and [local](#panel-types).',
].join('\n');

describe('ThreadArticleMarkdown rendering', () => {
  it('renders headings with anchors, drops the repeated page title and keeps one outline', () => {
    const root = renderArticle(RICH, 'Solar costs');
    expect(root.querySelectorAll('h1')).toHaveLength(0);
    const h2 = [...root.querySelectorAll('h2')];
    expect(h2.map((heading) => heading.id)).toEqual(['key-takeaways', 'panel-types']);
    expect(root.querySelector('h3')?.id).toBe('sources');
  });

  it('turns a different first H1 into an h2 so the page keeps its single h1', () => {
    const root = renderArticle('# Another title\n\n## A', 'Solar costs');
    expect(root.querySelectorAll('h1')).toHaveLength(0);
    expect(root.querySelector('h2')?.id).toBe('another-title');
  });

  it('puts a copy-link anchor on every section heading', () => {
    const root = renderArticle(RICH, 'Solar costs');
    const link = root.querySelector('#panel-types a[href="#panel-types"]');
    expect(link?.getAttribute('aria-label')).toBe('Copy link to this section');
  });

  it('renders tables inside a scrolling region with a header row', () => {
    const root = renderArticle(RICH, 'Solar costs');
    const region = root.querySelector('[data-thread-table]');
    expect(region?.className).toContain('overflow-auto');
    expect(region?.querySelectorAll('thead th')).toHaveLength(2);
    expect(region?.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('renders lists, code, rules and ordinary quotes', () => {
    const root = renderArticle(RICH, 'Solar costs');
    expect(root.querySelectorAll('ul li')).toHaveLength(2);
    expect(root.querySelectorAll('ol li')).toHaveLength(2);
    expect(root.querySelector('pre code')?.textContent).toContain('const x = 1;');
    expect(root.querySelector('hr')).not.toBeNull();
    const plain = [...root.querySelectorAll('blockquote')].filter(
      (quote) => quote.getAttribute('data-callout') === null,
    );
    expect(plain).toHaveLength(1);
  });

  it('styles Note, Tip and Warning callouts with an icon and a screen-reader label', () => {
    const root = renderArticle(RICH, 'Solar costs');
    const kinds = [...root.querySelectorAll('[data-callout]')].map((el) =>
      el.getAttribute('data-callout'),
    );
    expect(kinds).toEqual(['note', 'tip', 'warning']);
    const warning = root.querySelector('[data-callout="warning"]');
    expect(warning?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(warning?.querySelector('.sr-only')?.textContent).toContain('Warning');
  });

  it('recognises callout labels written in other languages', () => {
    const root = renderArticle(
      '> **تحذير:** انتبه\n\n> **Hinweis:** Text\n\n> **ヒント:** 本文\n\n> **Consejo:** texto',
    );
    expect(
      [...root.querySelectorAll('[data-callout]')].map((el) => el.getAttribute('data-callout')),
    ).toEqual(['warning', 'note', 'tip', 'tip']);
  });

  it('opens outside links safely and leaves section links on the page', () => {
    const root = renderArticle(RICH, 'Solar costs');
    const external = root.querySelector('a[href="https://example.com/a"]');
    expect(external?.getAttribute('rel')).toBe('noopener noreferrer nofollow ugc');
    expect(external?.getAttribute('target')).toBe('_blank');
    const local = root.querySelector('a[href="#panel-types"]:not([aria-label])');
    expect(local?.getAttribute('target')).toBeNull();
  });
});

describe('ThreadArticleMarkdown sanitisation', () => {
  const HOSTILE = [
    '<script>alert(1)</script>',
    '<iframe src="https://evil.example"></iframe>',
    '<img src=x onerror="alert(1)">',
    '<div style="position:fixed" onclick="alert(1)">box</div>',
    '<svg onload="alert(1)"><circle/></svg>',
    '<a href="javascript:alert(1)">js</a>',
    '[click](javascript:alert(1))',
    '[data](data:text/html;base64,PHNjcmlwdD4=)',
    '![pixel](https://tracker.example/p.gif)',
    '<style>body{display:none}</style>',
    '<form action="https://evil.example"><input name="x"></form>',
    '## Heading with <b onmouseover="alert(1)">html</b>',
  ].join('\n\n');

  it('renders no script, iframe, style, form, svg, event handler or image element', () => {
    const root = renderArticle(HOSTILE);
    expect(
      root.querySelector('script, iframe, style, form, input, svg:not([aria-hidden])'),
    ).toBeNull();
    expect(root.querySelector('img')).toBeNull();
    for (const element of root.querySelectorAll('*')) {
      for (const attribute of element.getAttributeNames()) {
        expect(attribute.startsWith('on')).toBe(false);
      }
      expect(element.getAttribute('style')).toBeNull();
    }
  });

  it('never creates a javascript: or data: link', () => {
    const root = renderArticle(HOSTILE);
    const hrefs = [...root.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((href) => /^(javascript|data):/iu.test(href))).toBe(false);
  });

  it('shows an image as its alt text only, never as a request to another site', () => {
    const root = renderArticle('![A chart of costs](https://tracker.example/p.gif)');
    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('A chart of costs');
  });

  it('keeps the words of dropped html out of the way without executing anything', () => {
    const root = renderArticle('Before <script>window.hacked = 1</script> after');
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
    expect(root.textContent).toContain('Before');
    expect(root.textContent).toContain('after');
  });

  it('truncates past the render cap and says so', () => {
    const root = renderArticle('word '.repeat(30_000));
    expect(root.textContent).toContain('cut');
  });
});

describe('ThreadArticleMarkdown right-to-left and unspaced text', () => {
  it('anchors Arabic headings with their own letters', () => {
    const root = renderArticle('## أهم النقاط\n\nنص\n\n## المصادر');
    expect([...root.querySelectorAll('h2')].map((heading) => heading.id)).toEqual([
      'أهم-النقاط',
      'المصادر',
    ]);
  });

  it('uses logical alignment so a table mirrors in a right-to-left article', () => {
    const root = renderArticle('| أ | ب |\n| --- | --- |\n| ١ | ٢ |');
    expect(root.querySelector('table')?.className).toContain('[&_th]:text-start');
  });
});

describe('table of contents and ids agree', () => {
  const batteries = [
    RICH,
    '## Q&A\n\n## **Bold** and `code`\n\n## [Link](https://x.test) text\n\n## Same\n\n## Same',
    '## أهم النقاط\n\n### تفاصيل\n\n## المصادر',
    '## 価格の推移\n\n## 出典',
    '# Title\n\n## 1\\. Intro\n\n## Café Münster',
  ];
  it.each(batteries)('lists exactly the ids the headings carry', (markdown) => {
    const root = renderArticle(markdown, 'Title');
    const rendered = [...root.querySelectorAll('h2[id], h3[id]')].map((el) => el.id);
    expect(extractThreadToc(markdown, 'Title').map((item) => item.id)).toEqual(rendered);
  });
});

describe('ThreadArticleBody', () => {
  const props = { labels, truncatedLabel: '', readingTimeLabel: '5 min read' } as const;

  it('shows a table of contents only for three or more headings', () => {
    const few = '## One\n\ntext\n\n## Two';
    const { container, rerender } = render(
      <ThreadArticleBody {...props} markdown={few} toc={extractThreadToc(few)} />,
    );
    expect(container.querySelector('nav')).toBeNull();
    const many = '## One\n\n## Two\n\n## Three';
    rerender(<ThreadArticleBody {...props} markdown={many} toc={extractThreadToc(many)} />);
    expect(container.querySelectorAll('nav')).toHaveLength(2);
    expect(container.querySelector('details summary')?.textContent).toBe('On this page');
    expect(container.querySelectorAll('nav a[href="#two"]')).toHaveLength(2);
  });

  it('shows the reading time', () => {
    const { getByTestId } = render(<ThreadArticleBody {...props} markdown="Text" toc={[]} />);
    expect(getByTestId('thread-reading-time').textContent).toBe('5 min read');
  });
});
