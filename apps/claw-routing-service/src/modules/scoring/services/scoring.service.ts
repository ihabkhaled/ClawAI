import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../../../common/errors';
import { RouterModelRegistryRepository } from '../../router-models/repositories/router-model-registry.repository';
import { ScoringEngineManager } from '../managers/scoring-engine.manager';
import { DEFAULT_POLICY_WEIGHTS } from '../constants/scoring.constants';
import { type ScoreRequestDto } from '../dto/score.dto';
import {
  type ScoringCandidate,
  type ScoringInput,
  type ScoringOutput,
} from '../types/scoring.types';

@Injectable()
export class ScoringService {
  constructor(
    private readonly registryRepo: RouterModelRegistryRepository,
    private readonly engine: ScoringEngineManager,
  ) {}

  async score(dto: ScoreRequestDto): Promise<ScoringOutput> {
    const candidates = await this.loadCandidates(dto.profileIds);
    const weights = dto.policy.weights ?? DEFAULT_POLICY_WEIGHTS[dto.policy.routingMode];
    const input: ScoringInput = {
      classification: dto.classification,
      policy: {
        policyId: dto.policy.policyId,
        weights,
      },
      candidates,
    };
    return this.engine.score(input);
  }

  private async loadCandidates(profileIds: string[]): Promise<ScoringCandidate[]> {
    const out: ScoringCandidate[] = [];
    for (const id of profileIds) {
      const profile = await this.registryRepo.findById(id);
      if (profile === null) {
        throw new BusinessException(
          `RouterModelProfile id=${id} not found`,
          'PROFILE_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }
      out.push({
        profile,
        health: { isHealthy: true, circuitOpen: false, successRateLast24h: null },
        learnedSuccessRate: null,
        judgeTrust: null,
        fallbackReliability: null,
      });
    }
    return out;
  }
}
