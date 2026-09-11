/** One `User-agent:` group and the rules that apply to it. */
export type RobotsTxtGroup = {
  userAgents: string[];
  allow: string[];
  disallow: string[];
  crawlDelaySeconds: number | null;
};

export type RobotsTxtResult = {
  groups: RobotsTxtGroup[];
  /** `Sitemap:` directives, in file order. Not tied to any group. */
  sitemaps: string[];
};
