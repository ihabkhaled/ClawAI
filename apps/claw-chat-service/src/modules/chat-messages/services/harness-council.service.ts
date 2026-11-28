import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  HARNESS_COUNCIL_CANDIDATES_PATH,
  HARNESS_COUNCIL_MIN_OUTPUT_TOKENS,
  HARNESS_COUNCIL_SYSTEM_PROMPT,
} from '../../../common/constants/harness-council.constants';
import {
  RESEARCH_GATE_CANDIDATES_TIMEOUT_MS,
  RESEARCH_GATE_CANDIDATES_TTL_MS,
} from '../../../common/constants/research-gate.constants';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import type {
  HarnessCouncilGenerate,
  HarnessCouncilVerdict,
  HarnessCouncilVote,
} from '../types/harness-council.types';
import type { ResearchGateCandidate } from '../types/research-gate.types';
import {
  buildCouncilPrompt,
  isCouncilDecided,
  mergeCouncilVotes,
  parseCouncilVote,
} from '../utilities/harness-council.utility';

/**
 * The harness council (research engine, 2026-11-27): the admin's `HARNESS_COUNCIL` models are asked IN PARALLEL
 * whether a turn needs research, how deep, in which languages and with which sub-questions.
 *
 * - **Decides early.** As soon as one side holds a strict majority of the members asked, the verdict is taken from
 *   the votes in hand; the slower members cannot change it, so the turn does not wait for them.
 * - **Never throws.** No member configured, routing unreachable, or no usable answer returns null, and the research
 *   gate falls back to its single-model chain (RESEARCH_GATE). Each member's own timeout bounds the wait.
 * - **Borrows the gate's model call** (`generate`), so credentials, hosts, thinking-off and JSON mode stay in one place.
 */
@Injectable()
export class HarnessCouncilService {
  private readonly logger = new Logger(HarnessCouncilService.name);

  private members: readonly ResearchGateCandidate[] | null = null;
  private membersExpireAt = 0;

  async decide(
    message: string,
    generate: HarnessCouncilGenerate,
    conversation = '',
  ): Promise<HarnessCouncilVerdict | null> {
    const members = await this.resolveMembers();
    if (members.length === 0) {
      return null;
    }
    const startedAt = Date.now();
    const prompt = buildCouncilPrompt(HARNESS_COUNCIL_SYSTEM_PROMPT, message, conversation);
    const verdict = await this.collect(members, (member) =>
      generate(member, prompt, HARNESS_COUNCIL_MIN_OUTPUT_TOKENS),
    );
    if (verdict === null) {
      this.logger.warn(`council: no member answered (asked ${String(members.length)})`);
      return null;
    }
    this.logger.log(
      `council: needsWeb=${String(verdict.needsWeb)} depth=${String(verdict.depth)} answered=${String(verdict.answered)}/${String(verdict.asked)} majority=[${verdict.majority.join(',')}] languages=[${verdict.languages.join(',')}] platforms=[${verdict.platforms.join(',')}] lookup=${String(verdict.exactText !== null)} subQuestions=${String(verdict.subQuestions.length)} ms=${String(Date.now() - startedAt)}`,
    );
    return verdict;
  }

  /** Runs every member at once and resolves at the first unassailable majority, or when all have settled. */
  private async collect(
    members: readonly ResearchGateCandidate[],
    ask: (member: ResearchGateCandidate) => Promise<string | null>,
  ): Promise<HarnessCouncilVerdict | null> {
    const votes: HarnessCouncilVote[] = [];
    let settled = 0;
    return new Promise<HarnessCouncilVerdict | null>((resolve) => {
      let done = false;
      const finish = (): void => {
        if (!done) {
          done = true;
          resolve(mergeCouncilVotes(votes, members.length));
        }
      };
      const onSettled = (vote: HarnessCouncilVote | null): void => {
        settled += 1;
        if (vote !== null && !done) {
          votes.push(vote);
        }
        if (isCouncilDecided(votes, members.length) || settled === members.length) {
          finish();
        }
      };
      for (const member of members) {
        void ask(member)
          .then((raw) => (raw === null ? null : parseCouncilVote(member.modelAlias, raw)))
          .catch(() => null)
          .then(onSettled);
      }
    });
  }

  /** The configured members, cached like the gate's candidates; the last known list survives a routing blip. */
  private async resolveMembers(): Promise<readonly ResearchGateCandidate[]> {
    if (this.members !== null && this.membersExpireAt > Date.now()) {
      return this.members;
    }
    try {
      const response = await httpRequest<readonly ResearchGateCandidate[]>({
        url: `${AppConfig.get().ROUTING_SERVICE_URL}${HARNESS_COUNCIL_CANDIDATES_PATH}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: RESEARCH_GATE_CANDIDATES_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`resolveMembers: routing-service returned ${String(response.status)}`);
        return this.members ?? [];
      }
      this.members = response.data;
      this.membersExpireAt = Date.now() + RESEARCH_GATE_CANDIDATES_TTL_MS;
      return this.members;
    } catch (error) {
      this.logger.warn(`resolveMembers: ${(error as Error).message}`);
      return this.members ?? [];
    }
  }
}
