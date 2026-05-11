import { Injectable, Logger } from '@nestjs/common';
import { RiskLevel } from '../../../common/enums';
import { DomainTag, ModalityKind, WorkflowKind } from '../../../generated/prisma';
import {
  CODE_REVIEW_REGEX,
  COMPARE_INTENT_REGEX,
  RESEARCH_INTENT_REGEX,
} from '../constants/workflow-detection.constants';
import { type WorkflowDecision, type WorkflowSelectorInput } from '../types/workflows.types';

@Injectable()
export class WorkflowSelectorManager {
  private readonly logger = new Logger(WorkflowSelectorManager.name);

  select(input: WorkflowSelectorInput): WorkflowDecision {
    this.logger.debug(`select domain=${input.domain} risk=${input.riskLevel}`);
    const reasonTags: string[] = [];

    if (input.modalityIn.includes(ModalityKind.PDF_INPUT)) {
      reasonTags.push('pdf_input');
      return this.decide(WorkflowKind.PDF_EXTRACTION, reasonTags, {
        judge: input.riskLevel === RiskLevel.HIGH,
      });
    }
    if (input.modalityIn.includes(ModalityKind.YOUTUBE_INPUT)) {
      reasonTags.push('youtube_input');
      return this.decide(WorkflowKind.YOUTUBE_TRANSCRIPT, reasonTags);
    }
    if (input.modalityIn.includes(ModalityKind.AUDIO_INPUT)) {
      reasonTags.push('audio_input');
      return this.decide(WorkflowKind.AUDIO_TRANSCRIBE, reasonTags);
    }
    if (input.modalityIn.includes(ModalityKind.VIDEO_INPUT)) {
      reasonTags.push('video_input');
      return this.decide(WorkflowKind.VIDEO_ANALYSIS, reasonTags);
    }
    if (input.modalityIn.includes(ModalityKind.IMAGE_INPUT)) {
      reasonTags.push('image_input');
      return this.decide(WorkflowKind.IMAGE_ANALYSIS, reasonTags);
    }
    if (input.modalityIn.includes(ModalityKind.SPREADSHEET_INPUT)) {
      reasonTags.push('spreadsheet_input');
      return this.decide(WorkflowKind.EXTRACT_FIRST, reasonTags);
    }

    if (input.modalityOut.includes(ModalityKind.IMAGE_OUTPUT)) {
      reasonTags.push('image_generation_intent');
      return this.decide(WorkflowKind.IMAGE_GENERATION, reasonTags);
    }
    if (input.modalityOut.includes(ModalityKind.STRUCTURED_OUTPUT)) {
      reasonTags.push('structured_output_intent');
      return this.decide(WorkflowKind.FILE_GENERATION, reasonTags);
    }

    if (COMPARE_INTENT_REGEX.test(input.messageContent)) {
      reasonTags.push('compare_intent');
      return this.decide(WorkflowKind.COMPARE_ENSEMBLE, reasonTags, {
        compare: true,
      });
    }
    if (CODE_REVIEW_REGEX.test(input.messageContent) && input.domain === DomainTag.CODING) {
      reasonTags.push('code_review_intent');
      return this.decide(WorkflowKind.CODE_REVIEW, reasonTags, {
        judge: input.riskLevel !== RiskLevel.LOW,
      });
    }
    if (RESEARCH_INTENT_REGEX.test(input.messageContent)) {
      reasonTags.push('research_intent');
      return this.decide(WorkflowKind.SEARCH_FIRST, reasonTags, { search: true });
    }

    if (
      (input.riskLevel === RiskLevel.HIGH || input.riskLevel === RiskLevel.CRITICAL) &&
      this.isJudgeWorthyDomain(input.domain)
    ) {
      reasonTags.push('high_risk_domain_judge');
      return this.decide(WorkflowKind.JUDGE_PIPELINE, reasonTags, { judge: true });
    }

    return this.decide(WorkflowKind.DIRECT_LLM, ['default_direct']);
  }

  private decide(
    workflowKind: WorkflowKind,
    reasonTags: string[],
    flags: { judge?: boolean; search?: boolean; compare?: boolean } = {},
  ): WorkflowDecision {
    return {
      workflowKind,
      judgeRecommended:
        flags.judge ??
        (workflowKind === WorkflowKind.JUDGE_PIPELINE || workflowKind === WorkflowKind.CODE_REVIEW),
      searchRecommended: flags.search ?? workflowKind === WorkflowKind.SEARCH_FIRST,
      compareRecommended: flags.compare ?? workflowKind === WorkflowKind.COMPARE_ENSEMBLE,
      reasonTags,
    };
  }

  private isJudgeWorthyDomain(domain: DomainTag): boolean {
    return (
      domain === DomainTag.MEDICAL ||
      domain === DomainTag.LEGAL ||
      domain === DomainTag.FINANCE ||
      domain === DomainTag.MENTAL_HEALTH
    );
  }
}
