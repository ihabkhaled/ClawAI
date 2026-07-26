import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicMarkdownRenderer } from '../public-markdown-renderer';

const TRUNCATED = 'shortened';

function renderMarkdown(content: string): HTMLElement {
  const { container } = render(
    <PublicMarkdownRenderer content={content} truncatedLabel={TRUNCATED} />,
  );
  return container;
}

describe('PublicMarkdownRenderer — hostile content', () => {
  // Every message body on this page was written by someone who is not the reader
  // and is rendered from our own origin. Treat all of it as an attack.

  it('does not execute or emit a script tag', () => {
    const container = renderMarkdown('<script>window.__pwned = true;</script>');

    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('script');
  });

  it('does not emit an iframe', () => {
    const container = renderMarkdown('<iframe src="https://evil.example"></iframe>');

    expect(container.querySelector('iframe')).toBeNull();
  });

  it('does not emit an inline event handler', () => {
    const container = renderMarkdown('<img src=x onerror="window.__pwned = true">');

    // The payload survives as visible TEXT (`&lt;img …&gt;`), which is the point:
    // no element is created, so there is no handler to fire. Asserting on the
    // absence of the substring would be wrong — escaped text legitimately still
    // reads "onerror=".
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('onerror');
  });

  it('does not emit a form', () => {
    // A form on our origin is a credential-phishing surface.
    const container = renderMarkdown('<form action="https://evil.example"><input /></form>');

    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('does not emit an svg payload', () => {
    const container = renderMarkdown('<svg><script>alert(1)</script></svg>');

    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('does not emit a style tag', () => {
    const container = renderMarkdown('<style>body { display: none }</style>');

    expect(container.querySelector('style')).toBeNull();
  });

  it('does not allow DOM clobbering via name/id attributes', () => {
    const container = renderMarkdown('<a id="attributes" name="body"></a>');

    // The anchor came from raw HTML, which is escaped entirely.
    expect(container.querySelector('a[id="attributes"]')).toBeNull();
  });

  it('strips a javascript: link down to plain text', () => {
    // Degrades rather than disappears: the reader still sees the label, the
    // browser has nothing to navigate to.
    const container = renderMarkdown('[click me](javascript:alert(1))');

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('click me');
  });

  it('strips a data: link', () => {
    const container = renderMarkdown('[x](data:text/html,<script>alert(1)</script>)');

    expect(container.querySelector('a')).toBeNull();
  });

  it('strips a vbscript: link', () => {
    const container = renderMarkdown('[x](vbscript:msgbox(1))');

    expect(container.querySelector('a')).toBeNull();
  });

  it('marks a safe external link nofollow ugc and noopener', () => {
    const container = renderMarkdown('[docs](https://example.com/docs)');
    const anchor = container.querySelector('a');

    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe('https://example.com/docs');
    // `nofollow ugc` because this is unreviewed user content — passing our
    // ranking signal to it would make published chats an SEO-spam vector.
    const rel = anchor?.getAttribute('rel') ?? '';
    expect(rel).toContain('nofollow');
    expect(rel).toContain('ugc');
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  it('does not load a remote image', () => {
    // A remote <img> fires for every visitor and leaks their IP to a third party
    // the owner never chose.
    const container = renderMarkdown('![alt text](https://tracker.example/pixel.gif)');

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('alt text');
  });
});

describe('PublicMarkdownRenderer — formatting and bounds', () => {
  it('preserves a fenced code block', () => {
    const container = renderMarkdown('```\nconst x = 1;\n```');

    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.textContent).toContain('const x = 1;');
  });

  it('renders GFM tables', () => {
    const container = renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');

    expect(container.querySelector('table')).not.toBeNull();
  });

  it('demotes a message heading below the page and message headings', () => {
    // A message starting with "# " must not outrank the page title in the
    // document outline a screen reader or crawler builds.
    const container = renderMarkdown('# Message heading');

    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('h4')).not.toBeNull();
  });

  it('truncates a pathologically long body and says so', () => {
    // Unbounded markdown parsing on an unauthenticated render path is a
    // denial-of-service against our own SSR.
    const container = renderMarkdown('x'.repeat(80_000));

    expect(container.textContent).toContain(TRUNCATED);
    expect((container.textContent ?? '').length).toBeLessThan(80_000);
  });

  it('does not announce truncation for a normal-length body', () => {
    const container = renderMarkdown('A short message.');

    expect(container.textContent).not.toContain(TRUNCATED);
  });
});
