import { detectUrlsInText } from '@claw/shared-utilities';

import {
  RESEARCH_PLANNER_DEFAULT_MAX_PAGES,
  RESEARCH_PLANNER_MAX_PAGES,
} from '../../../common/constants/research-gate.constants';
import { PlannedResearchAction } from '../../../common/enums/planned-research-action.enum';
import {
  PLANNER_NARRATION_MAX_CHARS,
  PLANNER_QUERY_MAX_CHARS,
} from '../constants/research-plan.constants';
import type { CrawlFollowUp, ResearchPlan } from '../types/research-gate.types';

const ACTIONS = new Set<string>(Object.values(PlannedResearchAction));

/**
 * Reads the planner's reply into a plan, or null when it is unusable.
 *
 * Null — never a default — so the caller moves on to the NEXT configured model.
 * The old gate turned a malformed reply into "no web", which ended the fallback
 * walk on the first bad answer and made the list of fallback models decorative.
 *
 * Two things are enforced here rather than trusted to the model:
 * - Every URL the user wrote is kept and must be opened (rule 41: a link is
 *   opened, never merely searched for). A model that answers "search" for
 *   "summarise example.com" is overruled to crawl-then-search.
 * - Any URL the model adds must be a real web URL; `javascript:` and friends
 *   are dropped, because these are about to be fetched by the server.
 */
export function parseResearchPlan(raw: string, userUrls: readonly string[]): ResearchPlan | null {
  const parsed = extractJsonObject(raw);
  if (parsed === null || typeof parsed['action'] !== 'string' || !ACTIONS.has(parsed['action'])) {
    return null;
  }
  let action = parsed['action'] as PlannedResearchAction;
  const urls = mergeUrls(userUrls, parsed['urls']);

  if (
    userUrls.length > 0 &&
    (action === PlannedResearchAction.ANSWER || action === PlannedResearchAction.SEARCH)
  ) {
    action = PlannedResearchAction.CRAWL_THEN_SEARCH;
  }
  if (
    urls.length === 0 &&
    (action === PlannedResearchAction.CRAWL || action === PlannedResearchAction.CRAWL_THEN_SEARCH)
  ) {
    action = PlannedResearchAction.SEARCH;
  }

  return {
    action,
    urls:
      action === PlannedResearchAction.SEARCH || action === PlannedResearchAction.ANSWER
        ? []
        : urls,
    query: readQuery(parsed['query']),
    maxPages: readMaxPages(parsed['maxPages']),
    narration: readNarration(parsed['narration']),
    decidedBy: null,
  };
}

/** Reads the post-crawl re-plan, or null when it is unusable. */
export function parseCrawlFollowUp(raw: string): CrawlFollowUp | null {
  const parsed = extractJsonObject(raw);
  if (parsed === null || typeof parsed['needsSearch'] !== 'boolean') {
    return null;
  }
  return {
    needsSearch: parsed['needsSearch'],
    query: readQuery(parsed['query']),
    narration: readNarration(parsed['narration']),
  };
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/u);
  if (match === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(match[0]);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function mergeUrls(userUrls: readonly string[], modelUrls: unknown): string[] {
  const merged = [...userUrls];
  if (Array.isArray(modelUrls)) {
    for (const value of modelUrls) {
      if (typeof value !== 'string') {
        continue;
      }
      // Re-detected, not trusted: the same detector that reads user text, so a
      // model-written URL passes exactly the checks a user-written one does.
      for (const url of detectUrlsInText(value, { max: 1 })) {
        if (!merged.includes(url)) {
          merged.push(url);
        }
      }
    }
  }
  return merged;
}

function readQuery(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length < 2 ? null : trimmed.slice(0, PLANNER_QUERY_MAX_CHARS);
}

function readMaxPages(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    return RESEARCH_PLANNER_DEFAULT_MAX_PAGES;
  }
  return Math.min(Math.floor(value), RESEARCH_PLANNER_MAX_PAGES);
}

function readNarration(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, PLANNER_NARRATION_MAX_CHARS) : '';
}
