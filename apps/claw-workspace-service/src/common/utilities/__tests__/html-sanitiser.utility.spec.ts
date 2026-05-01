import { sanitiseHtml, stripImages } from '../html-sanitiser.utility';

describe('sanitiseHtml — XSS payload catalog', () => {
  const xssPayloads: Array<{ name: string; html: string; mustNotInclude: string[] }> = [
    {
      name: 'inline script tag',
      html: '<p>before</p><script>alert(1)</script><p>after</p>',
      mustNotInclude: ['<script', 'alert(1)'],
    },
    {
      name: 'img onerror handler',
      html: '<img src=x onerror=alert(2)>',
      mustNotInclude: ['onerror', 'alert(2)'],
    },
    {
      name: 'javascript: href',
      html: '<a href="javascript:alert(3)">click</a>',
      mustNotInclude: ['javascript:', 'alert(3)'],
    },
    {
      name: 'data: URI executable',
      html: '<a href="data:text/html,<script>alert(4)</script>">click</a>',
      mustNotInclude: ['data:text/html', 'alert(4)'],
    },
    {
      name: 'svg with embedded script',
      html: '<svg><script>alert(5)</script></svg>',
      mustNotInclude: ['<script', 'alert(5)'],
    },
    {
      name: 'iframe src',
      html: '<iframe src="https://evil.com"></iframe>',
      mustNotInclude: ['<iframe'],
    },
    {
      name: 'object embed',
      html: '<object data="evil.swf"></object>',
      mustNotInclude: ['<object'],
    },
    {
      name: 'embed tag',
      html: '<embed src="evil.swf">',
      mustNotInclude: ['<embed'],
    },
    {
      name: 'style tag with @import',
      html: '<style>@import url("evil.css");</style>',
      mustNotInclude: ['<style', '@import'],
    },
    {
      name: 'event handler nested',
      html: '<div onclick="alert(6)"><span>click</span></div>',
      mustNotInclude: ['onclick', 'alert(6)'],
    },
    {
      name: 'mixed-case script',
      html: '<ScRiPt>alert(7)</ScRiPt>',
      mustNotInclude: ['<ScRiPt', 'alert(7)', '<script'],
    },
    {
      name: 'srcdoc attribute',
      html: '<iframe srcdoc="<script>alert(8)</script>"></iframe>',
      mustNotInclude: ['srcdoc', 'alert(8)'],
    },
    {
      name: 'meta refresh',
      html: '<meta http-equiv="refresh" content="0;url=https://evil.com">',
      mustNotInclude: ['<meta'],
    },
    {
      name: 'base href hijack',
      html: '<base href="https://evil.com/">',
      mustNotInclude: ['<base'],
    },
    {
      name: 'form action javascript',
      html: '<form action="javascript:alert(9)"><input></form>',
      mustNotInclude: ['javascript:', 'alert(9)', 'formaction'],
    },
    {
      name: 'svg use xlink:href javascript',
      html: '<svg><use xlink:href="javascript:alert(10)"/></svg>',
      mustNotInclude: ['javascript:', 'alert(10)'],
    },
    {
      name: 'vbscript scheme',
      html: '<a href="vbscript:msgbox(11)">click</a>',
      mustNotInclude: ['vbscript:', 'msgbox(11)'],
    },
  ];

  for (const { name, html, mustNotInclude } of xssPayloads) {
    it(`strips: ${name}`, () => {
      const out = sanitiseHtml(html);
      for (const danger of mustNotInclude) {
        expect(out.toLowerCase()).not.toContain(danger.toLowerCase());
      }
    });
  }

  it('preserves benign formatting', () => {
    const html = '<p><strong>Hello</strong> <em>world</em></p><ul><li>one</li><li>two</li></ul>';
    const out = sanitiseHtml(html);
    expect(out).toContain('<strong>Hello</strong>');
    expect(out).toContain('<em>world</em>');
    expect(out).toContain('<li>one</li>');
  });

  it('preserves http(s) and mailto links', () => {
    const html = '<a href="https://example.com">x</a><a href="mailto:a@b.c">m</a>';
    const out = sanitiseHtml(html);
    expect(out).toContain('https://example.com');
    expect(out).toContain('mailto:a@b.c');
  });

  it('preserves cid: links (inline images)', () => {
    const html = '<img src="cid:abc123@msg" alt="x">';
    const out = sanitiseHtml(html);
    expect(out).toContain('cid:abc123@msg');
  });

  it('returns empty string for empty input', () => {
    expect(sanitiseHtml('')).toBe('');
  });
});

describe('stripImages', () => {
  it('replaces img tags with neutral spans', () => {
    const out = stripImages('<p>before</p><img src="https://tracker.com/pixel.gif"><p>after</p>');
    expect(out).not.toContain('<img');
    expect(out).toContain('data-claw="image-blocked"');
    expect(out).toContain('<p>before</p>');
    expect(out).toContain('<p>after</p>');
  });

  it('handles multiple img tags', () => {
    const out = stripImages('<img src="a"><img src="b"><img src="c">');
    expect(out.match(/data-claw="image-blocked"/g)).toHaveLength(3);
  });

  it('case-insensitive img match', () => {
    const out = stripImages('<IMG src="x">');
    expect(out).not.toContain('<IMG');
    expect(out).toContain('data-claw="image-blocked"');
  });
});
