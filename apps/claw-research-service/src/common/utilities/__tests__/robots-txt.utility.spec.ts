import { isPathAllowed, parseRobotsTxt } from '../robots-txt.utility';

describe('parseRobotsTxt', () => {
  it('parses a simple wildcard group with allow, disallow and crawl-delay', () => {
    const result = parseRobotsTxt(`
      User-agent: *
      Disallow: /admin/
      Allow: /admin/public/
      Crawl-delay: 2
    `);

    expect(result.groups).toEqual([
      {
        userAgents: ['*'],
        allow: ['/admin/public/'],
        disallow: ['/admin/'],
        crawlDelaySeconds: 2,
      },
    ]);
  });

  it('collects Sitemap directives regardless of where they appear', () => {
    const result = parseRobotsTxt(`
      Sitemap: https://example.com/sitemap.xml
      User-agent: *
      Disallow: /private/
      Sitemap: https://example.com/sitemap-news.xml
    `);

    expect(result.sitemaps).toEqual([
      'https://example.com/sitemap.xml',
      'https://example.com/sitemap-news.xml',
    ]);
  });

  it('groups consecutive User-agent lines so they share the same rules', () => {
    const result = parseRobotsTxt(`
      User-agent: Googlebot
      User-agent: Bingbot
      Disallow: /no-bots/
    `);

    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]?.disallow).toEqual(['/no-bots/']);
    expect(result.groups[1]?.disallow).toEqual(['/no-bots/']);
  });

  it('starts a NEW group when User-agent appears again after a rule', () => {
    const result = parseRobotsTxt(`
      User-agent: Googlebot
      Disallow: /a/
      User-agent: Bingbot
      Disallow: /b/
    `);

    expect(result.groups).toHaveLength(2);
    const googlebot = result.groups.find((g) => g.userAgents.includes('googlebot'));
    const bingbot = result.groups.find((g) => g.userAgents.includes('bingbot'));
    expect(googlebot?.disallow).toEqual(['/a/']);
    expect(bingbot?.disallow).toEqual(['/b/']);
  });

  it('ignores comments and blank lines', () => {
    const result = parseRobotsTxt(`
      # this is the default group
      User-agent: *
      Disallow: /secret/ # inline comment

      # end
    `);

    expect(result.groups[0]?.disallow).toEqual(['/secret/']);
  });

  it('lowercases user-agent names for matching, case-insensitively', () => {
    const result = parseRobotsTxt('User-agent: GoogleBot\nDisallow: /x/');
    expect(result.groups[0]?.userAgents).toEqual(['googlebot']);
  });
});

describe('isPathAllowed', () => {
  it('allows everything when there is no matching group at all', () => {
    const result = parseRobotsTxt('User-agent: SomeOtherBot\nDisallow: /x/');
    expect(isPathAllowed(result, 'ClawAI-ResearchBot', '/x/')).toBe(true);
  });

  it('falls back to the wildcard group when no exact agent match exists', () => {
    const result = parseRobotsTxt('User-agent: *\nDisallow: /admin/');
    expect(isPathAllowed(result, 'ClawAI-ResearchBot', '/admin/page')).toBe(false);
    expect(isPathAllowed(result, 'ClawAI-ResearchBot', '/public/page')).toBe(true);
  });

  it('prefers an exact agent match over the wildcard group', () => {
    const result = parseRobotsTxt(`
      User-agent: *
      Disallow: /

      User-agent: ClawAI-ResearchBot
      Disallow:
    `);

    // The wildcard group blocks everything; the exact-match group for our
    // own agent has an empty Disallow, meaning nothing is restricted for it.
    expect(isPathAllowed(result, 'ClawAI-ResearchBot', '/anything')).toBe(true);
    expect(isPathAllowed(result, 'SomeUnknownBot', '/anything')).toBe(false);
  });

  it('the longest matching rule wins, regardless of allow/disallow order', () => {
    const result = parseRobotsTxt(`
      User-agent: *
      Disallow: /docs/
      Allow: /docs/public/
    `);

    expect(isPathAllowed(result, 'bot', '/docs/private/page')).toBe(false);
    expect(isPathAllowed(result, 'bot', '/docs/public/page')).toBe(true);
  });

  it('an exact-length tie between allow and disallow is won by allow', () => {
    const tie = parseRobotsTxt(`
      User-agent: *
      Disallow: /path
      Allow: /path
    `);
    expect(isPathAllowed(tie, 'bot', '/path/page')).toBe(true);
  });
});
