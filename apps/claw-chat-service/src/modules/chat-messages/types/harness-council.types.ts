import type { ResearchPlatformCategory } from '../../../common/enums/research-platform-category.enum';
import type { ResearchGateCandidate } from './research-gate.types';

/** One council member's parsed answer. */
export type HarnessCouncilVote = {
  modelAlias: string;
  needsWeb: boolean;
  /** 0-5; 0 when no research. */
  depth: number;
  languages: string[];
  subQuestions: string[];
  /** Source kinds worth searching. */
  platforms: ResearchPlatformCategory[];
  /** The exact words a text lookup searches verbatim (lyrics, a quote, an error), or null. */
  exactText: string | null;
  reason: string;
};

/** The merged council decision for one message. */
export type HarnessCouncilVerdict = {
  needsWeb: boolean;
  depth: number;
  languages: string[];
  subQuestions: string[];
  platforms: ResearchPlatformCategory[];
  exactText: string | null;
  /** How many members answered with a usable vote, and how many were asked. */
  answered: number;
  asked: number;
  /** Members on the winning side. */
  majority: string[];
  votes: HarnessCouncilVote[];
};

/** How the council reaches a member: the research gate lends its own model call. */
export type HarnessCouncilGenerate = (
  candidate: ResearchGateCandidate,
  prompt: string,
  minOutputTokens: number,
) => Promise<string | null>;
