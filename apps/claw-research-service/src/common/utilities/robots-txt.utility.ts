import type { RobotsTxtGroup, RobotsTxtResult } from '../types/robots-txt.types';

const WILDCARD_AGENT = '*';

/**
 * A conservative `robots.txt` parser: the standard directives
 * (User-agent/Allow/Disallow/Crawl-delay/Sitemap), no wildcard (`*`, `$`)
 * matching inside paths beyond simple prefix matching. Good enough to decide
 * "is this path off-limits" and "where are the sitemaps" without pulling in
 * a dependency for a format this small and this line-oriented.
 *
 * Grouping follows the real spec, not a per-line reading of it: consecutive
 * `User-agent:` lines share the rules that follow them, and a `User-agent:`
 * line seen AFTER a rule starts a brand new group. Two robots.txt files with
 * identical rules but different consecutive-vs-repeated User-agent layout
 * are supposed to mean the same thing, and this parser treats them the same.
 */
export function parseRobotsTxt(text: string): RobotsTxtResult {
  const groups: RobotsTxtGroup[] = [];
  const sitemaps: string[] = [];
  let currentGroups: RobotsTxtGroup[] = [];
  let groupIsOpenForMoreAgents = true;

  for (const rawLine of text.split(/\r\n|\r|\n/u)) {
    const line = stripComment(rawLine).trim();
    if (line.length === 0) {
      continue;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }
    const directive = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    switch (directive) {
      case 'user-agent': {
        if (!groupIsOpenForMoreAgents) {
          currentGroups = [];
        }
        const agent = value.toLowerCase();
        let group = currentGroups.find((candidate) => candidate.userAgents.includes(agent));
        if (group === undefined) {
          group = { userAgents: [agent], allow: [], disallow: [], crawlDelaySeconds: null };
          groups.push(group);
          currentGroups.push(group);
        }
        groupIsOpenForMoreAgents = true;
        break;
      }
      case 'disallow':
        if (value.length > 0) {
          applyToCurrentGroups(currentGroups, (group) => group.disallow.push(value));
        }
        groupIsOpenForMoreAgents = false;
        break;
      case 'allow':
        if (value.length > 0) {
          applyToCurrentGroups(currentGroups, (group) => group.allow.push(value));
        }
        groupIsOpenForMoreAgents = false;
        break;
      case 'crawl-delay': {
        const seconds = Number.parseFloat(value);
        if (Number.isFinite(seconds) && seconds >= 0) {
          applyToCurrentGroups(currentGroups, (group) => {
            group.crawlDelaySeconds = seconds;
          });
        }
        groupIsOpenForMoreAgents = false;
        break;
      }
      case 'sitemap':
        // Global: applies to the whole file regardless of which group is
        // currently open, and can legally appear anywhere in the file.
        if (value.length > 0) {
          sitemaps.push(value);
        }
        break;
      default:
        break;
    }
  }

  return { groups, sitemaps };
}

/**
 * Whether `path` may be fetched by `userAgent`, per the most specific
 * matching group (an exact agent match beats the `*` wildcard group) and the
 * longest-matching-rule-wins tiebreak, with Allow winning an exact-length
 * tie against Disallow — the same tiebreak every major crawler documents.
 *
 * No group at all, or a group with no rules, means "everything is allowed":
 * `robots.txt` is opt-out, not opt-in.
 */
export function isPathAllowed(result: RobotsTxtResult, userAgent: string, path: string): boolean {
  const agent = userAgent.toLowerCase();
  const group =
    result.groups.find((candidate) => candidate.userAgents.includes(agent)) ??
    result.groups.find((candidate) => candidate.userAgents.includes(WILDCARD_AGENT));
  if (group === undefined) {
    return true;
  }

  let bestLength = -1;
  let bestIsAllow = true;
  for (const rule of group.disallow) {
    if (path.startsWith(rule) && rule.length > bestLength) {
      bestLength = rule.length;
      bestIsAllow = false;
    }
  }
  for (const rule of group.allow) {
    if (path.startsWith(rule) && rule.length >= bestLength) {
      bestLength = rule.length;
      bestIsAllow = true;
    }
  }
  return bestLength === -1 || bestIsAllow;
}

function applyToCurrentGroups(
  groups: RobotsTxtGroup[],
  apply: (group: RobotsTxtGroup) => void,
): void {
  for (const group of groups) {
    apply(group);
  }
}

function stripComment(line: string): string {
  const hashIndex = line.indexOf('#');
  return hashIndex === -1 ? line : line.slice(0, hashIndex);
}
