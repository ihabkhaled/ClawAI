import {
  crawlDelayFor,
  isPathAllowed,
  parseRobotsTxt,
  robotsRuleMatches,
} from '../robots-txt.utility';

describe('robotsRuleMatches (RFC 9309 §2.2.3)', () => {
  it.each([
    ['/fish', '/fish', true],
    ['/fish.html', '/fish', true],
    ['/Fish.asp', '/fish', false],
    ['/filename.php', '/*.php', true],
    ['/folder/filename.php?parameters', '/*.php', true],
    ['/filename.php', '/*.php$', true],
    ['/filename.php?parameters', '/*.php$', false],
    ['/fish.php', '/fish*.php', true],
    ['/fishheads/catfish.php?p', '/fish*.php', true],
    ['/Fish.PHP', '/fish*.php', false],
    ['/gigs/abc/share/', '*/share/', true],
    ['/gigs/abc', '*/share/', false],
    ['/exact', '/exact$', true],
    ['/exact/more', '/exact$', false],
    ['/anything', '', false],
  ])('%s vs %s → %s', (path, rule, expected) => {
    expect(robotsRuleMatches(path, rule)).toBe(expected);
  });
});

describe('isPathAllowed with wildcard rules', () => {
  const robots = parseRobotsTxt(
    [
      'User-agent: *',
      'Disallow: */share/',
      'Disallow: /search/',
      'Allow: /search/about$',
      'Crawl-delay: 3',
    ].join('\n'),
  );

  it('blocks a path matched only by a wildcard rule (used to fail open)', () => {
    expect(isPathAllowed(robots, 'ClawAI-ResearchBot', '/gigs/x/share/')).toBe(false);
  });

  it('keeps the longest-match-wins tiebreak with anchored rules', () => {
    expect(isPathAllowed(robots, 'ClawAI-ResearchBot', '/search/about')).toBe(true);
    expect(isPathAllowed(robots, 'ClawAI-ResearchBot', '/search/about/more')).toBe(false);
  });

  it('reads the crawl delay of the matching group', () => {
    expect(crawlDelayFor(robots, 'ClawAI-ResearchBot')).toBe(3);
    expect(crawlDelayFor(parseRobotsTxt(''), 'ClawAI-ResearchBot')).toBeNull();
  });
});
